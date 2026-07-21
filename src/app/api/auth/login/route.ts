import {
  AuthenticationInputError,
  AuthenticationRequiredError,
  login,
} from "@/server/auth";

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
    const user = await login(record.email, record.password);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: "Email or password is incorrect, or the account is not active." }, { status: 401 });
    }

    console.error("Login failed.", error);
    return Response.json({ error: "Login is temporarily unavailable." }, { status: 503 });
  }
}
