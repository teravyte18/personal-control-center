# Encrypted Password Keychain

## Decision

**Go, with a deliberately narrow security boundary.**

Personal Control Center may add a client-encrypted Keychain for small credentials and secrets. It must not be implemented as ordinary Notes, plaintext fields, or records inside the normal personal-data snapshot.

The first release is an **experimental encrypted secrets vault**, not a claim to replace a mature audited password manager. Important credentials should not rely on it as their only copy until the implementation has received an independent security review.

## Implementation status

Stages 1 and 2 are implemented in PRs #55 and #56 and remain experimental pending Stage 3. The current implementation includes dedicated ciphertext-only persistence, Argon2id/XChaCha20-Poly1305 browser cryptography, recovery-key wrapping, authenticated user/record/revision binding, setup/unlock/recovery/password-change flows, encrypted record CRUD, search, deliberate copy/reveal, fixed lock timers, and a CSPRNG password generator.

CI covers cryptographic wrong-key/tamper/swap failures, source-level plaintext/storage boundaries, and live PostgreSQL/API user isolation. Stage 3 still gates use as the sole copy of important credentials and includes CSP/XSS review, dependency review, encrypted export and restore rehearsal, vault-key rotation, and independent security review.

## Intended value

The Keychain should make a small number of personal secrets easy to find from the same phone-first application while keeping the server, PostgreSQL database, local backups, and R2 snapshots unable to read their contents.

Initial record fields:

- label;
- username or email;
- password or other secret;
- URL;
- notes.

Browser autofill, passkey storage, breach monitoring, sharing, attachments, and collaborative access are outside the first version.

## Threat model

### Must protect against

- theft or disclosure of PostgreSQL data;
- theft or disclosure of local and R2 backups;
- direct access to the Raspberry Pi upload/data directories while the vault is locked;
- accidental cross-user reads caused by an application bug;
- a stolen authenticated device after the vault has locked;
- ciphertext modification or record swapping.

### Cannot fully protect against

- malware, a keylogger, or a compromised browser/device;
- an attacker using an already unlocked device;
- screenshots, shoulder surfing, or clipboard-history tools;
- a fully compromised application server that serves malicious JavaScript at the next unlock;
- loss of both the master password and the recovery key.

Client-side encryption therefore protects stored data at rest, but it does not make a web-delivered vault immune to a compromised server while the vault is being unlocked or used.

## Cryptographic design

Use a reviewed browser-capable cryptographic library rather than implementing primitives directly.

1. The browser generates a random 256-bit **vault data-encryption key**.
2. A separate Keychain master password is processed client-side with **Argon2id** and a per-vault random salt to derive a key-encryption key.
3. Argon2 parameters are stored with the vault envelope and may be upgraded later. Tune them on the weakest supported phone, target the RFC 9106 memory-constrained profile where practical, and never go below the current OWASP Argon2id minimum.
4. The derived key encrypts only the random vault key. Changing the master password therefore re-wraps the vault key rather than re-encrypting every record.
5. Each record is encrypted independently with the vault key using authenticated encryption and a fresh random nonce. XChaCha20-Poly1305 through libsodium is the preferred initial construction because its large nonce supports safe random nonce generation.
6. Authenticated additional data binds the envelope version, authenticated user ID, record ID, and record revision so ciphertext cannot be silently moved between users or records.
7. The server stores only versioned ciphertext envelopes, salts, KDF parameters, nonces, timestamps, and opaque IDs. Labels, usernames, URLs, notes, and secrets remain encrypted.
8. The master password, derived key, recovery key, and decrypted vault key are never sent to the server or written to localStorage, sessionStorage, IndexedDB, logs, analytics, exports, or the service-worker cache.

References:

- RFC 9106, Argon2: https://www.rfc-editor.org/rfc/rfc9106
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- libsodium password hashing: https://doc.libsodium.org/password_hashing
- libsodium XChaCha20-Poly1305: https://doc.libsodium.org/secret-key_cryptography/aead/chacha20-poly1305/xchacha20-poly1305_construction

## Recovery and password changes

Keychain setup generates a high-entropy recovery key in the browser. The recovery key independently wraps the vault key, and the server stores only that wrapped copy.

- The recovery key must be shown once with a clear instruction to keep it outside Personal Control Center.
- A forgotten master password can be replaced only by presenting the recovery key.
- Losing both values makes the vault permanently unrecoverable.
- Changing the master password derives a new wrapping key and re-wraps the unchanged vault key.
- Rotating the vault key is a separate maintenance operation that re-encrypts every record and must be resumable and tested.

There is no owner/admin reset path that reveals another user's vault.

## Unlock and lock behaviour

- Application sign-in and Keychain unlock remain separate operations.
- The decrypted vault key exists only in browser memory.
- Reloading or closing the page locks the vault.
- Logging out, session revocation, or authentication expiry locks the vault immediately.
- The first version locks after 15 minutes without Keychain interaction and after 5 minutes in the background.
- Unlock failures use generic messages and local throttling without transmitting the attempted master password.
- The normal application remains usable while the Keychain is locked.

## Reveal and clipboard behaviour

- Secrets are masked by default.
- Reveal and copy are deliberate per-record actions.
- Revealed values hide again after 30 seconds or when the vault locks.
- Clipboard clearing after 30 seconds is best effort; the interface must not promise control over third-party clipboard history.
- Decrypted values must not appear in URLs, DOM attributes, console output, crash reports, notifications, Calendar, or browser autofill fields.

## Storage and application boundaries

The Keychain uses dedicated user-scoped tables and endpoints rather than the generic personal-data snapshot.

- Every row is scoped by authenticated user ID on the server even though the contents are encrypted.
- API responses use `Cache-Control: private, no-store`.
- The service worker never caches Keychain pages, API responses, or decrypted data.
- Search and filtering happen in the browser after unlock.
- Normal Inbox, Notes, Thoughts, Review, Calendar, and global import/export code never inspect Keychain records.
- Standard PostgreSQL and R2 backups include only ciphertext and remain sufficient for restore.
- A future Keychain export must remain encrypted and use its own versioned format.
- No third-party scripts or remote assets should run on the unlocked Keychain route. Content Security Policy and XSS prevention are part of the security boundary.

## Implementation plan

Implementation must remain separate from normal feature work and be reviewable in stages.

### Stage 1 — Encrypted vault foundation

- dedicated schema and user-scoped API;
- versioned envelope format;
- client-side Argon2id and authenticated-encryption module;
- master-password wrapping and recovery-key wrapping;
- published test vectors and tamper/wrong-key/cross-user tests;
- proof that plaintext never reaches the server, database, backups, logs, or service worker.

No production secrets should be stored at this stage.

### Stage 2 — Locked Keychain experience

- setup, recovery-key confirmation, unlock, lock, and password-change flows;
- create, edit, reveal, copy, search, and delete records;
- fixed inactivity/background locking;
- clear recovery and irreversible-loss messaging;
- phone testing for KDF performance and memory pressure.

### Stage 3 — Hardening and production-use gate

- dependency and supply-chain review;
- CSP and XSS review of the unlocked route;
- backup/restore and encrypted-export rehearsal;
- vault-key rotation test;
- independent security review;
- explicit decision on whether the experimental warning may be removed.

## Acceptance boundary

The feature is acceptable only when:

- plaintext is absent from server requests, persistent browser storage, database rows, logs, backups, and normal exports;
- wrong passwords, modified ciphertext, record swapping, and cross-user access fail safely;
- password change and recovery re-wrap the same vault key correctly;
- lock timers and session revocation reliably remove access to decrypted records;
- backup and restore preserve usable ciphertext without weakening encryption;
- the UI states the server-compromise and unrecoverable-loss boundaries honestly.
