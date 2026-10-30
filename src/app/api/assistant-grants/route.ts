import { requireAuthenticatedUser, AuthenticationRequiredError } from "@/server/auth";
import { createAssistantGrant, listAssistantGrants, revokeAssistantGrant } from "@/server/assistant-grants";
import { AssistantAccessError, AssistantInputError, readAssistantJson, recordInput, requireSameOrigin } from "@/domain/assistant-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
function failure(error: unknown) {
  const status = error instanceof AuthenticationRequiredError ? 401
    : error instanceof AssistantAccessError ? 403
    : error instanceof AssistantInputError || error instanceof SyntaxError ? 400 : 503;
  return Response.json({ error: status === 503 ? "Assistant connections are unavailable." : "Connection request was not accepted." }, { status, headers });
}
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    return Response.json({ grants: await listAssistantGrants(user.id) }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireSameOrigin(request, process.env.PCC_PUBLIC_URL);
    const body = recordInput(await readAssistantJson(request), ["label", "domains", "days"]);
    return Response.json(await createAssistantGrant(user.id, body.label, body.domains, body.days), { status: 201, headers });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    requireSameOrigin(request, process.env.PCC_PUBLIC_URL);
    const body = recordInput(await readAssistantJson(request), ["id"]);
    await revokeAssistantGrant(user.id, body.id);
    return new Response(null, { status: 204, headers });
  } catch (error) { return failure(error); }
}
