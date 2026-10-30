import { assistantOperations, assistantRead, type AssistantOperation } from "@/domain/assistant-read";
import { AssistantAccessError, AssistantConflictError, AssistantInputError } from "@/domain/assistant-access";
import { RetrievalSearchInputError } from "@/domain/retrieval-search";
import { requireAssistantGrant } from "@/server/assistant-grants";
import { loadPersonalDataState } from "@/server/personal-data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function GET(request: Request, context: { params: Promise<{ operation: string }> }) {
  try {
    const grant = await requireAssistantGrant(request);
    const { operation } = await context.params;
    if (!assistantOperations.includes(operation as AssistantOperation)) throw new AssistantInputError();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== "input") || params.getAll("input").length > 1) throw new AssistantInputError();
    const raw = params.get("input") ?? "{}";
    if (raw.length > 4096) throw new AssistantInputError();
    const state = await loadPersonalDataState(grant.userId);
    const result = assistantRead(operation as AssistantOperation, JSON.parse(raw), state, grant.userId, grant.domains);
    const serialized = JSON.stringify(result);
    if (Buffer.byteLength(serialized) > 250000) return Response.json({ error: "Result exceeds size limit; narrow the query." }, { status: 413, headers });
    return new Response(serialized, { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    const status = error instanceof AssistantAccessError ? (request.headers.has("authorization") ? 403 : 401)
      : error instanceof AssistantConflictError ? 409
      : error instanceof AssistantInputError || error instanceof RetrievalSearchInputError || error instanceof SyntaxError ? 400 : 503;
    return Response.json({ error: status === 409 ? "State or filters changed; restart pagination."
      : status === 503 ? "Assistant data is unavailable." : "Assistant request was not accepted." }, { status, headers });
  }
}
