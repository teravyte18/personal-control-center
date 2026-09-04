import { normalizeKeychainRecordEnvelope } from "@/domain/keychain";
import {
  KeychainConflictError,
  listStoredKeychainRecords,
  saveStoredKeychainRecord,
} from "@/server/keychain-store";
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

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return json({ records: await listStoredKeychainRecords(user.id) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    console.error("Could not load Keychain records.");
    return json({ error: "Keychain storage is unavailable." }, 503);
  }
}

export async function POST(request: Request) {
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

  if (!body || typeof body !== "object") return json({ error: "Encrypted Keychain record is invalid." }, 400);
  const record = normalizeKeychainRecordEnvelope((body as Record<string, unknown>).record);
  if (!record) return json({ error: "Encrypted Keychain record is invalid." }, 400);

  try {
    const user = await resolveRequestUser(request);
    const stored = await saveStoredKeychainRecord(user.id, record);
    return json({ record: stored }, record.revision === 1 ? 201 : 200);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not save Keychain record.");
    return json({ error: "Keychain record could not be saved." }, 503);
  }
}
