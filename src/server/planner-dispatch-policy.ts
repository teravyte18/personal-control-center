export class PlannerDispatchError extends Error {}
export type PlannerDispatchConfig = { enabled: boolean; ownerId: string; origin: string; socketPath: string; credential: string };
export function plannerDispatchConfig(env: NodeJS.ProcessEnv = process.env): PlannerDispatchConfig {
  const config = {enabled: env.PCC_PLANNER_DISPATCH_ENABLED === '1', ownerId: env.PCC_PLANNER_DISPATCH_OWNER_ID ?? '',
    origin: env.PCC_PUBLIC_URL ?? '', socketPath: env.PCC_PLANNER_DISPATCH_SOCKET_PATH ?? '', credential: env.PCC_PLANNER_DISPATCH_CREDENTIAL ?? ''};
  if (config.enabled) {
    let url: URL; try { url = new URL(config.origin); } catch { throw new PlannerDispatchError(); }
    if (env.PCC_ALLOW_INSECURE_USER_HEADER === '1' || !/^[0-9a-f-]{36}$/i.test(config.ownerId)
      || url.origin !== config.origin || !['https:', 'http:'].includes(url.protocol)
      || (url.protocol === 'http:' && !['127.0.0.1','[::1]'].includes(url.hostname))
      || !config.socketPath.startsWith('/') || config.credential.length < 32 || config.credential.length > 256 || /[\r\n]/.test(config.credential)) throw new PlannerDispatchError();
  }
  return config;
}
export function requirePlannerDispatchOwner(request: Request, user: {id: string; role: string}, config: PlannerDispatchConfig) {
  if (!config.enabled || user.role !== 'owner' || user.id !== config.ownerId || request.headers.has('authorization')
    || request.headers.has('x-pcc-user-email') || process.env.PCC_ALLOW_INSECURE_USER_HEADER === '1'
    || request.headers.get('origin') !== config.origin || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')
    || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
    || new URL(request.url).search) throw new PlannerDispatchError();
}
export async function readPlannerDispatchJson(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new PlannerDispatchError();
  let expired = false; let size = 0; const chunks: Uint8Array[] = [];
  const timer = setTimeout(() => { expired = true; void reader.cancel(); }, 5000);
  try {
    for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) throw new PlannerDispatchError(); chunks.push(value); }
    if (expired) throw new PlannerDispatchError();
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks))) as unknown;
  } catch { await reader.cancel().catch(() => {}); throw new PlannerDispatchError(); }
  finally { clearTimeout(timer); reader.releaseLock(); }
}
