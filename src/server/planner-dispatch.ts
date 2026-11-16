import 'server-only';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/server/database';
import { plannerDispatchAdapter } from '@/server/planner-dispatch-adapter';
import type { PlannerDispatchConfig } from '@/server/planner-dispatch-policy';

/** Persist before send. Existing identities get read-only reconciliation, never another send. */
export async function dispatchPlannerRequest(userId: string, requestId: string, config: PlannerDispatchConfig) {
  if (!config.enabled || userId !== config.ownerId) return;
  const sql = getDatabase();
  const candidate = randomUUID();
  const [claimed] = await sql<{dispatch_id: string}[]>`update planner_requests set dispatch_id=${candidate},dispatch_state='unknown',dispatch_updated_at=now()
    where user_id=${userId} and id=${requestId} and dispatch_id is null and cancelled_at is null and processed_at is null
      and exists(select 1 from users where id=${userId} and role='owner' and status='active') returning dispatch_id`;
  const [row] = claimed ? [claimed] : await sql<{dispatch_id: string|null}[]>`select dispatch_id from planner_requests where user_id=${userId} and id=${requestId}`;
  if (!row?.dispatch_id) return;
  try {
    const state = await plannerDispatchAdapter(config, claimed ? 'dispatch' : 'status', {requestId, dispatchId: row.dispatch_id});
    // Preserve monotonic custody even when a concurrent status request sees an older receipt.
    await sql`update planner_requests set dispatch_state=case when dispatch_state='committed' or ${state}='committed' then 'committed'
      when dispatch_state='accepted' or ${state}='accepted' then 'accepted' else 'unknown' end,dispatch_updated_at=now()
      where user_id=${userId} and id=${requestId} and dispatch_id=${row.dispatch_id}`;
  } catch { /* Lost responses retain unknown custody. No retry/send fallback. */ }
}
