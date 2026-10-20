import { configureMusicArchive, enrichMusicGenres, musicArchiveStatus, MusicArchiveInputError, syncMusicArchive } from "@/server/music-archive";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import { LastFmTagLookupError } from "@/domain/music-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return Response.json(await musicArchiveStatus(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    console.error("Music archive status failed.", error);
    return Response.json({ error: "Could not load archive settings." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const body = await request.json() as { action?: string; playlist?: string; threshold?: number; enabled?: boolean };
    if (body.action === "configure") {
      const status = await configureMusicArchive(user.id, body);
      return Response.json(status, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "sync") {
      const added = await syncMusicArchive(user.id, true);
      return Response.json({ ...(await musicArchiveStatus(user.id)), added });
    }
    if (body.action === "enrich") {
      const result = await enrichMusicGenres(user.id, 25);
      return Response.json({ ...(await musicArchiveStatus(user.id)), processed: result.processed });
    }
    return Response.json({ error: "Invalid archive action." }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof MusicArchiveInputError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof LastFmTagLookupError) {
      console.error("Last.fm genre enrichment failed:", error.message);
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("Music archive operation failed.", error);
    return Response.json({ error: "Archive operation failed. Check connection and archive status." }, { status: 503 });
  }
}
