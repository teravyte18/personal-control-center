import {
  AuthenticationInputError,
  AuthenticationRequiredError,
  AuthorizationError,
  requireAuthenticatedUser,
  requireOwner,
  revokeManagedUser,
} from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (record.action !== "revoke") {
    return Response.json({ error: "Unsupported account action." }, { status: 400 });
  }

  try {
    const owner = requireOwner(await requireAuthenticatedUser(request));
    const { userId } = await context.params;
    const user = await revokeManagedUser(owner, userId);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AuthenticationInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("Could not revoke user access.", error);
    return Response.json({ error: "The account could not be revoked." }, { status: 503 });
  }
}
