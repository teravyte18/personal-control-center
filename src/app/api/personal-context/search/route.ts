import { buildRetrievalDocuments } from "@/domain/retrieval-documents";
import {
  parseRetrievalSearchParams,
  RetrievalSearchInputError,
  searchRetrievalDocuments,
} from "@/domain/retrieval-search";
import { loadPersonalDataState } from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    // Never accept a user ID from query parameters. Both canonical snapshot
    // access and retrieval document IDs derive from this authenticated user.
    const user = await resolveRequestUser(request);
    const options = parseRetrievalSearchParams(new URL(request.url).searchParams);
    const state = await loadPersonalDataState(user.id);
    const documents = buildRetrievalDocuments(state.snapshot, user.id);
    const result = searchRetrievalDocuments(documents, user.id, options);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401, headers: privateHeaders });
    }
    if (error instanceof RetrievalSearchInputError) {
      return Response.json({ error: error.message }, { status: 400, headers: privateHeaders });
    }
    console.error("Personal retrieval search failed.", error);
    return Response.json({ error: "Personal search is currently unavailable." }, {
      status: 503,
      headers: privateHeaders,
    });
  }
}
