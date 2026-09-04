import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.PCC_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const ownerEmail = "owner@example.test";
const secondUserEmail = "second-user@example.test";
const sharedId = "11111111-1111-4111-8111-111111111111";

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
    masterWrap: { nonce: encoded(character, 32), ciphertext: encoded(character, 64) },
    recoveryWrap: { nonce: encoded(character, 32), ciphertext: encoded(character, 64) },
  };
}

function recordEnvelope(character, revision) {
  return {
    id: sharedId,
    version: 1,
    revision,
    nonce: encoded(character, 32),
    ciphertext: encoded(character, 48),
  };
}

test("Keychain rotation and encrypted restore are atomic, revision-safe, user-scoped, and same-origin guarded", async () => {
  const before = await jsonRequest("/api/keychain/vault", {}, ownerEmail);
  assert.equal(before.response.status, 200);
  assert.equal(before.body.vault.revision, 1);

  const blockedCrossOrigin = await jsonRequest("/api/keychain/rotate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://evil.example.test",
      "Sec-Fetch-Site": "cross-site",
    },
    body: JSON.stringify({
      expectedVaultRevision: 1,
      vault: vaultEnvelope("X"),
      records: [recordEnvelope("Y", 3)],
    }),
  }, ownerEmail);
  assert.equal(blockedCrossOrigin.response.status, 403);

  const blockedFormWrite = await jsonRequest("/api/keychain/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "x=1",
  }, ownerEmail);
  assert.equal(blockedFormWrite.response.status, 415);

  const afterBlockedWrite = await jsonRequest("/api/keychain/vault", {}, ownerEmail);
  assert.equal(afterBlockedWrite.body.vault.revision, 1);

  const rotated = await jsonRequest("/api/keychain/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVaultRevision: 1,
      vault: vaultEnvelope("H"),
      records: [recordEnvelope("I", 3)],
    }),
  }, ownerEmail);
  assert.equal(rotated.response.status, 200);
  assert.equal(rotated.body.vault.revision, 2);
  assert.equal(rotated.body.records.length, 1);
  assert.equal(rotated.body.records[0].revision, 3);
  assert.equal(rotated.body.records[0].ciphertext, encoded("I", 48));
  assert.match(rotated.response.headers.get("cache-control") ?? "", /no-store/);

  const staleRotation = await jsonRequest("/api/keychain/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVaultRevision: 1,
      vault: vaultEnvelope("L"),
      records: [recordEnvelope("M", 4)],
    }),
  }, ownerEmail);
  assert.equal(staleRotation.response.status, 409);

  const afterStaleVault = await jsonRequest("/api/keychain/vault", {}, ownerEmail);
  const afterStaleRecords = await jsonRequest("/api/keychain/records", {}, ownerEmail);
  assert.equal(afterStaleVault.body.vault.masterWrap.ciphertext, encoded("H", 64));
  assert.equal(afterStaleRecords.body.records[0].ciphertext, encoded("I", 48));
  assert.equal(afterStaleRecords.body.records[0].revision, 3);

  const wrongRecordSet = await jsonRequest("/api/keychain/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVaultRevision: 2, vault: vaultEnvelope("N"), records: [] }),
  }, ownerEmail);
  assert.equal(wrongRecordSet.response.status, 409);

  const restored = await jsonRequest("/api/keychain/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVaultRevision: 2,
      vault: vaultEnvelope("J"),
      records: [recordEnvelope("K", 7)],
    }),
  }, ownerEmail);
  assert.equal(restored.response.status, 200);
  assert.equal(restored.body.vault.revision, 3);
  assert.equal(restored.body.records.length, 1);
  assert.equal(restored.body.records[0].revision, 7);
  assert.equal(restored.body.records[0].ciphertext, encoded("K", 48));

  const staleRestore = await jsonRequest("/api/keychain/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVaultRevision: 2,
      vault: vaultEnvelope("P"),
      records: [recordEnvelope("Q", 8)],
    }),
  }, ownerEmail);
  assert.equal(staleRestore.response.status, 409);

  const duplicateRestore = await jsonRequest("/api/keychain/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVaultRevision: 3,
      vault: vaultEnvelope("R"),
      records: [recordEnvelope("S", 8), recordEnvelope("T", 9)],
    }),
  }, ownerEmail);
  assert.equal(duplicateRestore.response.status, 400);

  const ownerFinalVault = await jsonRequest("/api/keychain/vault", {}, ownerEmail);
  const ownerFinalRecords = await jsonRequest("/api/keychain/records", {}, ownerEmail);
  assert.equal(ownerFinalVault.body.vault.masterWrap.ciphertext, encoded("J", 64));
  assert.equal(ownerFinalRecords.body.records[0].ciphertext, encoded("K", 48));

  const secondVault = await jsonRequest("/api/keychain/vault", {}, secondUserEmail);
  const secondRecords = await jsonRequest("/api/keychain/records", {}, secondUserEmail);
  assert.equal(secondVault.body.vault.masterWrap.ciphertext, encoded("B", 64));
  assert.equal(secondRecords.body.records[0].ciphertext, encoded("E", 48));
});
