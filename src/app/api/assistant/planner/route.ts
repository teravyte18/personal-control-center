import { AssistantAccessError, readAssistantJson, recordInput } from "@/domain/assistant-access";
import { requireAssistantGrant } from "@/server/assistant-grants";
import { plannerAvailability, PlannerConflictError, PlannerInputError, submitPlannerProposal } from "@/server/assistant-planner";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"};

function failure(error:unknown,hasAuth:boolean) {
  const status=error instanceof AssistantAccessError ? (hasAuth?403:401)
    : error instanceof PlannerConflictError ? 409
    : error instanceof PlannerInputError ? 400 : 503;
  return Response.json({error:status===409?"Planner state or Calendar availability changed; retrieve current context."
    : status===400?"Invalid planner request."
    : status===503?"Planner is temporarily unavailable.":"Planning access denied."},{status,headers});
}
async function grantForPlanner(request:Request) {
  const grant=await requireAssistantGrant(request);
  if(!grant.plannerWrite || !["projects","tasks","rhythm"].every(x=>grant.domains.includes(x as typeof grant.domains[number]))) throw new AssistantAccessError("Planner grant required.");
  return grant;
}
export async function GET(request:Request) {
  try {
    const grant=await grantForPlanner(request);
    const params=new URL(request.url).searchParams;
    if([...params.keys()].some(k=>!["from","to"].includes(k))) throw new PlannerInputError("Invalid availability query.");
    const from=params.get("from")??"",to=params.get("to")??"";
    const result=await plannerAvailability(grant.userId,from,to);
    return Response.json(result,{headers});
  }catch(error){return failure(error,request.headers.has("authorization"));}
}
export async function POST(request:Request) {
  try{
    const grant=await grantForPlanner(request);
    if(!(request.headers.get("content-type")??"").startsWith("application/json")) throw new PlannerInputError("JSON required.");
    const body=recordInput(await readAssistantJson(request, 32768),["revision","replaceFrom","sessions"]);
    const result=await submitPlannerProposal(grant.userId,body);
    return Response.json(result,{headers});
  }catch(error){return failure(error,request.headers.has("authorization"));}
}
