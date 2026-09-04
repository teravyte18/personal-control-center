import { normalizeKeychainVaultEnvelope } from "@/domain/keychain";
import {
  createStoredKeychainVault,
  KeychainConflictError,
  loadKeychainVault,
  updateStoredKeychainVault,
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

async function readBody(request: Request) {
  try {
    requireKeychainJsonWrite(request);
    return await request.json() as unknown;
  } catch (error) {
    if (error instanceof KeychainRequestSecurityError) throw error;
    return null;
  }
}

function requestSecurityResponse(error: unknown) {
  return error instanceof KeychainRequestSecurityError
    ? json({ error: error.message }, error.status)
    : null;
}

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    return json({ userId: user.id, vault: await loadKeychainVault(user.id) });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    console.error("Could not load Keychain vault.");
    return json({ error: "Keychain storage is unavailable." }, 503);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    return requestSecurityResponse(error) ?? json({ error: "Request body must be valid JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Request body must be valid JSON." }, 400);
  const vault = normalizeKeychainVaultEnvelope((body as Record<string, unknown>).vault);
  if (!vault) return json({ error: "Encrypted Keychain vault envelope is invalid." }, 400);

  try {
    const user = await resolveRequestUser(request);
    const stored = await createStoredKeychainVault(user.id, vault);
    return json({ userId: user.id, vault: stored }, 201);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not create Keychain vault.");
    return json({ error: "Keychain vault could not be saved." }, 503);
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    return requestSecurityResponse(error) ?? json({ error: "Request body must be valid JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Request body must be valid JSON." }, 400);
  const candidate = body as Record<string, unknown>;
  const vault = normalizeKeychainVaultEnvelope(candidate.vault);
  const expectedRevision = candidate.expectedRevision;
  if (!vault || !Number.isInteger(expectedRevision) || Number(expectedRevision) < 1) {
    return json({ error: "Encrypted Keychain vault update is invalid." }, 400);
  }

  try {
    const user = await resolveRequestUser(request);
    const stored = await updateStoredKeychainVault(user.id, Number(expectedRevision), vault);
    return json({ userId: user.id, vault: stored });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof KeychainConflictError) return json({ error: error.message }, 409);
    console.error("Could not update Keychain vault.");
    return json({ error: "Keychain vault could not be saved." }, 503);
  }
}
