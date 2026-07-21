import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  MAX_REVIEW_PHOTO_BYTES,
  ReviewPhotoInputError,
  storeReviewPhoto,
} from "@/server/review-photo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REVIEW_PHOTO_BYTES + 1024 * 1024) {
    return Response.json({ error: "The photo must be 15 MB or smaller." }, { status: 413 });
  }

  try {
    const user = await resolveRequestUser(request);
    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      throw new ReviewPhotoInputError("Choose an image to upload.");
    }

    const stored = await storeReviewPhoto(user.id, photo);
    return Response.json({ photo: stored }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ReviewPhotoInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not store review photo.", error);
    return Response.json({ error: "The photo could not be stored." }, { status: 503 });
  }
}
