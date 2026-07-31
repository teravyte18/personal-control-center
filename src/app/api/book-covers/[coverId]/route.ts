import sharp from "sharp";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  BookCoverInputError,
  deleteBookCover,
  loadBookCover,
} from "@/server/book-cover-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COVER_VARIANT_VERSION = "display-v1";
const COVER_CACHE_CONTROL = "private, max-age=86400, stale-while-revalidate=604800";
const DISPLAY_MAX_WIDTH = 900;
const DISPLAY_MAX_HEIGHT = 1350;

type RouteContext = { params: Promise<{ coverId: string }> };

function coverEtag(coverId: string) {
  return `"${COVER_VARIANT_VERSION}-${coverId}"`;
}

function matchesEtag(request: Request, etag: string) {
  return request.headers
    .get("if-none-match")
    ?.split(",")
    .map((value) => value.trim())
    .includes(etag) ?? false;
}

async function createDisplayCover(bytes: Uint8Array, originalMimeType: string) {
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
    console.warn("Could not optimize a book cover; serving the original upload.", error);
    return { bytes, mimeType: originalMimeType };
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { coverId } = await context.params;
    const cover = await loadBookCover(user.id, coverId);
    if (!cover) return Response.json({ error: "Cover not found." }, { status: 404 });

    const etag = coverEtag(coverId);
    if (matchesEtag(request, etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": COVER_CACHE_CONTROL,
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const displayCover = await createDisplayCover(cover.bytes, cover.mimeType);
    const body = displayCover.bytes.buffer.slice(
      displayCover.bytes.byteOffset,
      displayCover.bytes.byteOffset + displayCover.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": displayCover.mimeType,
        "Content-Length": String(displayCover.bytes.byteLength),
        "Cache-Control": COVER_CACHE_CONTROL,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof BookCoverInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not load book cover.", error);
    return Response.json({ error: "The cover could not be loaded." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { coverId } = await context.params;
    await deleteBookCover(user.id, coverId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof BookCoverInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not delete book cover.", error);
    return Response.json({ error: "The cover could not be deleted." }, { status: 503 });
  }
}
