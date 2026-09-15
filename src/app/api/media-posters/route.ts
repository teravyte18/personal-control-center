import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  MAX_MEDIA_POSTER_BYTES,
  MediaPosterInputError,
  storeMediaPoster,
} from "@/server/media-poster-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_POSTER_BYTES + 1024 * 1024) {
    return Response.json({ error: "The poster must be 10 MB or smaller." }, { status: 413 });
  }

  try {
    const user = await resolveRequestUser(request);
    const form = await request.formData();
    const poster = form.get("poster");
    if (!(poster instanceof File)) throw new MediaPosterInputError("Choose an image to upload.");

    const stored = await storeMediaPoster(user.id, poster);
    return Response.json({ poster: stored }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof MediaPosterInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not store media poster.", error);
    return Response.json({ error: "The poster could not be stored." }, { status: 503 });
  }
}
