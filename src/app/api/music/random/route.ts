import { randomArchivedSong } from "@/server/music-random";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const exclude = new URL(request.url).searchParams.get("exclude");
    const song = await randomArchivedSong(user.id, exclude);
    return Response.json({ song, minimumPlays: 5 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Music random song lookup failed.", error);
    return Response.json({ error: "Could not pick a random song." }, { status: 503 });
  }
}
