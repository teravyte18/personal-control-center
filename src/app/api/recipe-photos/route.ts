import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  MAX_RECIPE_PHOTO_BYTES,
  RecipePhotoInputError,
  storeRecipePhoto,
} from "@/server/recipe-photo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_RECIPE_PHOTO_BYTES + 1024 * 1024) {
    return Response.json({ error: "The photo must be 10 MB or smaller." }, { status: 413 });
  }

  try {
    const user = await resolveRequestUser(request);
    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File)) throw new RecipePhotoInputError("Choose an image to upload.");

    const stored = await storeRecipePhoto(user.id, photo);
    return Response.json({ photo: stored }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof RecipePhotoInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not store recipe photo.", error);
    return Response.json({ error: "The photo could not be stored." }, { status: 503 });
  }
}
