import { createHash, randomUUID } from 'node:crypto';
import { admitText } from './input-policy.mjs';
export class AdapterError extends Error { constructor(code) { super(code); this.code = code; } }
export const RETRY_MS = 24 * 60 * 60 * 1000;
const NEW_ID_MS = 5 * 60 * 1000;
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
  if (raw.isError || raw.__openclaw?.internal || raw.__openclaw?.source === 'injected') return null;
  const text = safeText(typeof raw.content === 'string' ? raw.content : Array.isArray(raw.content) ? raw.content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : '');
  if (!text || /<\/?(?:tool_call|function_call|system|analysis)\b|<\|(?:im_start|system|assistant)/i.test(text)) return null;
  return { id:hash(`${namespace}:${id}`),role:raw.role,text,status:'complete' };
}
/** Only this class constructs RPC arguments. The browser never supplies routing or RPC names. */
export class RemController {
  constructor({ rpc, binding, ledger, saveLedger, clockFloor=0 }) {
    if (!binding || !/^[a-zA-Z0-9_-]{16,128}$/.test(binding.id) || typeof binding.sessionKey !== 'string' || !binding.sessionKey.startsWith(`agent:${binding.agentId}:`) || /:(?:main|global|subagent|cron|acp)(?::|$)/i.test(binding.sessionKey)) throw new AdapterError('not_available');
    if(!Number.isSafeInteger(clockFloor)||clockFloor<0)fail('not_available');this.clockFloor=clockFloor;
    this.rpc=rpc; this.binding=binding; this.ledger=ledger ?? []; this.saveLedger=saveLedger;
    if (!Array.isArray(this.ledger) || this.ledger.length > 2048) fail('not_available');
    const identities=new Set();
    for(const row of this.ledger) {
      if(!row || typeof row!=='object' || Object.keys(row).some(k=>!['submissionId','digest','runId','handle','sessionId','state','custody','createdAt','messageId'].includes(k)) || typeof row.submissionId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.submissionId) || !/^[A-Za-z0-9_-]{43}$/.test(row.digest??'') || row.runId!==`pcc-${hash(`${binding.id}:${row.submissionId}`)}` || typeof row.handle!=='string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(row.handle) || typeof row.sessionId!=='string' || !row.sessionId || row.sessionId.length>256 || !['prepared','unknown','accepted','stopping','finished'].includes(row.state) || !['accepted','committed'].includes(row.custody) || !Number.isSafeInteger(row.createdAt) || (row.messageId!==undefined && (typeof row.messageId!=='string'||row.messageId.length>1024)) || identities.has(row.submissionId))fail('not_available');
      identities.add(row.submissionId);
    }
    this.state='connecting'; this.messages=[]; this.revision=randomUUID(); this.generation=0; this.cursor=null; this.sessionId=null; this.leaf=undefined; this.chain=Promise.resolve(); this.recent=[];
  }
  serial(fn) { const task=this.chain.then(fn); this.chain=task.catch(()=>{}); return task; }
  address() { return { sessionKey:this.binding.sessionKey,agentId:this.binding.agentId }; }
  disconnect() { this.generation++; this.state='reconnecting'; this.revision=randomUUID(); }
  async connect() { return this.serial(async()=> {
    const generation=++this.generation; this.state='connecting';
    try {
      const ack=await this.rpc('sessions.messages.subscribe',{ key:this.binding.sessionKey,agentId:this.binding.agentId,subscriptionId:this.binding.id });
      if (ack?.key!==this.binding.sessionKey || ack?.agentId!==this.binding.agentId) fail('not_available');
      // Recover cursor/receipts first. A tail below is an intentional canonical replacement, never delta concatenation.
      if (this.cursor) await this.rpc('chat.history',{...this.address(),limit:40,maxBytes:65536,maxChars:8000,cursor:this.cursor,inputRunIds:this.outstanding()});
      if (generation!==this.generation) fail('not_available');
      await this.refresh(generation);
    } catch { this.state='unavailable'; this.revision=randomUUID(); throw new AdapterError('not_available'); }
  }); }
  outstanding() { return this.ledger.filter(row=>row.state!=='finished').map(row=>row.runId); }
  async refresh(generation=this.generation) {
    const raw=bounded(await this.rpc('chat.history',{...this.address(),limit:40,maxBytes:65536,maxChars:8000,inputRunIds:this.outstanding()}));
    if (generation!==this.generation) fail('not_available');
    if (!raw || raw.kind==='delta' || raw.kind==='reset' || raw.sessionKey!==this.binding.sessionKey || typeof raw.sessionId!=='string' || !Array.isArray(raw.messages) || raw.messages.length>40 || !raw.sessionInfo || !Object.hasOwn(raw.sessionInfo,'activeLeafEntryId') || !(raw.sessionInfo.activeLeafEntryId===null || typeof raw.sessionInfo.activeLeafEntryId==='string') || typeof raw.sessionInfo.hasActiveRun!=='boolean' || !Array.isArray(raw.sessionInfo.activeRunIds) || raw.sessionInfo.activeRunIds.length>50 || raw.sessionInfo.activeRunIds.some(id=>typeof id!=='string') || raw.sessionInfo.hasActiveRun !== (raw.sessionInfo.activeRunIds.length>0)) fail('not_available');
    const active=raw.sessionInfo.activeRunIds;
    let changed=false, unknown=false;
    for (const row of this.ledger) {
      if (row.state==='finished') continue;
      if (row.sessionId!==raw.sessionId) { unknown=true; continue; }
      const receipt=raw.inputReceipts?.find(r=>r.runId===row.runId);
      // Consumed is the only established transcript custody proof. Unknown/omitted receipts never imply absence.
      if (receipt?.state==='consumed') { if(typeof receipt.consumedByEventId==='string'&&receipt.consumedByEventId.length<=1024)row.messageId=receipt.consumedByEventId; row.custody='committed'; changed=true; if (!active.includes(row.runId)) { row.state='finished'; changed=true; } }
      else if (!active.includes(row.runId)) unknown=true;
      else if (row.state==='prepared' || row.state==='unknown') { row.state='accepted'; changed=true; }
    }
    if (changed) await this.persist();
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
    this.state=next;
    return this.snapshot();
  }
  snapshot() {
    const pending=this.ledger.find(row=>row.state!=='finished' && row.sessionId===this.sessionId);
    return bounded({revision:this.revision,state:this.state,messages:this.messages,truncated:Boolean(this.truncated),activeRun:pending ? {handle:pending.handle,cancellable:['accepted','stopping'].includes(pending.state)} : null});
  }
  history() { return this.serial(async()=> { if (['connecting','reconnecting','unavailable'].includes(this.state)) return this.snapshot(); try { return await this.refresh(); } catch { this.state='unavailable';this.revision=randomUUID();return this.snapshot(); } }); }
  async persist() { try { this.clockFloor=Math.max(this.clockFloor,Date.now());await this.saveLedger(this.ledger,this.clockFloor); } catch { this.state='outcome_unknown'; fail('outcome_unknown'); } }
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
      row.state='accepted'; if(Number.isInteger(result.messageSeq)&&result.messageSeq>0)row.custody='committed'; await this.persist();
      return {submissionId:row.submissionId,runHandle:row.handle,custody:row.custody};
    } catch { row.state='unknown';this.state='outcome_unknown';await this.persist();fail('outcome_unknown'); }
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
