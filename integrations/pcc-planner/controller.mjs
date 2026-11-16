import { createHash } from 'node:crypto';
export class DispatchError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = code => { throw new DispatchError(code); };
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
const runId = (binding, dispatchId) => `pcc-plan-${createHash('sha256').update(`${binding.id}:${dispatchId}`).digest('base64url')}`;
export function parseIdentity(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'dispatchId,requestId'
    || !uuid(body.requestId) || !uuid(body.dispatchId)) fail('invalid_input');
  return {requestId: body.requestId, dispatchId: body.dispatchId};
}
export function validateBinding(binding) {
  if (!binding || Object.keys(binding).sort().join(',') !== 'agentId,id,sessionId,sessionKey'
    || !/^[A-Za-z0-9_-]{16,128}$/.test(binding.id) || !/^[A-Za-z0-9_-]{1,128}$/.test(binding.agentId)
    || typeof binding.sessionKey !== 'string' || !binding.sessionKey.startsWith(`agent:${binding.agentId}:`)
    || !/^pcc-planner-[A-Za-z0-9_-]{16,128}$/.test(binding.sessionKey.slice(`agent:${binding.agentId}:`.length))
    || typeof binding.sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(binding.sessionId)) fail('not_available');
  return Object.freeze({...binding});
}
/** Metadata-only custody. No prompts, grant tokens, personal data or transcript copies. */
export class PlannerDispatchController {
  constructor({binding, rows, save, snapshot, send}) {
    this.binding = validateBinding(binding); this.save = save; this.snapshot = snapshot; this.send = send;
    if (!Array.isArray(rows) || rows.length > 2048) fail('not_available');
    const requests = new Set(), dispatches = new Set();
    for (const row of rows) {
      parseIdentity({requestId: row.requestId, dispatchId: row.dispatchId});
      if (Object.keys(row).sort().join(',') !== 'dispatchId,requestId,runId,state' || row.runId !== runId(this.binding, row.dispatchId)
        || !['unknown','accepted','committed'].includes(row.state) || requests.has(row.requestId) || dispatches.has(row.dispatchId)) fail('not_available');
      requests.add(row.requestId); dispatches.add(row.dispatchId);
    }
    this.rows = structuredClone(rows); this.chain = Promise.resolve(); this.fault = false;
  }
  serial(fn) { const task = this.chain.then(fn); this.chain = task.catch(() => {}); return task; }
  receipt(row) { return {requestId: row.requestId, dispatchId: row.dispatchId, state: row.state}; }
  async persist() {
    try { await this.save(structuredClone(this.rows)); } catch { this.fault = true; fail('outcome_unknown'); }
  }
  find(identity) {
    const row = this.rows.find(r => r.requestId === identity.requestId || r.dispatchId === identity.dispatchId);
    if (row && (row.requestId !== identity.requestId || row.dispatchId !== identity.dispatchId)) fail('invalid_input');
    return row;
  }
  async inspect() {
    if (this.fault) fail('outcome_unknown');
    const raw = await this.snapshot(this.rows.filter(row => row.state !== 'committed').map(row => row.runId));
    if (!raw || Buffer.byteLength(JSON.stringify(raw)) > 65536 || raw.kind === 'delta' || raw.kind === 'reset'
      || raw.sessionKey !== this.binding.sessionKey || raw.sessionId !== this.binding.sessionId
      || !Array.isArray(raw.messages) || raw.messages.length > 20 || !raw.sessionInfo
      || !Object.hasOwn(raw.sessionInfo, 'activeLeafEntryId') || !(raw.sessionInfo.activeLeafEntryId === null || typeof raw.sessionInfo.activeLeafEntryId === 'string')
      || !Array.isArray(raw.sessionInfo.activeRunIds) || raw.sessionInfo.activeRunIds.length > 50
      || raw.sessionInfo.activeRunIds.some(id => typeof id !== 'string' || id.length > 256)
      || raw.sessionInfo.hasActiveRun !== (raw.sessionInfo.activeRunIds.length > 0)
      || (raw.inputReceipts !== undefined && (!Array.isArray(raw.inputReceipts) || raw.inputReceipts.length > 2048))) fail('not_available');
    let changed = false;
    for (const row of this.rows) {
      if (row.state === 'committed') continue;
      const consumed = raw.inputReceipts?.some(receipt => receipt?.runId === row.runId && receipt.state === 'consumed'
        && typeof receipt.consumedByEventId === 'string' && receipt.consumedByEventId.length > 0);
      const exactMessage = raw.messages.some(message => message?.role === 'user' && message.__openclaw?.idempotencyKey === `${row.runId}:user`
        && typeof message.__openclaw?.id === 'string' && message.__openclaw.id.length > 0);
      if (consumed || exactMessage) { row.state = 'committed'; changed = true; }
      // Active identity proves acceptance only, never durable transcript custody.
      else if (row.state === 'unknown' && raw.sessionInfo.activeRunIds.includes(row.runId)) { row.state = 'accepted'; changed = true; }
    }
    if (changed) await this.persist();
    return raw;
  }
  status(body) { return this.serial(async () => {
    const identity = parseIdentity(body), row = this.find(identity);
    if (!row) return {...identity, state: 'unknown'}; // Absence is never a resend license.
    try { await this.inspect(); } catch { return {...identity, state: row.state === 'committed' && !this.fault ? 'committed' : 'unknown'}; }
    return this.receipt(row);
  }); }
  dispatch(body) { return this.serial(async () => {
    const identity = parseIdentity(body), existing = this.find(identity);
    if (existing) { if (this.fault) fail('outcome_unknown'); return this.receipt(existing); }
    const raw = await this.inspect();
    if (this.rows.some(row => row.state !== 'committed') || raw.sessionInfo.activeRunIds.length) fail('busy');
    // Retain every identity indefinitely. At capacity fail closed, never erase deduplication facts.
    if (this.rows.length >= 2048) fail('rate_limited');
    const row = {...identity, runId: runId(this.binding, identity.dispatchId), state: 'unknown'};
    this.rows.push(row); await this.persist(); // This must succeed BEFORE the only send attempt.
    try {
      const result = await this.send({requestId: row.requestId, runId: row.runId, leaf: raw.sessionInfo.activeLeafEntryId});
      if (result?.runId !== row.runId || !['accepted','started','queued'].includes(result?.status)) fail('outcome_unknown');
      row.state = 'accepted'; await this.persist();
      // messageSeq is deliberately not used as committed proof: read an exact durable receipt.
      try { await this.inspect(); } catch { /* Acceptance already journaled; status may reconcile later. */ }
      if (this.fault) fail('outcome_unknown');
      return this.receipt(row);
    } catch { if (!this.fault && row.state !== 'committed') { row.state = 'unknown'; await this.persist(); } fail('outcome_unknown'); }
  }); }
}
