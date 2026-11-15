# PCC Rem host adapter (disabled, stage 1)

A small host-only transport boundary, not an agent/orchestrator. No npm install or
extra provider account is needed. Reuse the installed official OpenClaw export at
exact version `2026.11.3`, using compatible host Node24. Never install OpenClaw in
the PCC container or import hashed internal production files.

This host transport exists solely for the optional **Talk to Rem** chat surface
(`/spaces/rem`). It is not required for the Weekly Planner. Planner scheduling
uses the separate `integrations/pcc-mcp` adapter; neither the private chat
device identity nor chat transport credential should be reused for it.

A version-pin update alone is **not** approval to enable this host adapter.
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

## Recovering a stuck submission

Keep the adapter stopped and preserve its ledger. First verify the dedicated
binding still names the same physical Gateway session. On OpenClaw `2026.11.3`,
`chat.history` returns an input receipt only when `inputRunIds` is a non-empty
exact list, the request is for the current physical session, and it is not a
page-by-message request. Receipt rows are durable Gateway pending-input records:
`consumed` includes the canonical event ID; `activeRunIds` is live-only and is
never proof that a finished submission was delivered.

The adapter therefore reconciles an outstanding ledger row only by one of two
exact identities: its requested `runId` receipt, or the canonical user transcript
message whose `__openclaw.idempotencyKey` is `${runId}:user`. It never uses message
text, timestamps, an inactive run, or an assistant reply as proof. Restore the
unchanged ledger, start the adapter once, and let it perform that read-only
reconciliation. If neither exact identity is returned, leave the submission in
`outcome_unknown`; do not resend it, create a replacement ledger, or delete the
row. Escalate with sanitized run/session identifiers and Gateway version instead.

Subscribed terminal `chat` events are wake-up hints only: the adapter accepts
only its exact binding and unresolved owned run, then reconnects and reads
authoritative history. An outstanding owned run also gets one bounded liveness
watchdog sequence (30 seconds, then 60, then 120) while the connection remains
subscribed. Neither mechanism edits the ledger or proves delivery; disconnects,
gaps, a ready reconciliation, and an empty ledger cancel the watchdog.

```sh
node --test integrations/pcc-rem/*.test.mjs
PCC_REM_TEST_OPENCLAW_PACKAGE=/absolute/installed/openclaw/package.json node --test integrations/pcc-rem/*.test.mjs
```

The second command also verifies actual installed abort-trigger/parser source and
the exported client's fictional authenticated lifecycle/storage. Hashed source
inspection is confined to tests, never runtime imports. Revalidate policy on any
OpenClaw upgrade. No live Gateway/device or personal records are needed.

[Product/API contract, app configuration and rollout gates](../../docs/rem-chat.md).
