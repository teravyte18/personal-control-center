import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  BookCoverInputError,
  MAX_BOOK_COVER_BYTES,
  storeBookCover,
} from "@/server/book-cover-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BOOK_COVER_BYTES + 1024 * 1024) {
    return Response.json({ error: "The cover must be 10 MB or smaller." }, { status: 413 });
  }

  try {
    const user = await resolveRequestUser(request);
    const form = await request.formData();
    const cover = form.get("cover");
    if (!(cover instanceof File)) throw new BookCoverInputError("Choose an image to upload.");

    const stored = await storeBookCover(user.id, cover);
    return Response.json({ cover: stored }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return Response.json({ error: error.message }, { status: 401 });
    if (error instanceof BookCoverInputError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Could not store book cover.", error);
    return Response.json({ error: "The cover could not be stored." }, { status: 503 });
  }
}
