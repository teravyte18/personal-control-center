import {
  normalizeKeychainRecordEnvelope,
  normalizeKeychainVaultEnvelope,
  type KeychainRecordEnvelope,
} from "@/domain/keychain";
import { rotateStoredKeychain } from "@/server/keychain-hardening-store";
import { KeychainConflictError } from "@/server/keychain-store";
import {
  KeychainRequestSecurityError,
  requireKeychainJsonWrite,
} from "@/server/keychain-request-security";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };
const MAX_RECORDS = 10_000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

function normalizeRecords(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_RECORDS) return null;
  const ids = new Set<string>();
  const records: KeychainRecordEnvelope[] = [];
  for (const candidate of value) {
    const record = normalizeKeychainRecordEnvelope(candidate);
    if (!record || ids.has(record.id)) return null;
    ids.add(record.id);
    records.push(record);
  }
  return records;
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
  if (!body || typeof body !== "object") return json({ error: "Encrypted Keychain rotation is invalid." }, 400);
  const candidate = body as Record<string, unknown>;
  const expectedVaultRevision = candidate.expectedVaultRevision;
  const vault = normalizeKeychainVaultEnvelope(candidate.vault);
  const records = normalizeRecords(candidate.records);
  if (!Number.isInteger(expectedVaultRevision) || Number(expectedVaultRevision) < 1 || !vault || !records) {
    return json({ error: "Encrypted Keychain rotation is invalid." }, 400);
  }

  try {
    const user = await resolveRequestUser(request);
    const rotated = await rotateStoredKeychain(user.id, Number(expectedVaultRevision), vault, records);
    return json({ userId: user.id, ...rotated });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not rotate encrypted Keychain.");
    return json({ error: "Encrypted Keychain rotation could not be saved." }, 503);
  }
}
