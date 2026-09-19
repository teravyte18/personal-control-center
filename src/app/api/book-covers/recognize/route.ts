import {
  BookCoverInputError,
  loadBookCover,
  MAX_BOOK_COVER_BYTES,
} from "@/server/book-cover-store";
import {
  BookRecognitionError,
  recognizeBookCover,
} from "@/server/book-cover-recognition";
import {
  AuthenticationRequiredError,
  resolveRequestUser,
} from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function coverBytes(request: Request, userId: string) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const cover = form.get("cover");
    if (!(cover instanceof File)) {
      throw new BookRecognitionError("Choose a cover image first.", 400);
    }
    if (cover.size <= 0) throw new BookRecognitionError("Choose a non-empty cover image.", 400);
    if (cover.size > MAX_BOOK_COVER_BYTES) {
      throw new BookRecognitionError("The cover must be 10 MB or smaller.", 413);
    }
    return new Uint8Array(await cover.arrayBuffer());
  }

  const body = await request.json().catch(() => null) as { coverId?: unknown } | null;
  const coverId = typeof body?.coverId === "string" ? body.coverId : "";
  if (!coverId) throw new BookRecognitionError("Choose a cover image first.", 400);

  const cover = await loadBookCover(userId, coverId);
  if (!cover) throw new BookRecognitionError("Cover not found.", 404);
  return cover.bytes;
}

export async function POST(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const bytes = await coverBytes(request, user.id);
    return Response.json(await recognizeBookCover(bytes), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof BookCoverInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof BookRecognitionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not recognize book cover.", error);
    return Response.json({ error: "The cover could not be recognized right now." }, { status: 503 });
  }
}
