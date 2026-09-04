import { normalizeKeychainRecordEnvelope } from "@/domain/keychain";
import { deleteStoredKeychainRecord, KeychainConflictError } from "@/server/keychain-store";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { recordId } = await context.params;
  const revision = body && typeof body === "object" ? (body as Record<string, unknown>).revision : null;
  const identityProbe = normalizeKeychainRecordEnvelope({
    id: recordId,
    version: 1,
    revision: Number.isInteger(revision) ? revision : 1,
    nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ciphertext: "AAAAAAAAAAAAAAAAAAAA",
  });
  if (!identityProbe || !Number.isInteger(revision) || Number(revision) < 1) {
    return json({ error: "Keychain record deletion is invalid." }, 400);
  }

  try {
    const user = await resolveRequestUser(request);
    await deleteStoredKeychainRecord(user.id, identityProbe.id, Number(revision));
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not delete Keychain record.");
    return json({ error: "Keychain record could not be deleted." }, 503);
  }
}
