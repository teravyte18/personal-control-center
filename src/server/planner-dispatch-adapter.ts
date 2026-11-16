import { request as httpRequest } from 'node:http';
import type { PlannerDispatchConfig } from './planner-dispatch-policy.ts';
export type PlannerDispatchState = 'unknown' | 'accepted' | 'committed';
/** Request identities only. No user data, prompts, tools or runtime selectors. */
export function plannerDispatchAdapter(config: PlannerDispatchConfig, operation: 'dispatch' | 'status', identity: {requestId: string; dispatchId: string}): Promise<PlannerDispatchState> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(identity);
    const req = httpRequest({socketPath: config.socketPath, path: `/${operation}`, method: 'POST', headers: {
      Authorization: `Bearer ${config.credential}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
    }}, res => {
      let bytes = 0; const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > 1024) res.destroy(new Error()); else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => {
        try {
          const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)));
          if (res.statusCode !== 200 || !value || Object.keys(value).sort().join(',') !== 'dispatchId,requestId,state'
            || value.requestId !== identity.requestId || value.dispatchId !== identity.dispatchId || !['unknown','accepted','committed'].includes(value.state)) throw new Error();
          resolve(value.state);
        } catch { reject(new Error('Planner dispatch unavailable.')); }
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error('Planner dispatch unavailable.')), 7000); deadline.unref();
    req.once('close', () => clearTimeout(deadline)); req.once('error', reject); req.end(body);
  });
}
