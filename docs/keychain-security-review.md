# Keychain Stage 3 Security Review

## Status

**Implementation-side Stage 3 gate: pass, subject to normal green CI before merge.**

This is an adversarial implementation review, not an independent professional security audit. The implementation author/agent cannot self-certify that separate requirement. The owner has explicitly chosen to use the Keychain without an in-app experimental warning; the caveat remains documented here instead of adding permanent UI clutter.

The Keychain is intended to substantially reduce exposure from database, backup, Raspberry Pi storage, cross-user, and opportunistic/automated attacks. It is not presented as equivalent to a mature independently audited password manager.

## Evidence

### Dependency and supply chain

- Browser cryptography remains on the reviewed `libsodium-wrappers-sumo` / `libsodium-sumo` 0.8.4 pair.
- A deterministic CI check verifies the expected crypto package versions and lockfile integrity metadata.
- Production dependencies are checked with `npm audit --omit=dev --audit-level=high` on every PR.
- Stage 3 upgraded Next.js to 16.3.4 and pinned the affected legacy `nanoid` line to 3.3.18 after the audit gate exposed advisories.
- Native install-script permissions remain explicit rather than broad.

### Browser-delivered boundary

The Keychain route receives dedicated headers including:

- `Cache-Control: private, no-store`;
- a route-specific Content Security Policy that restricts network/script/style/image/font sources to the application origin, blocks objects, and blocks framing;
- `Referrer-Policy: no-referrer`;
- restrictive permissions policy and framing headers.

The unlocked route has no third-party scripts or remote assets. The shared PCC root layout still contains a static inline theme bootstrap script, so the CSP currently permits inline script execution rather than using a nonce/hash-only policy. That is a known residual risk, documented rather than hidden.

All Keychain mutation endpoints additionally require JSON writes and reject mismatched `Origin` or non-`same-origin` browser fetch metadata. This adds an explicit write boundary on top of the normal SameSite session cookie and browser CORS behavior.

### Plaintext boundary

Automated source and crypto tests verify that:

- decrypted record fields are not written to localStorage, sessionStorage, IndexedDB, logs, URLs, or the service worker;
- encrypted exports contain only versioned vault/record envelopes and no decrypted label, username, password, URL, or notes;
- the master passphrase, derived KEK, recovery key, and decrypted vault key remain client-side;
- normal PCC personal-data export/import continues to exclude Keychain content.

### Encrypted export and restore

Stage 3 adds a dedicated versioned encrypted Keychain export. Before restore, the browser parses the file, checks user binding/record structure, and proves it can decrypt the export with the supplied master passphrase. The server receives only the already-encrypted vault and record envelopes.

Restore is committed in one PostgreSQL transaction and uses an expected vault revision, preventing stale or partially applied restore state.

### Vault-key rotation

Vault-key rotation:

1. verifies the current master passphrase locally;
2. generates a fresh random vault data-encryption key and fresh recovery key locally;
3. re-encrypts every decrypted credential in the browser;
4. requires confirmation of the new recovery key;
5. atomically swaps the complete encrypted vault/record set on the server.

Tests cover changed data/recovery keys, preservation of plaintext under the new key, rejection by the old key/recovery key, stale revision conflicts, mismatched record sets, and transaction rollback behavior.

### Backup and restore

The production-stack CI job creates a normal PostgreSQL backup containing synthetic Keychain ciphertext, restores that dump into a separate temporary database, and verifies the expected vault and record ciphertext/revisions survived the restore. No plaintext fixture is inserted into the Keychain database tables.

This validates that the existing local/R2 backup design remains sufficient for Keychain disaster recovery without adding a server-side decryption path.

### User isolation and tamper behavior

Live API tests continue to exercise separate users and verify that Keychain ciphertext is user-scoped. Cryptographic tests cover wrong keys/passwords, ciphertext tampering, record/user/revision binding, and record swapping.

## Production-use decision

The implementation-side Stage 3 requirements are complete enough for owner use once the final PR CI passes. The UI intentionally does not display a permanent experimental/security-review banner.

An independent professional review remains desirable if the threat model or importance of stored credentials grows, but it is documented as an external assurance step rather than a blocker that the implementation author can falsely mark complete.

## Residual risks

Client-side encryption cannot protect an unlocked vault from malware, a keylogger, a compromised browser/device, shoulder surfing, screenshots, or clipboard-history tools. A fully compromised PCC server can also serve malicious JavaScript on a future page load/unlock and attack secrets while they are in browser memory.

The route CSP reduces browser attack surface but is not nonce/hash-only because the shared root layout currently uses a static inline theme bootstrap script. A future cleanup can remove that residual `'unsafe-inline'` requirement.

Loss of both the master passphrase and recovery key remains permanently unrecoverable by design. No owner/admin/server reset path exists that can decrypt the vault.
