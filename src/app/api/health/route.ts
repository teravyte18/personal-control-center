import { loadPersonalDataState } from "@/server/personal-data-store";
import { resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const state = await loadPersonalDataState(user.id);
    return Response.json({
      status: "ok",
      database: "ok",
      revision: state.revision,
      updatedAt: state.updatedAt,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Health check failed.", error);
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
