import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Keychain UI does not persist decrypted vault state in browser storage", async () => {
  const page = await source("src/app/keychain/page.tsx");
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB"]) {
    assert.equal(page.includes(forbidden), false, `${forbidden} must not be used by the Keychain page`);
  }
  assert.match(page, /clearKeychainKey\(activeKeyRef\.current\)/);
  assert.match(page, /pagehide/);
  assert.match(page, /beforeunload/);
});

test("Keychain client API accepts encrypted envelopes rather than plaintext credential fields", async () => {
  const client = await source("src/lib/keychain-client.ts");
  for (const forbidden of ["masterPassword", "recoveryKey", "KeychainPlainRecord"]) {
    assert.equal(client.includes(forbidden), false, `${forbidden} must not enter the remote API client`);
  }
  assert.match(client, /KeychainRecordEnvelope/);
  assert.match(client, /KeychainVaultEnvelope/);
  assert.match(client, /cache: "no-store"/);
});

test("Keychain lock and reveal intervals stay fixed in the UI boundary", async () => {
  const page = await source("src/app/keychain/page.tsx");
  assert.match(page, /15 \* 60 \* 1000/);
  assert.match(page, /5 \* 60 \* 1000/);
  assert.match(page, /30 \* 1000/);
});
