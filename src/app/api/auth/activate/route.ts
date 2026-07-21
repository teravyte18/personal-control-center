import { activateInvite, AuthenticationInputError } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  try {
    const user = await activateInvite(record.token, record.password);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Account activation failed.", error);
    return Response.json({ error: "Account activation is temporarily unavailable." }, { status: 503 });
  }
}
