# Talk to Rem: UI and backend foundation (disabled by default)

The dedicated phone-first UI and browser-safe contract are implemented, alongside
the backend foundation. PCC remains fully usable without chat, and the feature is
not deployed or enabled by default. The separate [assistant read connection](assistant-connection.md) is unchanged.

## Boundary

An active **cookie session**, owner role, and exact immutable account ID binding
are required on every enabled route. Assistant bearer grants and insecure test
identity mode are rejected. Writes require the exact configured `PCC_PUBLIC_URL`
origin and JSON; forwarded-host headers cannot redefine it. No query selectors,
Gateway routing, credentials, model options, generic RPC or caller user IDs are
accepted. History is private/no-store. SSE reauthorizes every 15 seconds, lasts at
most five minutes, has a one-chunk backpressure buffer and a 1 MiB response budget.
Four streams/process are allowed; reconnect always starts with a fresh snapshot.
Revocation can take up to the current 15-second lease to close an existing stream;
previously admitted work is not automatically cancelled by disconnect/logout.

The dedicated owner conversation has Rem's ordinary tool authority, **not** a
read-only advisory sandbox. No current-page/context collection, transcript import,
MCP policy expansion, background generation or paid inference fallback is added.

## UI contract

The route `/spaces/rem` appears in All Spaces and can be pinned using the existing
per-device navigation preferences. It does not add another permanent dock or rail
item. Phone and desktop share the same dedicated conversation surface. The composer
keeps drafts in memory across connection errors and never resends automatically.
History and SSE snapshots replace the visible message projection. Only safe error
codes are translated to user-facing copy; message text is rendered as plain text.

| Route | Request | Response |
| --- | --- | --- |
| `GET /api/rem/history` | no arguments | `RemSnapshot` |
| `GET /api/rem/events` | no arguments | SSE `snapshot`, `reset`, safe `error` |
| `POST /api/rem/send` | `RemSendBody` | `RemSendReceipt` |
| `POST /api/rem/cancel` | `RemCancelBody` | `{state:'stopping'|'already-finished'}` |

All types and fictional state fixtures are browser-safe. A snapshot **replaces**
the previous projection, by stable message IDs; never concatenate snapshots.
Revisions are opaque view guards, not transcript indices. Token deltas are not
forwarded: a bounded canonical history plus owned `inFlightRun.text` snapshot is
polled once a second during SSE. This deliberately avoids two competing text
accumulators. No UI should import the private adapter or Gateway SDK.

Keep the draft on errors/reconnect/unknown outcomes. Generate one UUIDv7 (`newRemSubmissionId`) per
intentional submission; retain it for retries. A receipt with custody `accepted`
is not transcript persistence. Unknown outcomes **must not** automatically resend
or generate a fresh ID. The adapter never resends an uncertain inference itself;
it recovers exact active identity/custody, or remains fail-closed. One active
submission; no hidden queue/interrupt. Stop takes only the opaque admitted handle
and never retargets to a different run. Exact abort can include that run's
controlled descendants; unrelated runs are not addressed.

The initial command-free input policy is intentionally restrictive: slash spans
outside standalone HTTP(S) URLs, backslashes, bang characters, invisible controls
and pinned normalized abort phrases are rejected, not rewritten. Use Stop for
cancellation. This is a transport control guard, not a restriction on normal
natural-language requests to Rem. UI copy should explain rejected input without
exposing internals. Preserve existing safe plain-text/Markdown rendering; never
add HTML, tool/reasoning output or unsafe link rendering.

## App configuration (not provisioned)

Defaults are off. No Compose mounts/environment or host service are installed by
this stage. A separately reviewed deployment override must set only on `app`:

- `PCC_REM_ENABLED=1`
- `PCC_REM_OWNER_ID`: exact active owner account UUID, not an email/role alone.
- `PCC_REM_SOCKET_PATH`: absolute path inside its read-only directory mount.
- `PCC_REM_ADAPTER_CREDENTIAL`: a dedicated random credential, at least 32 chars;
  this is **not** a Gateway/device credential. Inject privately at runtime.
- Existing `PCC_PUBLIC_URL` must be an exact HTTPS origin (literal loopback HTTP
  is permitted for isolated fictional testing), and insecure identity mode off.

Never mount Gateway state, Docker socket, shared operator tokens, device key or
host credentials into PCC. Keep Gateway loopback, Funnel ingress and CSP unchanged.
Mount the socket **directory**, not an inode, app-only and read-only; directory
0750/socket0660 with a verified dedicated GID or compatible UID. Do not chmod777.

## Host adapter

See [host adapter guide](../integrations/pcc-rem/README.md). It reuses the installed
public `openclaw/plugin-sdk/gateway-runtime` export, pinned to `2026.10.9`, host Node
24.22.1+ (not PCC's Node22). Dedicated operator-provisioned identity/token storage
never falls back to default OpenClaw identity/auth stores. Explicit read+write
only, protocol4; no pairing/admin/shared token/utility calls. Subscription precedes
bounded history on every authenticated hello. Reconnect attempts retained-cursor
receipt recovery, then canonically replaces the bounded tail. Readiness requires
exact physical session/branch and complete activity identities. Foreign activity,
missing facts, session change or lost custody fails closed.

Only metadata (submission ID, payload digest, exact run/physical identity, opaque
handle, custody) is durably journaled before send; no second transcript archive.
Crash/restart never drops uncertain identities. The ledger holds up to2048 identities. UUIDv7 timestamps bound new admission
to five minutes (30-second future clock tolerance) and retries to24 hours; the UI
helper creates IDs. Finished identities expire only after the retry window plus
a margin; an expired ID can never be admitted again. Uncertain identities never
expire silently and block admission until reconciled. A full ledger rate-limits
new work rather than dropping custody facts. Clock and retention behavior require
independent review and live recovery verification.
Never reset/delete a journal to make an uncertain message send again.

Safe projection exposes user/assistant text only, bounded stable IDs and sanitized
status. Reasoning/tools/errors/context-marked entries are dropped; obvious host
paths/credential patterns are redacted. This is output hygiene, **not a guarantee
of recognizing every secret or private detail in owner-authorized prose**. Runtime
transcript retention remains Gateway-owned and is not silently added to PCC backups.

## Verification and remaining gates

Run repo lint/tests/build, both Compose checks and full fictional production-stack
CI, plus `node --test integrations/pcc-rem/*.test.mjs`. To run pinned installed SDK
and parser fixtures, explicitly set `PCC_REM_TEST_OPENCLAW_PACKAGE` to its package
JSON. Fixtures use generated keys/tokens and loopback fake servers, never a real
Gateway or inference. Passing these does not establish live requester isolation,
Gateway persistence/abort semantics, actual provider/subscription routing, MCP
access or production socket permissions/restarts.

Independent security review, UI/phone/desktop checks,
real paired least-privilege requester and fixed-session verification, intended
subscription runtime/MCP allowlist and revocation tests, safe production service
and socket provisioning are **separate rollout gates**. No public Gateway port,
auth bypass, merge or deployment is authorized by this implementation stage.

Rollback: disable the feature/binding, closing streams on the next lease, stop
adapter and revoke dedicated credentials. Disabling does not retract an admitted
run: reconcile/stop its exact owned identity if needed. Preserve transcripts and
PCC data; no database restore/schema drop is involved.
