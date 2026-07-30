import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";
import {
  BookCoverInputError,
  deleteBookCover,
  loadBookCover,
} from "@/server/book-cover-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ coverId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await resolveRequestUser(request);
    const { coverId } = await context.params;
    const cover = await loadBookCover(user.id, coverId);
    if (!cover) return Response.json({ error: "Cover not found." }, { status: 404 });

    const body = cover.bytes.buffer.slice(
      cover.bytes.byteOffset,
      cover.bytes.byteOffset + cover.bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Content-Type": cover.mimeType,
        "Content-Length": String(cover.bytes.byteLength),
        "Cache-Control": "private, no-store",
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
