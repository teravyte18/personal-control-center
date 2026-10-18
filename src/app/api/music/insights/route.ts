import { getMusicInsights } from "@/server/music-insights";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const search = new URL(request.url).searchParams;
    const data = await getMusicInsights(user.id, search.get("mode"), search.get("period"), search.get("tz"));
    if (!data) return Response.json({ error: "Invalid music period or time zone." }, { status: 400 });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Music insights query failed.", error);
    return Response.json({ error: "Music insights could not be loaded." }, { status: 503 });
  }
}
