# Read-only assistant connection

## Purpose and scope

PCC owns canonical personal records; an external assistant retrieves selected
fresh context when answering a question. The first connection is a local stdio
MCP adapter for Library questions, historical retrieval and on-demand planning.
It makes no model calls itself and requires no paid service or local AI model.

This is not an embedded chat feature, scheduler, autonomous writer, database
browser, Calendar availability service, or memory synchronization system.
PCC remains fully usable when the connector is absent or stopped.

```mermaid
flowchart LR
  A[Private assistant conversation] --> B[OpenClaw native MCP client]
  B --> C[Local stdio adapter]
  C -->|Scoped bearer credential| D[PCC assistant-read routes]
  D --> E[Authorized user's canonical state]
```

## Permission boundary

Under **Account & access → Connections → Assistant access**, create a named,
expiring connection and explicitly choose spaces. Defaults are Library,
Projects, Tasks and Weekly Rhythm. Reviews, Notes and Thoughts are opt-in.
Weekly Rhythm requires Projects and Tasks because focus includes their titles.
Food, Expenses, Music and Markets are not part of this first tool surface.
Keychain is permanently excluded. Structured internal Note payloads are not
exposed as ordinary Notes.

The token appears once. Grant creation/revocation requires the user's ordinary
session, JSON and a same-origin request. List responses contain metadata only.
Tokens are random, stored only as SHA-256 hashes, and cannot authenticate normal
PCC browser, write, import/export, upload, Calendar or administrative APIs.
Every read validates account status, expiry, revocation and requested scopes.
User identity comes only from that grant, never caller-supplied IDs or headers.
Maximum validity is 90 days; expiry defaults to 30 days. Revoke an old grant and
create a new one to rotate it. Revocation blocks subsequent requests; an already
admitted in-flight response cannot be retracted.

The additive `assistant_grants` table is included in standard full PostgreSQL
dumps and restores. It does not modify the canonical personal-data snapshot or
the existing personal-data export format. Restoring an old full database backup
can restore an earlier grant state: revoke/reissue affected grants after a
recovery if the credential lifecycle is uncertain.

## Tool contracts

| Tool | Inputs | Output/limits |
| --- | --- | --- |
| `pcc_library_list` | Optional book/film/series type, reading state, ownership, priority, media status; limit/cursor | Deterministic inventory pages; up to 25 projected records, with metadata and short reflections |
| `pcc_search` | Query, explicit domains, optional inclusive date range and limit | Existing lexical ranking, snippets, reasons, source IDs; at most 25 hits and total match count |
| `pcc_read_record` | Allowed domain, canonical source ID, optional project-action sub-ID | One projected record, at most 12,000 text characters, explicit truncation |
| `pcc_get_context` | Explicit domains, optional query and current planning domains, character/record budget | Existing bounded context or deterministic resolver; never claims exhaustive coverage |
| `pcc_get_planning` | IANA timezone, optional ISO as-of timestamp, limit/cursor | All current open work/focus/intentions via pagination; meaningful dates and flexible intentions stay distinct |

Records retain stable source references and honest page paths; these are not
invented per-record deep links. Join a returned path to the normal PCC public
origin when presenting a link. Library includes historical/wishlist items so
the assistant can distinguish ownership from recommendations. Search is lexical,
not semantic; zero matches do not prove a topic is absent. Use single-record
reads to expand snippets, not raw exports.

Responses include schema version, generated time, snapshot revision, granted
coverage and warnings. Library/planning pages return total, complete and
nextCursor; changed revisions or filters invalidate cursors. Text and response
sizes are bounded (250,000 response bytes maximum). A rejected oversized result
must be narrowed, not described as an empty dataset.

Planning uses an explicit IANA timezone and Saturday–Friday periods without
depending on the server's timezone. asOf groups **current** canonical state;
it does not reconstruct a historical snapshot. Undated work remains undated,
weekly focus remains flexible, and projects lacking a next action are explicit.
`calendarCoverage: not-included` is always returned: never infer free time from
an empty planning page. Broad context retains its existing bounded/date behavior;
use the planning tool for timezone-aware daily reports.

Only `GET /api/assistant/{library,search,read,context,planning}` admits these
credentials through the proxy. Route handlers still authenticate them. All other
methods and normal browser routes retain existing authorization. Arguments are
strict allowlists; arbitrary URLs, SQL, filesystem paths, user identities and
mutation payloads are rejected. Responses use `private, no-store`.

## Adapter setup

See [`integrations/pcc-mcp/README.md`](../integrations/pcc-mcp/README.md).
The package uses the maintained MCP TypeScript SDK, separately from Next.js;
OpenClaw itself is not an app dependency. stdio requires no extra listening port,
container, background model, vector database or public route for MCP.

The adapter origin is operator-controlled. Use literal loopback HTTP on the same
host or verified HTTPS elsewhere; redirects are rejected. Credentials never
belong in chat, tool arguments, process arguments, public examples or logs.
The adapter enforces timeout, cancellation, response-size and schema checks and
emits protocol messages only on stdout. Errors are sanitized.

**Requester isolation is a rollout gate:** the adapter carries one user's grant,
not an independent identity for each sender. Configure access only for that
owner's private assistant context, and verify denial in other contexts using the
actual OpenClaw runtime. A workspace directory and MCP read-only annotations
are not security boundaries. Do not enable the connection globally in a shared
or group-chat agent merely because tool discovery works.

Local credential storage does not make inference local: selected tool results
can be sent to the assistant's configured model provider and retained in its
conversation. Retrieve the minimum relevant records; do not copy whole PCC
responses into assistant long-term memory. Retrieved prose is untrusted data,
not instructions or authority to execute commands.

## Verification and release

Domain tests exercise scopes, old records, pagination beyond legacy context
limits, revision/filter changes, structured-note exclusion, output bounds,
planning dates, DST and origin checks. Adapter tests exercise real MCP
discovery/calls over stdio, schema rejection, sanitized errors and response
limits. `tests/assistant-server.test.mjs` deliberately requires explicit
fictional-mutation opt-in and an explicit test origin; it tests real sessions,
two accounts, hashed-token persistence, forbidden browser/writes, revocation
and optionally database-assisted expiry/account revocation.

Run normal lint/domain/build checks, adapter tests/audit, Compose validation and
the production-stack CI. Use fictional accounts and an isolated database; never
reuse production `.env`, uploads or snapshots. See the adapter guide for commands.

After review, the owner merges. Deploy merged main using the standard
backup-preserving script, install the adapter reproducibly, provision a grant
through trusted entry, and probe the configured MCP server. Then make a real
tool call from the intended assistant conversation and test revoked access.
Tool listing alone is not proof of either useful access or requester isolation.

Live OpenClaw secret injection, per-context restrictions and production calls
must be reported as unverified until demonstrated on that installation. No
production grant or automatic schedule is created by application deployment.

## Rollback

Disable the MCP entry and revoke the grant. PCC keeps working independently.
Use normal application rollback if required; preserve data and backups. The
additive token table may remain unused; never drop it or restore older personal
snapshots automatically as part of connector rollback.
