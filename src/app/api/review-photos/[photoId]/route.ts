import sharp from "sharp";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  deleteReviewPhoto,
  loadReviewPhoto,
  ReviewPhotoInputError,
} from "@/server/review-photo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO_VARIANT_VERSION = "history-v1";
const PHOTO_CACHE_CONTROL = "private, max-age=86400, stale-while-revalidate=604800";
const DISPLAY_MAX_WIDTH = 1280;
const DISPLAY_MAX_HEIGHT = 1280;

type RouteContext = { params: Promise<{ photoId: string }> };

function photoEtag(photoId: string) {
  return `"${PHOTO_VARIANT_VERSION}-${photoId}"`;
}

function matchesEtag(request: Request, etag: string) {
  return request.headers
    .get("if-none-match")
    ?.split(",")
    .map((value) => value.trim())
    .includes(etag) ?? false;
}

async function createDisplayPhoto(bytes: Uint8Array, originalMimeType: string) {
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

    return {
      bytes: new Uint8Array(optimized),
      mimeType: "image/webp",
    };
  } catch (error) {
    console.warn("Could not optimize a review photo; serving the original upload.", error);
    return { bytes, mimeType: originalMimeType };
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { photoId } = await context.params;
    const photo = await loadReviewPhoto(user.id, photoId);
    if (!photo) {
      return Response.json({ error: "Photo not found." }, { status: 404 });
    }

    const etag = photoEtag(photoId);
    if (matchesEtag(request, etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": PHOTO_CACHE_CONTROL,
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const displayPhoto = await createDisplayPhoto(photo.bytes, photo.mimeType);
    const body = displayPhoto.bytes.buffer.slice(
      displayPhoto.bytes.byteOffset,
      displayPhoto.bytes.byteOffset + displayPhoto.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": displayPhoto.mimeType,
        "Content-Length": String(displayPhoto.bytes.byteLength),
        "Cache-Control": PHOTO_CACHE_CONTROL,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ReviewPhotoInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not load review photo.", error);
    return Response.json({ error: "The photo could not be loaded." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { photoId } = await context.params;
    await deleteReviewPhoto(user.id, photoId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ReviewPhotoInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not delete review photo.", error);
    return Response.json({ error: "The photo could not be deleted." }, { status: 503 });
  }
}
