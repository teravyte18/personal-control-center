import { loadPersonalDataState } from "@/server/personal-data-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const state = await loadPersonalDataState(user.id);
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Could not load personal data.", error);
    return Response.json(
      { error: "Personal data storage is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
