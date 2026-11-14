import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import { requireSameOrigin, AssistantAccessError } from "@/domain/assistant-access";
import { createPlannerRequest, listPlannerRequests, cancelPlannerRequest, PlannerRequestInputError } from "@/server/planner-requests";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
function failure(e:unknown) {
  const code=e instanceof AuthenticationRequiredError?401:e instanceof AssistantAccessError?403:e instanceof PlannerRequestInputError || e instanceof SyntaxError?400:503;
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
    const raw=await request.text();
    if(raw.length>4096) throw new PlannerRequestInputError("Request too large.");
    return Response.json({request:await createPlannerRequest(user.id,JSON.parse(raw))},{status:201,headers});
  }catch(e){return failure(e);}
}
export async function DELETE(request:Request) {
  try{
    const user=await resolveRequestUser(request);
    requireSameOrigin(request,process.env.PCC_PUBLIC_URL);
    const raw=await request.text();
    if(raw.length>1000) throw new PlannerRequestInputError("Request too large.");
    const body=JSON.parse(raw) as {id?:unknown};
    await cancelPlannerRequest(user.id,body.id);
    return Response.json({ok:true},{headers});
  }catch(e){return failure(e);}
}
