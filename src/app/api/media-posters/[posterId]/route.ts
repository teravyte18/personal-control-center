import sharp from "sharp";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  deleteMediaPoster,
  loadMediaPoster,
  MediaPosterInputError,
} from "@/server/media-poster-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSTER_VARIANT_VERSION = "display-v1";
const POSTER_CACHE_CONTROL = "private, max-age=86400, stale-while-revalidate=604800";
const DISPLAY_MAX_WIDTH = 900;
const DISPLAY_MAX_HEIGHT = 1350;

type RouteContext = { params: Promise<{ posterId: string }> };

function posterEtag(posterId: string) {
  return `"${POSTER_VARIANT_VERSION}-${posterId}"`;
}

function matchesEtag(request: Request, etag: string) {
  return request.headers
    .get("if-none-match")
    ?.split(",")
    .map((value) => value.trim())
    .includes(etag) ?? false;
}

async function createDisplayPoster(bytes: Uint8Array, originalMimeType: string) {
  try {
    const optimized = await sharp(bytes, { animated: false, failOn: "none" })
      .rotate()
      .resize({
        width: DISPLAY_MAX_WIDTH,
        height: DISPLAY_MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();

    return { bytes: new Uint8Array(optimized), mimeType: "image/webp" };
  } catch (error) {
    console.warn("Could not optimize a media poster; serving the original upload.", error);
    return { bytes, mimeType: originalMimeType };
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { posterId } = await context.params;
    const poster = await loadMediaPoster(user.id, posterId);
    if (!poster) return Response.json({ error: "Poster not found." }, { status: 404 });

    const etag = posterEtag(posterId);
    if (matchesEtag(request, etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": POSTER_CACHE_CONTROL,
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const displayPoster = await createDisplayPoster(poster.bytes, poster.mimeType);
    const body = displayPoster.bytes.buffer.slice(
      displayPoster.bytes.byteOffset,
      displayPoster.bytes.byteOffset + displayPoster.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": displayPoster.mimeType,
        "Content-Length": String(displayPoster.bytes.byteLength),
        "Cache-Control": POSTER_CACHE_CONTROL,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof MediaPosterInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not load media poster.", error);
    return Response.json({ error: "The poster could not be loaded." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { posterId } = await context.params;
    await deleteMediaPoster(user.id, posterId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof MediaPosterInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not delete media poster.", error);
    return Response.json({ error: "The poster could not be deleted." }, { status: 503 });
  }
}
