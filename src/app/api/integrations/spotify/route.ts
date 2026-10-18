import { disconnectSpotify, spotifyStatus, syncSpotify } from "@/server/spotify";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return Response.json(await spotifyStatus(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    console.error("Spotify status failed.", error);
    return Response.json({ error: "Could not load Spotify status." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const inserted = await syncSpotify(user.id);
    return Response.json({ ...(await spotifyStatus(user.id)), inserted });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    console.error("Spotify poll failed.", error);
    return Response.json({ error: "Spotify poll failed. Check Music status." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    await disconnectSpotify(user.id);
    return Response.json(await spotifyStatus(user.id));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    console.error("Spotify disconnect failed.", error);
    return Response.json({ error: "Could not disconnect Spotify." }, { status: 503 });
  }
}
