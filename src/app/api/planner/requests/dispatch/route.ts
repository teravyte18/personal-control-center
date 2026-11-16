import { AuthenticationRequiredError, requireAuthenticatedUser } from '@/server/auth';
import { dispatchPlannerRequest } from '@/server/planner-dispatch';
import { listPlannerRequests } from '@/server/planner-requests';
import { plannerDispatchConfig, requirePlannerDispatchOwner, readPlannerDispatchJson, PlannerDispatchError } from '@/server/planner-dispatch-policy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'private, no-store'};
/** Same identity retry means reconciliation, not another inference. */
export async function POST(request: Request) {
  try {
    const user=await requireAuthenticatedUser(request); const config=plannerDispatchConfig();
    requirePlannerDispatchOwner(request,user,config);
    const body=await readPlannerDispatchJson(request);
    if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).join(',')!=='id'
      || typeof (body as {id:unknown}).id!=='string' || !/^[0-9a-f-]{36}$/.test((body as {id:string}).id)) throw new PlannerDispatchError();
    await dispatchPlannerRequest(user.id,(body as {id:string}).id,config);
    return Response.json({requests:await listPlannerRequests(user.id)},{headers});
  } catch(error) {
    const status=error instanceof AuthenticationRequiredError?401:error instanceof PlannerDispatchError?403:503;
    return Response.json({error:status===401?'Authentication required.':status===403?'Planner dispatch denied.':'Planner dispatch unavailable.'},{status,headers});
  }
}
