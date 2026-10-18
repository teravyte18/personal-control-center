import { syncAllConnectedSpotify, validSpotifyWorkerToken } from "@/server/spotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!validSpotifyWorkerToken(request)) return Response.json({ error: "Not authorised." }, { status: 401 });
  try {
    return Response.json(await syncAllConnectedSpotify(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Spotify polling worker failed.", error);
    return Response.json({ error: "Spotify polling failed." }, { status: 503 });
  }
}
