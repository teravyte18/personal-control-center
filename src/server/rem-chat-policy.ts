import { RemError } from '../domain/rem-chat.ts';
export type RemConfig = { enabled: boolean; ownerId: string; origin: string; socketPath: string; credential: string };
export function remConfig(env: NodeJS.ProcessEnv = process.env): RemConfig {
  const enabled = env.PCC_REM_ENABLED === '1';
  const ownerId = env.PCC_REM_OWNER_ID ?? '';
  const origin = env.PCC_PUBLIC_URL ?? '';
  const socketPath = env.PCC_REM_SOCKET_PATH ?? '';
  const credential = env.PCC_REM_ADAPTER_CREDENTIAL ?? '';
  if (enabled) {
    let url: URL; try { url = new URL(origin); } catch { throw new RemError('not_available'); }
    if (env.PCC_ALLOW_INSECURE_USER_HEADER === '1' || !/^[0-9a-f-]{36}$/i.test(ownerId) || url.origin !== origin || !['http:','https:'].includes(url.protocol) || (url.protocol === 'http:' && !['127.0.0.1','[::1]','localhost'].includes(url.hostname)) || !socketPath.startsWith('/') || credential.length < 32 || credential.length > 256 || /[\r\n]/.test(credential)) throw new RemError('not_available');
  }
  return { enabled, ownerId, origin, socketPath, credential };
}
export function requireRemOrigin(request: Request, config: RemConfig, write = false) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((site && site !== 'same-origin') || (origin !== null && origin !== config.origin) || (write && origin !== config.origin)) throw new RemError('not_authorized');
  if (write && request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new RemError('invalid_input');
  if (new URL(request.url).search) throw new RemError('invalid_input');
}
export async function readRemJson(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new RemError('invalid_input');
  let expired=false;
  const deadline=setTimeout(()=>{expired=true;void reader.cancel();},5000);
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) { const {done,value} = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 32768) throw new RemError('invalid_input'); chunks.push(value); }
    if(expired)throw new RemError('invalid_input');
    const data = Buffer.concat(chunks); return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)) as unknown;
  } catch { await reader.cancel().catch(() => {}); throw new RemError('invalid_input'); } finally { clearTimeout(deadline); reader.releaseLock(); }
}
