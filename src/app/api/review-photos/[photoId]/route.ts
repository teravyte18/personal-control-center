import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  deleteReviewPhoto,
  loadReviewPhoto,
  ReviewPhotoInputError,
} from "@/server/review-photo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ photoId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { photoId } = await context.params;
    const photo = await loadReviewPhoto(user.id, photoId);
    if (!photo) {
      return Response.json({ error: "Photo not found." }, { status: 404 });
    }

    const body = photo.bytes.buffer.slice(
      photo.bytes.byteOffset,
      photo.bytes.byteOffset + photo.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(photo.bytes.byteLength),
        "Cache-Control": "private, no-store",
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
