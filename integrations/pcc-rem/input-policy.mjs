// Parser compatibility is pinned to OpenClaw 2026.10.9. No Gateway internal imports.
export const SUPPORTED_OPENCLAW = '2026.10.9';
export const ABORT_TRIGGERS = new Set([
  'stop','esc','abort','exit','interrupt','detente','deten','detén','arrete','arrête','停止','停下来','暂停','やめて','止めて','रुको','توقف','стоп','остановись','останови','остановить','прекрати','halt','anhalten','aufhören','hoer auf','stopp','pare','stop openclaw','openclaw stop','stop action','stop current action','stop run','stop current run','stop agent','stop the agent',"stop don't do anything",'stop dont do anything','stop do not do anything','stop doing anything','do not do that','please stop','stop please',
]);
export function normalizeAbort(text) { return text.trim().toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g,' ').replace(/[.!?！？…,，。;；:：'"’”)\]}]+$/u,'').trim(); }
export function admitText(text) {
  if (typeof text !== 'string' || !text.trim() || [...text].length > 8000 || Buffer.byteLength(text) > 32000) return false;
  // Reject hidden formatting, Unicode slash lookalikes and malformed Unicode; never rewrite text.
  if (/[\p{Cf}\p{Cs}\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2044\u2215\uff0f\uff01]/u.test(text) || ABORT_TRIGGERS.has(normalizeAbort(text))) return false;
  // Conservative: exclamation marks are disallowed anywhere, including bang host-shell forms.
  if (text.includes('!')) return false;
  // Ordinary standalone HTTP(S) URLs are the only allowed slash spans. Ambiguous punctuation/markup fails closed.
  const withoutUrls = text.replace(/https?:\/\/[^\s<>"'`]+/gu, candidate => {
    try { const url = new URL(candidate); return !url.username && !url.password && url.hostname && !/[\\\u0000-\u0020]/u.test(candidate) ? '' : candidate; } catch { return candidate; }
  });
  return !withoutUrls.includes('/') && !text.includes('\\');
}
