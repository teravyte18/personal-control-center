import assert from "node:assert/strict";
import test from "node:test";
import {
  createKeychainVault,
  decryptKeychainRecord,
  encryptKeychainRecord,
  KeychainDecryptionError,
  unlockKeychainWithMasterPassword,
  unlockKeychainWithRecoveryKey,
} from "../src/lib/keychain-crypto.ts";

const userA = "keychain-user-a";
const userB = "keychain-user-b";
const masterPassword = "violet train coffee mountain";
const recordId = "11111111-1111-4111-8111-111111111111";
const otherRecordId = "22222222-2222-4222-8222-222222222222";

function mutateBase64Url(value: string) {
  const replacement = value[0] === "A" ? "B" : "A";
  return replacement + value.slice(1);
}

test("master password and recovery key unwrap the same random vault key", async () => {
  const created = await createKeychainVault(userA, masterPassword);
  const unlocked = await unlockKeychainWithMasterPassword(userA, created.envelope, masterPassword);
  const recovered = await unlockKeychainWithRecoveryKey(userA, created.envelope, created.recoveryKey);
  assert.deepEqual(unlocked, created.vaultKey);
  assert.deepEqual(recovered, created.vaultKey);

  await assert.rejects(
    unlockKeychainWithMasterPassword(userA, created.envelope, "wrong passphrase with enough length"),
    KeychainDecryptionError,
  );
  await assert.rejects(
    unlockKeychainWithRecoveryKey(userA, created.envelope, mutateBase64Url(created.recoveryKey)),
    KeychainDecryptionError,
  );
});

test("vault wrapping is bound to the authenticated user", async () => {
  const created = await createKeychainVault(userA, masterPassword);
  await assert.rejects(
    unlockKeychainWithMasterPassword(userB, created.envelope, masterPassword),
    KeychainDecryptionError,
  );
});

test("records round-trip and fail closed after tampering or envelope swapping", async () => {
  const created = await createKeychainVault(userA, masterPassword);
  const plaintext = {
    label: "Example account",
    username: "person@example.test",
    password: "generated-secret-value",
    url: "https://example.test",
    notes: "Private note",
  };
  const encrypted = await encryptKeychainRecord(userA, recordId, 1, created.vaultKey, plaintext);
  assert.deepEqual(await decryptKeychainRecord(userA, encrypted, created.vaultKey), plaintext);
  assert.equal(JSON.stringify(encrypted).includes(plaintext.label), false);
  assert.equal(JSON.stringify(encrypted).includes(plaintext.password), false);

  await assert.rejects(
    decryptKeychainRecord(userA, { ...encrypted, ciphertext: mutateBase64Url(encrypted.ciphertext) }, created.vaultKey),
    KeychainDecryptionError,
  );
  await assert.rejects(
    decryptKeychainRecord(userA, { ...encrypted, id: otherRecordId }, created.vaultKey),
    KeychainDecryptionError,
  );
  await assert.rejects(
    decryptKeychainRecord(userA, { ...encrypted, revision: 2 }, created.vaultKey),
    KeychainDecryptionError,
  );
  await assert.rejects(
    decryptKeychainRecord(userB, encrypted, created.vaultKey),
    KeychainDecryptionError,
  );
});

test("master passwords use a length rule rather than composition rules", async () => {
  await assert.rejects(createKeychainVault(userA, "short words"), /at least 12 characters/);
  await assert.doesNotReject(createKeychainVault(userA, "all lowercase words are allowed"));
});
