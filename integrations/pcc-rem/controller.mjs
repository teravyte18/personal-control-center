import { createHash, randomUUID } from 'node:crypto';
import { admitText } from './input-policy.mjs';
export class AdapterError extends Error { constructor(code) { super(code); this.code = code; } }
export const RETRY_MS = 24 * 60 * 60 * 1000;
const NEW_ID_MS = 5 * 60 * 1000;
const HISTORY_RECOVERY_DELAYS = [250,1000,5000];
const WATCHDOG_DELAYS = [30000,60000,120000];
const TERMINAL_CHAT_STATES = new Set(['final','error','aborted']);
const RECOVERY_HISTORY = Object.freeze({limit:200,maxBytes:524288,maxChars:8000});
const fail = code => { throw new AdapterError(code); };
const hash = value => createHash('sha256').update(value).digest('base64url');
const bounded = value => { if (Buffer.byteLength(JSON.stringify(value)) > 131072) fail('not_available'); return value; };
function safeText(value) {
  if (typeof value !== 'string') return '';
  // Display hygiene is not a semantic secret detector. Unsupported/context blocks are dropped separately.
  return [...value].slice(0,8000).join('').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'')
    .replace(/(?:file:\/\/|\/(?:home|opt|etc|root|var|run|tmp)\/)[^\s<>"']+/g,'[private path]')
    .replace(/\b(?:Bearer\s+\S+|(?:sk-|ghp_|gho_)[A-Za-z0-9_-]{16,})/gi,'[credential]');
}
function project(raw, namespace) {
  if (!raw || !['user','assistant'].includes(raw.role)) return null;
  const id = raw.__openclaw?.id;
  if (typeof id !== 'string' || !id || id.length > 1024) return null;
  // Do not render context/reasoning/tool/injected entries or provider diagnostics.
  if (raw.isError || (raw.role==='assistant' && raw.stopReason==='error') || raw.__openclaw?.internal || raw.__openclaw?.source === 'injected') return null;
  const text = safeText(typeof raw.content === 'string' ? raw.content : Array.isArray(raw.content) ? raw.content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : '');
  if (!text || /<\/?(?:tool_call|function_call|system|analysis)\b|<\|(?:im_start|system|assistant)/i.test(text)) return null;
  return { id:hash(`${namespace}:${id}`),role:raw.role,text,status:'complete' };
}
/** Only this class constructs RPC arguments. The browser never supplies routing or RPC names. */
export class RemController {
  constructor({ rpc, binding, ledger, saveLedger, clockFloor=0, recoveryDelays=HISTORY_RECOVERY_DELAYS, watchdogDelays=WATCHDOG_DELAYS }) {
    const dedicatedKey = typeof binding?.agentId === 'string' && typeof binding?.sessionKey === 'string' && binding.sessionKey.slice(`agent:${binding.agentId}:`.length);
    if (!binding || !/^[a-zA-Z0-9_-]{16,128}$/.test(binding.id) || !/^[a-zA-Z0-9_-]{1,256}$/.test(binding.agentId) || !binding.sessionKey.startsWith(`agent:${binding.agentId}:`) || !/^[a-zA-Z0-9_-]{1,256}$/.test(dedicatedKey) || /^(?:main|global|subagent|cron|acp)$/i.test(dedicatedKey)) throw new AdapterError('not_available');
    if(!Number.isSafeInteger(clockFloor)||clockFloor<0)fail('not_available');this.clockFloor=clockFloor;
    this.rpc=rpc; this.binding=binding; this.ledger=ledger ?? []; this.saveLedger=saveLedger;
    if (!Array.isArray(this.ledger) || this.ledger.length > 2048) fail('not_available');
    const identities=new Set();
    for(const row of this.ledger) {
      if(!row || typeof row!=='object' || Object.keys(row).some(k=>!['submissionId','digest','runId','handle','sessionId','state','custody','createdAt','messageId'].includes(k)) || typeof row.submissionId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.submissionId) || !/^[A-Za-z0-9_-]{43}$/.test(row.digest??'') || row.runId!==`pcc-${hash(`${binding.id}:${row.submissionId}`)}` || typeof row.handle!=='string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(row.handle) || typeof row.sessionId!=='string' || !row.sessionId || row.sessionId.length>256 || !['prepared','unknown','accepted','stopping','finished'].includes(row.state) || !['accepted','committed'].includes(row.custody) || !Number.isSafeInteger(row.createdAt) || (row.messageId!==undefined && (typeof row.messageId!=='string'||row.messageId.length>1024)) || identities.has(row.submissionId))fail('not_available');
      identities.add(row.submissionId);
    }
    if (!Array.isArray(recoveryDelays) || !recoveryDelays.length || recoveryDelays.length>8 || recoveryDelays.some(delay=>!Number.isSafeInteger(delay)||delay<0||delay>60000)) fail('not_available');
    if (!Array.isArray(watchdogDelays) || !watchdogDelays.length || watchdogDelays.length>3 || watchdogDelays.some(delay=>!Number.isSafeInteger(delay)||delay<0||delay>120000)) fail('not_available');
    this.state='connecting'; this.messages=[]; this.revision=randomUUID(); this.generation=0; this.cursor=null; this.sessionId=null; this.leaf=undefined; this.chain=Promise.resolve(); this.recent=[];
    this.recoveryDelays=recoveryDelays; this.recoveryAttempts=0; this.recoveryTimer=null; this.recoveryRunning=false; this.recoveryEpoch=0;
    this.watchdogDelays=watchdogDelays; this.watchdogAttempts=0; this.watchdogTimer=null; this.watchdogRunning=false; this.subscribed=false;
    this.lifecycle={stage:'idle',reason:'none'}; this.cursorRejected=false; this.persistenceFault=false;
  }
  serial(fn) { const task=this.chain.then(fn); this.chain=task.catch(()=>{}); return task; }
  address() { return { sessionKey:this.binding.sessionKey,agentId:this.binding.agentId }; }
  disconnect() { this.generation++; this.recoveryEpoch++; this.subscribed=false; this.clearRecovery(); this.clearWatchdog(); this.state='reconnecting'; this.revision=randomUUID(); }
  clearRecovery() {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.recoveryTimer=null; this.recoveryAttempts=0;
  }
  clearWatchdog() {
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer=null; this.watchdogAttempts=0;
  }
  scheduleWatchdog() {
    if (!this.subscribed || !this.outstanding().length || this.watchdogTimer || this.watchdogRunning || this.recoveryTimer || this.recoveryRunning || this.watchdogAttempts>=this.watchdogDelays.length) return;
    const delay=this.watchdogDelays[this.watchdogAttempts++], epoch=this.recoveryEpoch;
    this.watchdogTimer=setTimeout(()=> {
      this.watchdogTimer=null;
      if (epoch!==this.recoveryEpoch || !this.subscribed || !this.outstanding().length) return;
      this.watchdogRunning=true;
      this.requestRecovery();
      this.watchdogRunning=false;
    },delay);
    this.watchdogTimer.unref?.();
  }
  scheduleRecovery({immediate=false}={}) {
    // Terminal/watchdog hints get one serialized authoritative read. They are
    // deliberately not an extension of the bounded fast-retry loop.
    if (this.recoveryTimer || this.recoveryRunning || (!immediate && this.recoveryAttempts>=this.recoveryDelays.length)) return;
    const delay=immediate ? 0 : this.recoveryDelays[this.recoveryAttempts++], epoch=this.recoveryEpoch;
    this.state='reconnecting'; this.revision=randomUUID();
    this.recoveryTimer=setTimeout(()=> {
      this.recoveryTimer=null; this.recoveryRunning=true;
      if (epoch!==this.recoveryEpoch) { this.recoveryRunning=false; return; }
      void this.connect({recoveryEpoch:epoch}).then(()=> { this.recoveryRunning=false; this.clearRecovery(); this.scheduleWatchdog(); },_error=> { this.recoveryRunning=false; if (epoch===this.recoveryEpoch) this.scheduleRecovery(); });
    },delay);
    this.recoveryTimer.unref?.();
  }
  requestRecovery({event=false}={}) {
    // Events and watchdogs are wake-up hints only. They never settle ledger custody.
    if (!this.outstanding().length || (!this.subscribed && !event)) return;
    this.scheduleRecovery({immediate:true});
  }
  onGatewayEvent(event) {
    const payload=event?.payload;
    if (!event || event.event!=='chat' || !payload || typeof payload!=='object' || !TERMINAL_CHAT_STATES.has(payload.state) || payload.sessionKey!==this.binding.sessionKey || payload.agentId!==this.binding.agentId || typeof payload.runId!=='string') return;
    const row=this.ledger.find(candidate=>candidate.state!=='finished' && candidate.runId===payload.runId && candidate.sessionId===this.sessionId);
    if (!row || !this.subscribed) return;
    this.requestRecovery({event:true});
  }
  async connect({recoveryEpoch}={}) { return this.serial(async()=> {
    if (recoveryEpoch!==undefined && recoveryEpoch!==this.recoveryEpoch) throw new AdapterError('history_recovery_cancelled');
    const generation=++this.generation; this.state='connecting'; this.lifecycle={stage:'subscribe',reason:'started'}; this.cursorRejected=false;
    try {
      let ack;try { ack=await this.rpc('sessions.messages.subscribe',{ key:this.binding.sessionKey,agentId:this.binding.agentId,subscriptionId:this.binding.id }); } catch { this.lifecycle={stage:'subscribe',reason:'rpc_failed'}; throw new AdapterError('not_available'); }
      if (generation!==this.generation || (recoveryEpoch!==undefined && recoveryEpoch!==this.recoveryEpoch)) throw new AdapterError('history_recovery_cancelled');
      if (ack?.key!==this.binding.sessionKey || ack?.agentId!==this.binding.agentId) { this.lifecycle={stage:'subscribe',reason:'invalid_response'}; fail('not_available'); }
      this.subscribed=true;
      // Recover cursor/receipts first. A tail below is an intentional canonical replacement, never delta concatenation.
      if (this.cursor) { this.lifecycle={stage:'cursor',reason:'started'}; try { await this.rpc('chat.history',this.historyParams({cursor:this.cursor})); } catch { this.cursor=null; this.cursorRejected=true; this.lifecycle={stage:'cursor',reason:'cursor_rejected'}; } }
      if (generation!==this.generation || (recoveryEpoch!==undefined && recoveryEpoch!==this.recoveryEpoch)) throw new AdapterError('history_recovery_cancelled');
      await this.refresh(generation);
      if (generation!==this.generation || (recoveryEpoch!==undefined && recoveryEpoch!==this.recoveryEpoch)) throw new AdapterError('history_recovery_cancelled');
      this.clearRecovery();
    } catch (error) { if(generation!==this.generation || (recoveryEpoch!==undefined && recoveryEpoch!==this.recoveryEpoch)) throw new AdapterError('history_recovery_cancelled'); this.subscribed=false; this.clearWatchdog(); this.state=error?.code==='outcome_unknown'?'outcome_unknown':'unavailable'; if(error?.code==='outcome_unknown')this.lifecycle={stage:'ledger',reason:'persistence_failed'};else if(error?.code==='history_unavailable')this.lifecycle={stage:'history',reason:'rpc_failed'};else if(this.lifecycle.reason==='started')this.lifecycle={stage:this.lifecycle.stage,reason:'invalid_response'}; this.revision=randomUUID(); throw new AdapterError(error?.code==='history_unavailable'?'history_unavailable':'not_available'); }
  }); }
  outstanding() { return this.ledger.filter(row=>row.state!=='finished').map(row=>row.runId); }
  historyParams(extra={}) {
    const inputRunIds=this.outstanding();
    return {...this.address(),limit:40,maxBytes:65536,maxChars:8000,...extra,...(inputRunIds.length ? {inputRunIds} : {})};
  }
  transcriptInputKey(row) { return `${row.runId}:user`; }
  async recoverWindow(raw, generation) {
    const candidates=this.ledger.filter(row=>row.state!=='finished' && row.sessionId===raw.sessionId &&
      !raw.inputReceipts?.some(receipt=>receipt?.runId===row.runId && receipt.state==='consumed') &&
      !raw.messages.some(message=>message?.role==='user' && message.__openclaw?.idempotencyKey===this.transcriptInputKey(row)) &&
      !raw.sessionInfo.activeRunIds.includes(row.runId));
    if(!candidates.length)return;
    const inputRunIds=[...new Set(candidates.map(row=>row.runId))].filter(id=>/^[A-Za-z0-9_-]{1,256}$/.test(id)).slice(0,50);
    if(!inputRunIds.length)return;
    let recovered;
    try { recovered=await this.rpc('chat.history',{...this.address(),...RECOVERY_HISTORY,inputRunIds}); } catch { return; }
    if(generation!==this.generation)return;
    let size;try{size=Buffer.byteLength(JSON.stringify(recovered));}catch{return;}
    if(size>RECOVERY_HISTORY.maxBytes || !recovered || recovered.kind==='delta' || recovered.kind==='reset' || recovered.sessionKey!==this.binding.sessionKey || recovered.sessionId!==raw.sessionId || !Array.isArray(recovered.messages) || recovered.messages.length>RECOVERY_HISTORY.limit || !recovered.sessionInfo || !Array.isArray(recovered.sessionInfo.activeRunIds) || recovered.sessionInfo.activeRunIds.length>50 || recovered.sessionInfo.activeRunIds.some(id=>typeof id!=='string') || recovered.sessionInfo.hasActiveRun!==(recovered.sessionInfo.activeRunIds.length>0) || typeof recovered.sessionInfo.hasActiveRun!=='boolean')return;
    let changed=false;
    for(const row of candidates){
      if(recovered.sessionInfo.activeRunIds.includes(row.runId))continue;
      const receipt=recovered.inputReceipts?.find(item=>item?.runId===row.runId && item.state==='consumed');
      const message=recovered.messages.find(item=>item?.role==='user' && item.__openclaw?.idempotencyKey===this.transcriptInputKey(row));
      if(!receipt && !message)continue;
      const eventId=receipt?.consumedByEventId ?? message?.__openclaw?.id;
      if(typeof eventId==='string'&&eventId.length<=1024)row.messageId=eventId;
      row.custody='committed';row.state='finished';changed=true;
    }
    if(changed)await this.persist(generation);
  }
  async refresh(generation=this.generation) {
    if(this.persistenceFault) { this.state='outcome_unknown'; this.lifecycle={stage:'ledger',reason:'persistence_failed'}; fail('outcome_unknown'); }
    this.lifecycle={stage:'history',reason:'started'};
    let response;
    try { response=await this.rpc('chat.history',this.historyParams()); } catch { throw new AdapterError('history_unavailable'); }
    const raw=bounded(response);
    if (generation!==this.generation) { this.lifecycle={stage:'validation',reason:'generation_changed'}; fail('not_available'); }
    if (!raw || raw.kind==='delta' || raw.kind==='reset' || raw.sessionKey!==this.binding.sessionKey || typeof raw.sessionId!=='string' || !Array.isArray(raw.messages) || raw.messages.length>40 || !raw.sessionInfo || !Object.hasOwn(raw.sessionInfo,'activeLeafEntryId') || !(raw.sessionInfo.activeLeafEntryId===null || typeof raw.sessionInfo.activeLeafEntryId==='string') || typeof raw.sessionInfo.hasActiveRun!=='boolean' || !Array.isArray(raw.sessionInfo.activeRunIds) || raw.sessionInfo.activeRunIds.length>50 || raw.sessionInfo.activeRunIds.some(id=>typeof id!=='string') || raw.sessionInfo.hasActiveRun !== (raw.sessionInfo.activeRunIds.length>0)) { this.lifecycle={stage:'validation',reason:'invalid_response'}; fail('not_available'); }
    await this.recoverWindow(raw,generation);
    const active=raw.sessionInfo.activeRunIds;
    let changed=false, unknown=false;
    for (const row of this.ledger) {
      if (row.state==='finished') continue;
      if (row.sessionId!==raw.sessionId) { unknown=true; continue; }
      const receipt=raw.inputReceipts?.find(r=>r.runId===row.runId);
      // The transcript projection preserves the Gateway's deterministic source key
      // (`<client run id>:user`). It is an exact identity fallback when a receipt
      // cannot be returned after a restart; message text is never used as proof.
      const transcriptMessage=raw.messages.find(m=>m?.role==='user' && m.__openclaw?.idempotencyKey===this.transcriptInputKey(row));
      // Consumed is the only established transcript custody proof. Unknown/omitted receipts never imply absence.
      if (receipt?.state==='consumed' || transcriptMessage) { const eventId=receipt?.consumedByEventId ?? transcriptMessage?.__openclaw?.id;if(typeof eventId==='string'&&eventId.length<=1024)row.messageId=eventId; row.custody='committed'; changed=true; if (!active.includes(row.runId)) { row.state='finished'; changed=true; } }
      else if (!active.includes(row.runId)) unknown=true;
      else if (row.state==='prepared' || row.state==='unknown') { row.state='accepted'; changed=true; }
    }
    if (changed) await this.persist(generation);
    if (generation!==this.generation) fail('not_available');
    const foreign=active.some(id=>!this.ledger.some(r=>r.runId===id && r.sessionId===raw.sessionId));
    this.sessionId=raw.sessionId; this.leaf=raw.sessionInfo.activeLeafEntryId; this.cursor=typeof raw.deltaCursor==='string' ? raw.deltaCursor : null;
    const messages=raw.messages.map(m=>{const projected=project(m,`${this.binding.id}:${raw.sessionId}`);if(projected?.role==='user'){const row=this.ledger.find(r=>r.sessionId===raw.sessionId && r.messageId===m.__openclaw?.id);if(row)projected.submissionId=row.submissionId;}return projected;}).filter(Boolean);
    this.truncated=Boolean(raw.truncated || raw.hasMore || raw.olderCursor || raw.messages.length===40);
    const inflight=raw.inFlightRun;
    if (inflight && active.includes(inflight.runId) && this.ledger.some(r=>r.runId===inflight.runId && r.sessionId===raw.sessionId)) {
      const text=safeText(inflight.text);
      if(text && !/<\/?(?:tool_call|function_call|system|analysis)\b|<\|(?:im_start|system|assistant)/i.test(text))messages.push({id:hash(`${this.binding.id}:${raw.sessionId}:inflight:${inflight.runId}`),role:'assistant',text,status:'streaming'});
    }
    this.messages=messages.slice(-40);
    const pending=this.ledger.find(row=>row.state!=='finished');
    const next=unknown || foreign ? 'outcome_unknown' : pending ? pending.state==='stopping' ? 'stopping' : 'busy' : 'ready';
    // Revisions change only when the authoritative view changes, not for every poll.
    const view=JSON.stringify({messages,state:next,sessionId:this.sessionId,leaf:this.leaf,pending:pending?.handle,truncated:this.truncated});
    if (view!==this.view) { this.view=view; this.revision=randomUUID(); }
    this.state=next; this.lifecycle={stage:'reconciled',reason:this.cursorRejected?'cursor_rejected':'success'};
    if (!this.outstanding().length || next==='ready') this.clearWatchdog();
    else this.scheduleWatchdog();
    return this.snapshot();
  }
  snapshot() {
    const pending=this.ledger.find(row=>row.state!=='finished' && row.sessionId===this.sessionId);
    return bounded({revision:this.revision,state:this.state,messages:this.messages,truncated:Boolean(this.truncated),activeRun:pending ? {handle:pending.handle,cancellable:['accepted','stopping'].includes(pending.state)} : null,lifecycle:this.lifecycle});
  }
  history() { return this.serial(async()=> { if (['connecting','reconnecting','unavailable'].includes(this.state)) return this.snapshot(); try { return await this.refresh(); } catch (error) { if(error?.code==='history_unavailable'){this.lifecycle={stage:'history',reason:'rpc_failed'};this.state='unavailable';this.revision=randomUUID();this.scheduleRecovery();} else if(this.state!=='outcome_unknown'){if(this.lifecycle.reason==='started')this.lifecycle={stage:this.lifecycle.stage,reason:'invalid_response'};this.state='unavailable';this.revision=randomUUID();} return this.snapshot(); } }); }
  async persist(generation=this.generation) { try { this.clockFloor=Math.max(this.clockFloor,Date.now());await this.saveLedger(this.ledger,this.clockFloor);if(generation!==this.generation)fail('not_available'); } catch { if(generation!==this.generation)fail('not_available');this.persistenceFault=true;this.lifecycle={stage:'ledger',reason:'persistence_failed'};this.state='outcome_unknown'; fail('outcome_unknown'); } }
  send(body) { return this.serial(async()=> {
    if (!body || Object.keys(body).sort().join(',')!=='revision,submissionId,text' || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.submissionId) || !admitText(body.text)) fail('invalid_input');
    const submittedAt=Number.parseInt(body.submissionId.replaceAll('-','').slice(0,12),16), now=Math.max(Date.now(),this.clockFloor);
    if (submittedAt > now + 30000 || now-submittedAt > RETRY_MS) fail('invalid_input');
    const digest=hash(body.text), existing=this.ledger.find(row=>row.submissionId===body.submissionId);
    if (existing) { if (existing.digest!==digest) fail('invalid_input'); if (['prepared','unknown'].includes(existing.state)) fail('outcome_unknown'); return {submissionId:existing.submissionId,runHandle:existing.handle,custody:existing.custody}; }
    if(now-submittedAt>NEW_ID_MS)fail('invalid_input');
    if (this.state!=='ready') fail(this.state==='outcome_unknown'?'outcome_unknown':this.state==='busy'||this.state==='stopping'?'busy':'not_available');
    if (body.revision!==this.revision) fail('stale_view');
    const previous=this.revision; await this.refresh();
    if (this.state!=='ready') fail(this.state==='outcome_unknown'?'outcome_unknown':'busy');
    if (previous!==this.revision) fail('stale_view');
    this.recent=this.recent.filter(t=>now-t<60000); if(this.recent.length>=10) fail('rate_limited'); this.recent.push(now);
    // Expired UUIDv7 identities can never be admitted again. Never forget uncertain custody.
    this.ledger=this.ledger.filter(row=>row.state!=='finished'||now-row.createdAt<=RETRY_MS+60000);
    if(this.ledger.length>=2048) fail('rate_limited');
    const row={submissionId:body.submissionId,digest,runId:`pcc-${hash(`${this.binding.id}:${body.submissionId}`)}`,handle:randomUUID(),sessionId:this.sessionId,state:'prepared',custody:'accepted',createdAt:now};
    this.ledger.push(row); await this.persist(); this.state='busy';this.revision=randomUUID();
    try {
      const result=await this.rpc('chat.send',{...this.address(),sessionId:row.sessionId,expectedLeafEntryId:this.leaf,message:body.text,idempotencyKey:row.runId});
      if (result?.runId!==row.runId || !['started','accepted','queued'].includes(result?.status)) fail('outcome_unknown');
      row.state='accepted'; if(Number.isInteger(result.messageSeq)&&result.messageSeq>0)row.custody='committed'; await this.persist(); this.scheduleWatchdog();
      return {submissionId:row.submissionId,runHandle:row.handle,custody:row.custody};
    } catch { row.state='unknown';this.state='outcome_unknown';await this.persist();this.scheduleWatchdog();fail('outcome_unknown'); }
  }); }
  cancel(body) { return this.serial(async()=> {
    if (!body || Object.keys(body).join(',')!=='runHandle' || typeof body.runHandle!=='string') fail('invalid_input');
    const row=this.ledger.find(r=>r.handle===body.runHandle);
    if (!row || row.sessionId!==this.sessionId) fail('invalid_input');
    if(row.state==='finished')return {state:'already-finished'};
    if(!['accepted','stopping'].includes(row.state) || ['connecting','reconnecting','unavailable'].includes(this.state)) fail('outcome_unknown');
    const generation=this.generation; await this.refresh();
    if(generation!==this.generation || row.sessionId!==this.sessionId)fail('stale_view');
    if(row.state==='finished')return {state:'already-finished'};
    try { const result=await this.rpc('chat.abort',{...this.address(),runId:row.runId}); if(result?.ok!==true || !Array.isArray(result.runIds) || result.runIds.some(id=>id!==row.runId)) fail('not_available'); row.state='stopping';this.state='stopping';this.revision=randomUUID();await this.persist();return {state:'stopping'}; }
    catch { fail('not_available'); }
  }); }
}
