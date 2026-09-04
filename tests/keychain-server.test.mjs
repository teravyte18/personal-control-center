import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const ownerEmail = "owner@example.test";
const secondUserEmail = "second-user@example.test";

function request(path, init = {}, userEmail) {
  const headers = new Headers(init.headers);
  if (userEmail) headers.set("x-pcc-user-email", userEmail);
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

async function jsonRequest(path, init = {}, userEmail) {
  const response = await request(path, init, userEmail);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function encoded(character, length) {
  return character.repeat(length);
}

function vaultEnvelope(character) {
  return {
    version: 1,
    kdf: {
      algorithm: "argon2id13",
      salt: encoded(character, 22),
      opslimit: 3,
      memlimit: 64 * 1024 * 1024,
    },
    masterWrap: {
      nonce: encoded(character, 32),
      ciphertext: encoded(character, 64),
    },
    recoveryWrap: {
      nonce: encoded(character, 32),
      ciphertext: encoded(character, 64),
    },
  };
}

function recordEnvelope(id, character, revision = 1) {
  return {
    id,
    version: 1,
    revision,
    nonce: encoded(character, 32),
    ciphertext: encoded(character, 48),
  };
}

test("Keychain APIs require authentication and isolate ciphertext by user", async () => {
  const unauthenticated = await jsonRequest("/api/keychain/vault");
  assert.equal(unauthenticated.response.status, 401);
  assert.match(unauthenticated.response.headers.get("cache-control") ?? "", /private/);
  assert.match(unauthenticated.response.headers.get("cache-control") ?? "", /no-store/);

  const ownerInitial = await jsonRequest("/api/keychain/vault", {}, ownerEmail);
  const secondInitial = await jsonRequest("/api/keychain/vault", {}, secondUserEmail);
  assert.equal(ownerInitial.response.status, 200);
  assert.equal(secondInitial.response.status, 200);
  assert.equal(ownerInitial.body.vault, null);
  assert.equal(secondInitial.body.vault, null);
  assert.notEqual(ownerInitial.body.userId, secondInitial.body.userId);

  const ownerCreated = await jsonRequest("/api/keychain/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vault: vaultEnvelope("A") }),
  }, ownerEmail);
  const secondCreated = await jsonRequest("/api/keychain/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vault: vaultEnvelope("B") }),
  }, secondUserEmail);
  assert.equal(ownerCreated.response.status, 201);
  assert.equal(secondCreated.response.status, 201);
  assert.equal(ownerCreated.body.vault.masterWrap.ciphertext, encoded("A", 64));
  assert.equal(secondCreated.body.vault.masterWrap.ciphertext, encoded("B", 64));

  const duplicateOwner = await jsonRequest("/api/keychain/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vault: vaultEnvelope("C") }),
  }, ownerEmail);
  assert.equal(duplicateOwner.response.status, 409);

  const sharedId = "11111111-1111-4111-8111-111111111111";
  const ownerRecord = await jsonRequest("/api/keychain/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: recordEnvelope(sharedId, "D") }),
  }, ownerEmail);
  const secondRecord = await jsonRequest("/api/keychain/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: recordEnvelope(sharedId, "E") }),
  }, secondUserEmail);
  assert.equal(ownerRecord.response.status, 201);
  assert.equal(secondRecord.response.status, 201);

  const ownerRecords = await jsonRequest("/api/keychain/records", {}, ownerEmail);
  const secondRecords = await jsonRequest("/api/keychain/records", {}, secondUserEmail);
  assert.equal(ownerRecords.response.status, 200);
  assert.equal(secondRecords.response.status, 200);
  assert.equal(ownerRecords.body.records.length, 1);
  assert.equal(secondRecords.body.records.length, 1);
  assert.equal(ownerRecords.body.records[0].ciphertext, encoded("D", 48));
  assert.equal(secondRecords.body.records[0].ciphertext, encoded("E", 48));
  assert.match(ownerRecords.response.headers.get("cache-control") ?? "", /private/);
  assert.match(ownerRecords.response.headers.get("cache-control") ?? "", /no-store/);

  const ownerUpdated = await jsonRequest("/api/keychain/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: recordEnvelope(sharedId, "F", 2) }),
  }, ownerEmail);
  assert.equal(ownerUpdated.response.status, 200);
  assert.equal(ownerUpdated.body.record.revision, 2);

  const staleOwnerUpdate = await jsonRequest("/api/keychain/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: recordEnvelope(sharedId, "G", 2) }),
  }, ownerEmail);
  assert.equal(staleOwnerUpdate.response.status, 409);

  const wrongUserDelete = await jsonRequest(`/api/keychain/records/${sharedId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 2 }),
  }, secondUserEmail);
  assert.equal(wrongUserDelete.response.status, 409);

  const secondStillExists = await jsonRequest("/api/keychain/records", {}, secondUserEmail);
  assert.equal(secondStillExists.body.records.length, 1);
  assert.equal(secondStillExists.body.records[0].ciphertext, encoded("E", 48));

  const ownerExport = await jsonRequest("/api/personal-data/export", {}, ownerEmail);
  assert.equal(ownerExport.response.status, 200);
  const serializedExport = JSON.stringify(ownerExport.body);
  assert.equal(serializedExport.includes(encoded("A", 64)), false);
  assert.equal(serializedExport.includes(encoded("F", 48)), false);
  assert.equal(serializedExport.toLowerCase().includes("keychain"), false);
});
