import {
  buildPersonalContext,
  parsePersonalContextDomains,
  parsePersonalContextPurpose,
} from "@/domain/personal-context";
import { loadPersonalDataState } from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const url = new URL(request.url);
    const rawDomains = (url.searchParams.get("domains") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const domains = parsePersonalContextDomains(rawDomains);
    const purpose = parsePersonalContextPurpose(url.searchParams.get("purpose"));

    if (!domains) {
      return Response.json(
        { error: "Select one or more supported context domains." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!purpose) {
      return Response.json(
        { error: "Unsupported context purpose." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const state = await loadPersonalDataState(user.id);
    const context = buildPersonalContext(state.snapshot, { domains, purpose });
    return Response.json(context, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not build personal context.", error);
    return Response.json(
      { error: "Personal context is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
