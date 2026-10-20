import { parseResolvedContextParams, resolvePersonalContext } from "@/domain/resolved-context";
import { RetrievalSearchInputError } from "@/domain/retrieval-search";
import { loadPersonalDataState } from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const options = parseResolvedContextParams(new URL(request.url).searchParams);
    const state = await loadPersonalDataState(user.id);
    return Response.json(resolvePersonalContext(state.snapshot, user.id, options), {
      headers: privateHeaders,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401, headers: privateHeaders });
    }
    if (error instanceof RetrievalSearchInputError) {
      return Response.json({ error: error.message }, { status: 400, headers: privateHeaders });
    }
    console.error("Could not resolve personal context.", error);
    return Response.json({ error: "Personal context resolution is unavailable." }, {
      status: 503,
      headers: privateHeaders,
    });
  }
}
