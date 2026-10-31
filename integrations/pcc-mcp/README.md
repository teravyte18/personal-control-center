# PCC read-only MCP adapter

Local stdio tools for PCC's dedicated, scoped assistant API. No direct database
or upload access. Requires Node 22.18+; dependencies are pinned in this package's
lockfile. The SDK is a protocol/runtime dependency, not a model provider.

## Install and test

```sh
cd integrations/pcc-mcp
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

This package runs ESM JavaScript directly; there is no compilation step. Install
a pinned checkout or packed artifact outside the live deployment checkout.
Do not run dependency installation against production source or commit tokens.

## Credentials and origin

Create a connection in PCC **Account & access → Connections → Assistant access**.
Use exactly one runtime credential source:

- `PCC_ASSISTANT_TOKEN`: injected by a trusted secret-management mechanism; never
  put its literal value in saved public config or a command line.
- `PCC_ASSISTANT_TOKEN_FILE`: absolute path to a private file outside the repo,
  owned by the adapter's OS user with mode 0600 (or stricter). The file contains
  only the token and optional terminal newline. Symlinks are rejected on Linux.

Create/populate the file via an operator-controlled masked secret-entry method,
not a shell command embedding the token. The assistant need not inspect it.
Other users with the same OS identity and privileged host processes are outside
this file-permission boundary. Use actual OS/tool isolation when stronger
restrictions are needed.

Set `PCC_ORIGIN` to `http://127.0.0.1:3000` for the same-host deployment, or a
trusted HTTPS origin. It must contain no path, query, fragment or credentials.
Plain HTTP hostnames (including localhost) are rejected; use literal loopback.

## OpenClaw native MCP configuration

Example structure (replace nonsecret paths; merge rather than overwrite existing
configuration):

```json
{
  "mcp": {
    "servers": {
      "pcc": {
        "command": "/usr/bin/node",
        "args": ["/srv/pcc-mcp/src/index.mjs"],
        "cwd": "/srv/pcc-mcp",
        "env": {
          "PCC_ORIGIN": "http://127.0.0.1:3000",
          "PCC_ASSISTANT_TOKEN_FILE": "/private/runtime/pcc-readonly-token"
        },
        "requestTimeoutMs": 20000,
        "toolFilter": {
          "include": ["pcc_library_list", "pcc_search", "pcc_read_record", "pcc_get_context", "pcc_get_planning"]
        }
      }
    }
  }
}
```

The path shown is illustrative; locate the actual Node executable. On the
inspected OpenClaw 2026.10.9 host, native MCP stdio and per-server filters are
documented. SecretRef-to-stdio injection and owner-only per-context enablement
must still be verified before connecting real data. **Do not install this
example globally in a multi-sender agent.** Read-only annotations do not enforce
requester privacy. Scope it to the owner's private context and prove denial in
an unauthorized context, or stop rollout.

```sh
openclaw mcp doctor pcc --probe
```

Then call a tool from the actual intended OpenClaw/Codex-backed conversation.
Probe/listing success alone is not end-to-end proof. Verify a denied domain,
revocation, restart/reconnect and no access from other senders. Revoke a grant
and create a new one for rotation; restart the adapter to load its replacement.

## Fictional server integration test

Provision a completely separate test database, run app migrations, and start a
test PCC server with the fictional owner from existing CI, its own public origin
and no external integration credentials. Never use production data or `.env`.

```sh
PCC_TEST_ALLOW_FICTIONAL_MUTATIONS=1 \
PCC_TEST_BASE_URL=http://127.0.0.1:3107 \
node --test tests/assistant-server.test.mjs
```

Run that command from the repository root. Optional `PCC_TEST_DATABASE_URL` must
point only at that fictional database; it enables hashed-token/expiry/revoked
account assertions. Without it those extra database checks are not performed.

## Operations

The adapter has a 15-second HTTP timeout and a 250,000-byte response cap. It
rejects redirects, unknown operations, invalid JSON/schema responses and
unapproved destinations. Tool output is bounded, read-only and source-grounded;
Calendar is not included. Operational errors never include server bodies or
credential values. Stdout is reserved for MCP messages.

Disable the MCP entry and revoke the grant to disconnect. Uninstalling the
adapter does not delete PCC records. The connector performs no background
polling, scheduled inference, model calls or canonical writes.
