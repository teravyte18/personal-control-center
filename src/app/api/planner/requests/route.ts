import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import { requireSameOrigin, AssistantAccessError } from "@/domain/assistant-access";
import { createPlannerRequest, listPlannerRequests, cancelPlannerRequest, PlannerRequestInputError } from "@/server/planner-requests";
import { dispatchPlannerRequest } from "@/server/planner-dispatch";
import { plannerDispatchConfig, requirePlannerDispatchOwner, readPlannerDispatchJson, PlannerDispatchError } from "@/server/planner-dispatch-policy";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
function failure(e:unknown) {
  const code=e instanceof AuthenticationRequiredError?401:e instanceof AssistantAccessError || e instanceof PlannerDispatchError?403:e instanceof PlannerRequestInputError || e instanceof SyntaxError?400:503;
  return Response.json({error:code===401?"Authentication required.":code===403?"Request origin denied.":code===400?e instanceof Error?e.message:"Invalid request.":"Planner queue unavailable."},{status:code,headers});
}
export async function GET(request:Request) {
  try{
    const user=await resolveRequestUser(request);
    return Response.json({requests:await listPlannerRequests(user.id)},{headers});
  }catch(e){return failure(e);}
}
export async function POST(request:Request) {
  try{
    const user=await resolveRequestUser(request);
    requireSameOrigin(request,process.env.PCC_PUBLIC_URL);
    const config=plannerDispatchConfig();
    const dispatch=config.enabled && user.role==='owner' && user.id===config.ownerId;
    if(dispatch) requirePlannerDispatchOwner(request,user,config);
    const saved=await createPlannerRequest(user.id,await readPlannerDispatchJson(request));
    // The durable queue save is success even if transport fails; never encourage a new request.
    if(dispatch) await dispatchPlannerRequest(user.id,saved.id,config).catch(()=>{});
    const updated=(await listPlannerRequests(user.id).catch(()=>[])).find(row=>row.id===saved.id) ?? saved;
    return Response.json({request:updated},{status:201,headers});
  }catch(e){return failure(e);}
}
export async function DELETE(request:Request) {
  try{
    const user=await resolveRequestUser(request);
    requireSameOrigin(request,process.env.PCC_PUBLIC_URL);
    const body=await readPlannerDispatchJson(request) as {id?:unknown};
    if(!body || typeof body!=="object" || Array.isArray(body) || Object.keys(body).join(',')!=='id') throw new PlannerRequestInputError("Invalid cancellation.");
    await cancelPlannerRequest(user.id,body.id);
    return Response.json({ok:true},{headers});
  }catch(e){return failure(e);}
}
