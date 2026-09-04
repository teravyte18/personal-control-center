import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("keychain database schema has no plaintext credential columns", async () => {
  const migration = await source("db/migrations/005_keychain.sql");
  for (const plaintextField of ["label", "username", "password", "url", "notes"]) {
    assert.equal(new RegExp(`\\b${plaintextField}\\b`, "i").test(migration), false);
  }
  assert.match(migration, /primary key \(user_id, record_id\)/);
  assert.match(migration, /references users\(id\) on delete cascade/);
  assert.match(migration, /ciphertext text not null/);
});

test("server keychain persistence is scoped and ciphertext-only", async () => {
  const store = await source("src/server/keychain-store.ts");
  for (const plaintextField of ["label", "username", "password", "notes"]) {
    assert.equal(new RegExp(`\\b${plaintextField}\\b`, "i").test(store), false);
  }
  assert.match(store, /where user_id = \$\{userId\}/);
  assert.match(store, /and record_id = \$\{envelope\.id\}/);
  assert.match(store, /ciphertext/);
});

test("normal personal-data snapshot remains separate from Keychain", async () => {
  const snapshot = await source("src/domain/personal-data-snapshot.ts");
  assert.equal(/keychain/i.test(snapshot), false);
});

test("Keychain endpoints and service worker enforce no-store/no-cache boundaries", async () => {
  const vaultRoute = await source("src/app/api/keychain/vault/route.ts");
  const recordRoute = await source("src/app/api/keychain/records/route.ts");
  const worker = await source("public/pcc-sw.js");
  assert.match(vaultRoute, /private, no-store/);
  assert.match(recordRoute, /private, no-store/);
  assert.match(worker, /url\.pathname === "\/keychain"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/keychain\/"\)/);
});
