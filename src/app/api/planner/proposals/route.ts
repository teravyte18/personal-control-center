import { AssistantAccessError, requireSameOrigin } from "@/domain/assistant-access";
import { decidePlannerProposal, listPlannerProposals, PlannerInputError } from "@/server/assistant-planner";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"private, no-store"};
function failure(error: unknown) {
  const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AssistantAccessError ? 403
    : error instanceof PlannerInputError || error instanceof SyntaxError ? 400 : 503;
  return Response.json({error:status===401?"Authentication required.":status===403?"Request origin denied.":status===400?error instanceof Error?error.message:"Invalid draft.":"Planner drafts unavailable."},{status,headers});
}
export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return Response.json({proposals:await listPlannerProposals(user.id)},{headers});
  } catch(error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    requireSameOrigin(request,process.env.PCC_PUBLIC_URL);
    const raw = await request.text();
    if (raw.length > 1000) throw new PlannerInputError("Request too large.");
    const body = JSON.parse(raw) as {id?:unknown;decision?:unknown};
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key=>!["id","decision"].includes(key))) throw new PlannerInputError("Invalid draft decision.");
    return Response.json(await decidePlannerProposal(user.id,body.id,body.decision),{headers});
  } catch(error) { return failure(error); }
}
