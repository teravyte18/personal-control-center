import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  clearKeychainKey,
  createKeychainVault,
  decryptKeychainRecord,
  encryptKeychainRecord,
  KeychainDecryptionError,
  unlockKeychainWithRecoveryKey,
} from "../src/lib/keychain-crypto.ts";
import {
  buildKeychainEncryptedExport,
  parseKeychainEncryptedExport,
  serializeKeychainEncryptedExport,
  validateKeychainEncryptedExport,
} from "../src/lib/keychain-export.ts";

const userId = "stage3-keychain-user";
const masterPassword = "violet train coffee mountain";
const recordId = "33333333-3333-4333-8333-333333333333";
const plaintext = {
  label: "Synthetic Stage 3 account",
  username: "stage3@example.test",
  password: "synthetic-stage3-secret",
  url: "https://example.test/stage3",
  notes: "Synthetic test fixture only",
};

test("encrypted Keychain export round-trips without plaintext and validates locally", async () => {
  const created = await createKeychainVault(userId, masterPassword);
  try {
    const record = await encryptKeychainRecord(userId, recordId, 1, created.vaultKey, plaintext);
    const exported = buildKeychainEncryptedExport(userId, created.envelope, [record], "2026-09-04T12:00:00.000Z");
    const serialized = serializeKeychainEncryptedExport(exported);

    assert.equal(serialized.includes(plaintext.label), false);
    assert.equal(serialized.includes(plaintext.username), false);
    assert.equal(serialized.includes(plaintext.password), false);
    assert.equal(serialized.includes(plaintext.notes), false);

    const parsed = parseKeychainEncryptedExport(serialized, userId);
    assert.equal(parsed.records.length, 1);
    await assert.doesNotReject(validateKeychainEncryptedExport(parsed, masterPassword));
    await assert.rejects(validateKeychainEncryptedExport(parsed, "wrong but sufficiently long password"), KeychainDecryptionError);
    assert.throws(() => parseKeychainEncryptedExport(serialized, "different-user"), /different PCC user/);

    const duplicate = JSON.stringify({ ...exported, records: [record, record] });
    assert.throws(() => parseKeychainEncryptedExport(duplicate, userId), /invalid or duplicate/);
  } finally {
    clearKeychainKey(created.vaultKey);
  }
});

test("vault-key rotation changes both the data key and recovery key while preserving plaintext", async () => {
  const oldVault = await createKeychainVault(userId, masterPassword);
  const newVault = await createKeychainVault(userId, masterPassword);
  try {
    assert.notDeepEqual(newVault.vaultKey, oldVault.vaultKey);
    assert.notEqual(newVault.recoveryKey, oldVault.recoveryKey);

    const oldRecord = await encryptKeychainRecord(userId, recordId, 1, oldVault.vaultKey, plaintext);
    const rotatedRecord = await encryptKeychainRecord(userId, recordId, 2, newVault.vaultKey, plaintext);
    assert.deepEqual(await decryptKeychainRecord(userId, rotatedRecord, newVault.vaultKey), plaintext);
    await assert.rejects(decryptKeychainRecord(userId, rotatedRecord, oldVault.vaultKey), KeychainDecryptionError);
    await assert.rejects(unlockKeychainWithRecoveryKey(userId, newVault.envelope, oldVault.recoveryKey), KeychainDecryptionError);
    const recoveredNew = await unlockKeychainWithRecoveryKey(userId, newVault.envelope, newVault.recoveryKey);
    try {
      assert.deepEqual(recoveredNew, newVault.vaultKey);
    } finally {
      clearKeychainKey(recoveredNew);
    }
    assert.notEqual(oldRecord.ciphertext, rotatedRecord.ciphertext);
  } finally {
    clearKeychainKey(oldVault.vaultKey);
    clearKeychainKey(newVault.vaultKey);
  }
});

test("Keychain Stage 3 UI keeps decrypted content out of persistence and raw HTML sinks", async () => {
  const page = await readFile(new URL("../src/app/keychain/page.tsx", import.meta.url), "utf8");
  const tools = await readFile(new URL("../src/components/keychain-hardening-tools.tsx", import.meta.url), "utf8");
  const combined = `${page}\n${tools}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "dangerouslySetInnerHTML", "<script"]) {
    assert.equal(combined.includes(forbidden), false, `${forbidden} must not be used by the Keychain UI`);
  }
  assert.match(tools, /validateKeychainEncryptedExport/);
  assert.match(tools, /rotateRemoteKeychain/);
  assert.match(tools, /restoreRemoteKeychain/);
});

test("Keychain route security headers restrict remote content and framing", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /default-src 'self'/);
  assert.match(config, /connect-src 'self'/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /no-referrer/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /private, no-store/);
});
