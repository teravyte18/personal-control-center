# PCC Rem host adapter (disabled, stage 1)

A small host-only transport boundary, not an agent/orchestrator. No npm install or
extra provider account is needed. Reuse the installed official OpenClaw export at
exact version `2026.10.9`, using compatible host Node24. Never install OpenClaw in
the PCC container or import hashed internal production files.

Start only after separately authorized provisioning:

```sh
PCC_REM_HOST_CONFIG=/absolute/private/config.json node integrations/pcc-rem/host.mjs
```

No default config path, auto-pairing, shared token fallback, identity creation or
live inference probe exists. Config, dedicated identity and journal files must be
regular owner-only0600 files in owner-only0700 directories. The socket lives in a
separately provisioned0750 app-accessible directory. No TCP adapter listener.
Startup takes an exclusive journal-directory writer lock and refuses an existing
socket inode. A crash leaves the lock for operator recovery; verify the old
process/socket is gone before removing task-owned stale artifacts. Never start a
second writer for the same dedicated conversation.

Provision these private configuration fields (this describes the schema, not
actual configured values):

- `enabled`: true (no implicit default)
- `binding`: `{id, agentId, sessionKey}`. Random opaque id16–128 chars; canonical
  dedicated `agent:<agentId>:<opaque-conversation>` key, never main/global/worker
  namespaces. Reserve for this one writer; do not guess a current session.
- `gatewayUrl`: literal-loopback `ws://127.0.0.1:<verified-port>/` or IPv6 loopback.
- `openclawPackage`: absolute installed `openclaw/package.json`.
- `devicePath`: dedicated provisioned `{identity:{deviceId,publicKeyPem,privateKeyPem},token}`.
  Pairing is separate; request only `operator.read`/`operator.write`. Rotated
  legitimate device tokens persist atomically here, never in shared state.
- `ledgerPath`: pre-provisioned `{bindingId, rows:[], clockFloor:0}` **only for a genuinely new
  binding with no outstanding work**. Never create an empty replacement to bypass
  missing custody. Metadata-only journal persisted/fsynced before send.
- `socketPath`: absolute configured directory socket path (socket0660).
- `credential`: separate narrow random PCC→adapter credential, at least32 chars.

Missing/invalid storage, unsupported SDK/hello/scopes, foreign activity or uncertain
custody fails closed. Journal errors do not issue a new send. UUIDv7 submission timestamps bound first admission to five minutes and retries
to24 hours. Up to2048 identities are retained; only finished entries past the
retry window expire. Uncertain entries never expire implicitly; do not reset
the journal to bypass custody.

```sh
node --test integrations/pcc-rem/*.test.mjs
PCC_REM_TEST_OPENCLAW_PACKAGE=/absolute/installed/openclaw/package.json node --test integrations/pcc-rem/*.test.mjs
```

The second command also verifies actual installed abort-trigger/parser source and
the exported client's fictional authenticated lifecycle/storage. Hashed source
inspection is confined to tests, never runtime imports. Revalidate policy on any
OpenClaw upgrade. No live Gateway/device or personal records are needed.

[Product/API contract, app configuration and rollout gates](../../docs/rem-chat.md).
