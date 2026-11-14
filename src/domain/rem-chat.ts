/** Browser-safe contract. Routing, Gateway IDs and credentials never belong here. */
export type RemState = 'disabled' | 'connecting' | 'ready' | 'busy' | 'reconnecting' | 'stopping' | 'unavailable' | 'outcome_unknown';
export type RemMessage = { id: string; role: 'user' | 'assistant'; text: string; status: 'pending' | 'streaming' | 'complete' | 'stopped' | 'failed'; submissionId?: string };
export type RemSnapshot = { revision: string; state: RemState; messages: RemMessage[]; truncated: boolean; activeRun: { handle: string; cancellable: boolean } | null };
export type RemSendBody = { submissionId: string; text: string; revision: string };
export type RemSendReceipt = { submissionId: string; runHandle: string; custody: 'accepted' | 'committed' };
export type RemCancelBody = { runHandle: string };
export type RemErrorCode = 'not_available' | 'busy' | 'invalid_input' | 'rate_limited' | 'stale_view' | 'outcome_unknown' | 'not_authenticated' | 'not_authorized';
export type RemEvent = { type: 'snapshot'; id: string; snapshot: RemSnapshot } | { type: 'reset'; id: string } | { type: 'error'; id: string; error: RemErrorCode };
export const REM_LIMITS = { bodyBytes: 32768, textPoints: 8000, responseBytes: 131072, messages: 40, streamMs: 300000, leaseMs: 15000 } as const;
export class RemError extends Error {
  code: RemErrorCode;
  constructor(code: RemErrorCode) { super(code); this.code = code; }
}
export function remObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RemError('invalid_input');
  return value as Record<string, unknown>;
}
export function remExact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new RemError('invalid_input');
}
export function remOpaque(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(value); }
/** UUIDv7 encodes admission time, allowing bounded retry retention without forgotten-ID replay. */
export function newRemSubmissionId(now = Date.now()): string {
  const data = new Uint8Array(16); crypto.getRandomValues(data);
  let time = BigInt(now); for (let index = 5; index >= 0; index--) { data[index] = Number(time & BigInt(255)); time >>= BigInt(8); }
  data[6] = (data[6] & 15) | 112; data[8] = (data[8] & 63) | 128;
  const hex = Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function parseRemSend(value: unknown): RemSendBody {
  const v = remObject(value); remExact(v, ['submissionId', 'text', 'revision']);
  if (typeof v.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.submissionId) || typeof v.text !== 'string' || !v.text.trim() || [...v.text].length > REM_LIMITS.textPoints || !remOpaque(v.revision)) throw new RemError('invalid_input');
  return { submissionId: v.submissionId, text: v.text, revision: v.revision };
}
export function parseRemCancel(value: unknown): RemCancelBody {
  const v = remObject(value); remExact(v, ['runHandle']);
  if (!remOpaque(v.runHandle)) throw new RemError('invalid_input');
  return { runHandle: v.runHandle };
}
export function parseRemSnapshot(value: unknown): RemSnapshot {
  const v = remObject(value); remExact(v, ['revision', 'state', 'messages', 'truncated', 'activeRun']);
  if (!remOpaque(v.revision) || !['disabled','connecting','ready','busy','reconnecting','stopping','unavailable','outcome_unknown'].includes(String(v.state)) || typeof v.truncated !== 'boolean' || !Array.isArray(v.messages) || v.messages.length > REM_LIMITS.messages) throw new RemError('not_available');
  const messages = v.messages.map(raw => {
    const m = remObject(raw); remExact(m, m.submissionId === undefined ? ['id','role','text','status'] : ['id','role','text','status','submissionId']);
    if (!remOpaque(m.id) || !['user','assistant'].includes(String(m.role)) || typeof m.text !== 'string' || [...m.text].length > 8000 || !['pending','streaming','complete','stopped','failed'].includes(String(m.status)) || (m.submissionId !== undefined && (typeof m.submissionId !== 'string' || m.submissionId.length > 64))) throw new RemError('not_available');
    return m as RemMessage;
  });
  let activeRun: RemSnapshot['activeRun'] = null;
  if (v.activeRun !== null) { const a = remObject(v.activeRun); remExact(a, ['handle','cancellable']); if (!remOpaque(a.handle) || typeof a.cancellable !== 'boolean') throw new RemError('not_available'); activeRun = { handle:a.handle,cancellable:a.cancellable }; }
  return { revision:v.revision,state:v.state as RemState,messages,truncated:v.truncated,activeRun };
}
export const remFictionalSnapshots: RemSnapshot[] = ['disabled','ready','busy','reconnecting','stopping','unavailable','outcome_unknown'].map(state => ({
  revision: 'fictional_revision_0001', state: state as RemState,
  messages: state === 'disabled' ? [] : [{ id: 'fictional_message_0001', role: 'assistant', text: 'What would you like to work on?', status: 'complete' }],
  truncated: false, activeRun: ['busy','stopping'].includes(state) ? { handle:'fictional_run_handle_001',cancellable:true } : null,
}));
