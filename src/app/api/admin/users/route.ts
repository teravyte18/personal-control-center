import {
  AuthenticationConflictError,
  AuthenticationInputError,
  AuthenticationRequiredError,
  AuthorizationError,
  createUserInvite,
  listManagedUsers,
  requireAuthenticatedUser,
  requireOwner,
} from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof AuthenticationInputError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof AuthenticationConflictError) {
    return Response.json({ error: error.message }, { status: 409 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const owner = requireOwner(await requireAuthenticatedUser(request));
    const users = await listManagedUsers(owner);
    return Response.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("Could not list managed users.", error);
    return Response.json({ error: "Account management is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  try {
    const owner = requireOwner(await requireAuthenticatedUser(request));
    const invitation = await createUserInvite(owner, record.email);
    const publicBaseUrl = process.env.PCC_PUBLIC_URL?.trim() || request.url;
    const activationUrl = new URL("/activate", publicBaseUrl);
    activationUrl.searchParams.set("token", invitation.token);

    return Response.json({
      user: invitation.user,
      activationUrl: activationUrl.toString(),
      expiresAt: invitation.expiresAt,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = authError(error);
    if (response) return response;
    console.error("Could not create user invitation.", error);
    return Response.json({ error: "The invitation could not be created." }, { status: 503 });
  }
}
