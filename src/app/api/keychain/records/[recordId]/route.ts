import { normalizeKeychainRecordId } from "@/domain/keychain";
import { deleteStoredKeychainRecord, KeychainConflictError } from "@/server/keychain-store";
import {
  KeychainRequestSecurityError,
  requireKeychainJsonWrite,
} from "@/server/keychain-request-security";
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
  try {
    requireKeychainJsonWrite(request);
  } catch (error) {
    if (error instanceof KeychainRequestSecurityError) return json({ error: error.message }, error.status);
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { recordId } = await context.params;
  const id = normalizeKeychainRecordId(recordId);
  const revision = body && typeof body === "object" ? (body as Record<string, unknown>).revision : null;
  if (!id || !Number.isInteger(revision) || Number(revision) < 1) {
    return json({ error: "Keychain record deletion is invalid." }, 400);
  }

  try {
    const user = await resolveRequestUser(request);
    await deleteStoredKeychainRecord(user.id, id, Number(revision));
    return new Response(null, { status: 204, headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not delete Keychain record.");
    return json({ error: "Keychain record could not be deleted." }, 503);
  }
}
