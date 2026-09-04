# Keychain Stage 3 Security Review

## Status

Implementation-side review in progress for issue #57. This document records evidence, residual risks, and the production-use decision. It is deliberately **not** an independent security review: the implementation author/agent cannot self-certify that requirement.

The Keychain remains experimental until an independent reviewer outside this implementation work has reviewed the final Stage 3 diff and threat model.

## Review areas

- dependency and supply-chain boundary;
- browser-delivered CSP/XSS boundary;
- encrypted export/restore behavior;
- PostgreSQL/R2 backup and restore behavior;
- atomic vault-key rotation;
- plaintext leakage paths;
- cross-user/ciphertext-tamper behavior;
- residual server-compromise and endpoint-device risks.

## Evidence log

Evidence and final findings are added as Stage 3 implementation lands. Automated tests must use synthetic credentials only.

## Non-negotiable residual risks

Even after Stage 3, client-side encryption cannot protect an unlocked vault from malware, a compromised browser/device, shoulder surfing, clipboard-history tools, or a server that has been fully compromised and serves malicious JavaScript before the next unlock. Loss of both the master passphrase and recovery key remains unrecoverable by design.
