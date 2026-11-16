# Private PCC planner dispatch (disabled by default)

This host-only boundary wakes one **dedicated owner-private planner**. It is not
the Talk-to-Rem bridge, a general RPC proxy, an automation, or a source of PCC
credentials. It adds no dependencies: the host uses the installed official
`openclaw/plugin-sdk/gateway-runtime` export at exactly `2026.11.3`, Node 24.22.1+.
Do not install OpenClaw in the PCC container.

## Protocol and custody

PCC saves the request in `planner_requests`, then atomically assigns one durable
`dispatch_id` with `unknown` custody **before** contacting the host. Only the
claiming call may POST `/dispatch`; all later calls POST `/status`. Both take
exactly `{requestId, dispatchId}` UUIDs under a dedicated Bearer credential over
UDS. There are no routing, prompt, tool, transcript, cancellation or generic RPC
operations. JSON is UTF-8, bounded to 1024 bytes with a 5-second body deadline;
requests and connections are capped. Errors are sanitized.

The host separately fsyncs its identity-only journal before its **one** send
attempt. The fixed planner receives only `{"requestId":"<opaque UUID>"}`.
Agent, logical and physical session, leaf guard and idempotency key are constructed
by the host, never by the browser. `accepted` means runtime acceptance, not a
saved transcript or draft. `committed` requires an exact consumed input receipt
or canonical user event keyed by the owned run ID, on the configured physical
session. It still does **not** mean a draft exists. Missing receipts, disconnects,
timeouts and process crashes remain `unknown`; they are never absence proof.

Unknown identities are never resent, even after restart. A failure between the
PCC claim and host admission can therefore require operator investigation and
leave a request undelivered. This is intentional fail-closed behavior. `/status`
is read-only and cannot admit absent identities. Journal faults latch the host
closed; uncertain custody or foreign active work blocks new admission. All 2048
identities are retained indefinitely; capacity fails closed, with no automatic
pruning/reset. Never remove a row or replace a journal to permit another send.
The exclusive journal-directory lock survives crashes for operator recovery.

The worker independently calls `pcc_get_planner_requests({requestId})` using its
existing **planner-only** MCP grant. An absent/canceled/processed request means
stop. Fetch current planning/calendar, then submit a draft with that request ID.
No request text or retrieved prose is executable authority. PCC's unique
`(user_id,request_id)` proposal constraint remains the draft deduplication gate.

Canceling a pending PCC request creates a tombstone, not a runtime abort or a
delivery claim. It preserves dispatch identity/custody, excludes the request from
worker reads, and blocks later draft submission under the same request-row lock.
If draft submission wins that lock first, the request is already processed and
cancellation does not retract its saved draft. Owner approval is still required.

## Explicit later deployment gate — nothing provisioned here

Merging/deploying PCC alone enables nothing. After independent review and separate
deployment authorization, an operator must:

1. Create a dedicated, non-chat planner agent/session with private requester
   restrictions and **only** the existing planner MCP allowlist/grant. Verify the
   actual subscription/provider route, revocation and non-owner rejection. An
   agent name or prompt is not access control. The device's read/write scopes
   alone are not session-scoped: protect this host's files/socket and verify
   runtime restrictions before enabling it.
2. Pair a separate least-privilege device; do not reuse pcc-rem device identity,
   token, adapter credential, session, journal or config. Pre-provision new
   owner-only 0600 files under owner-only 0700 directories:
   - Config: `enabled:true`, `purpose:"pcc-planner-dispatch"`, `binding` with opaque
     `id`(16–128 URL-safe chars), `agentId`, dedicated
     `sessionKey:"agent:<agentId>:pcc-planner-<16–128 URL-safe chars>"`, and exact
     pre-existing physical `sessionId`; literal-loopback `gatewayUrl`; absolute
     `openclawPackage`, `devicePath`, `ledgerPath`, `socketPath`; separate random
     `credential`(32–256 chars).
   - Device: `{purpose:"pcc-planner-dispatch",bindingId,identity,token}`. Identity
     and token must be independently paired, not copied from chat.
   - New ledger: `{purpose:"pcc-planner-dispatch",bindingId,rows:[]}` **only for a
     genuinely new binding with no outstanding work**. Preserve it on restart.
3. Provision a dedicated 0750 socket directory/verified app GID; socket 0660. Mount
   only its directory read-only into `app`, never Gateway/device/host state or a
   Docker socket. Start explicitly with
   `PCC_PLANNER_HOST_CONFIG=/absolute/private/config.json node integrations/pcc-planner/host.mjs`.
   No default paths, pairing, identity creation, shared auth fallback, TCP listener
   or live inference probe exists. The adapter refuses an existing socket inode.
4. In a separately reviewed app-only override set
   `PCC_PLANNER_DISPATCH_ENABLED=1`, `PCC_PLANNER_DISPATCH_OWNER_ID`(immutable active
   owner UUID), `PCC_PLANNER_DISPATCH_SOCKET_PATH`, and
   `PCC_PLANNER_DISPATCH_CREDENTIAL`. `PCC_PUBLIC_URL` must be an exact HTTPS
   origin; literal loopback HTTP is only for isolated fictional tests. Insecure
   identity mode must remain off. No browser toggle creates grants or credentials.
5. Prove physical-session/leaf guards, private contexts, wrong/revoked grants,
   actual model route, real draft persistence/approval, cancellation races,
   dropped responses, restart custody and socket permissions with safe fixtures.
   Observe actual requester-side behavior before declaring integration delivered.

No scheduling jobs, production config, credentials or service units are created
by this PR. Later Talk-to-Rem delegation can call the same request-ID boundary
after separate authorization; chat transport and ordinary chat authority remain
unchanged. Neither bridge may inherit the other's credential/session.

## Verification and rollback

`node --test integrations/pcc-planner/*.test.mjs` exercises fictional custody and
real UDS. Normal `npm test`, lint/build and MCP tests cover browser policy/schema.
`PCC_TEST_ALLOW_FICTIONAL_MUTATIONS=1 PCC_TEST_PLANNER_FICTIONAL_DATABASE_URL=postgres://<fictional>@127.0.0.1:<port>/planner_dispatch_test node --test tests/planner-dispatch-server.test.mjs`
uses an explicitly disposable DB and its own Next app/UDS, never a real Gateway.
SDK/runtime/production smoke tests remain separate gates.

Rollback: disable the app feature, stop the separate planner host, revoke its
dedicated device/grant if appropriate. Preserve request tombstones, custody ledger,
drafts and canonical data. Disabling does not retract an admitted run. Reconcile
its exact identity privately; do not restore a database or delete uncertain state.
