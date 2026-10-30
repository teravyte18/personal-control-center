import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const origin = process.env.PCC_MCP_TEST_BASE_URL;
test("real stdio MCP → PCC reads, denies ungranted Notes, and observes revocation", { skip: !origin }, async () => {
  // Explicit fictional-stack opt-in, never default to PCC production.
  assert.equal(process.env.PCC_TEST_ALLOW_FICTIONAL_MUTATIONS, "1");
  const login = await fetch(origin + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@example.test", password: "owner-bootstrap-password-123" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";", 1)[0];
  const headers = { Cookie: cookie, Origin: process.env.PCC_MCP_TEST_PUBLIC_ORIGIN ?? origin, "Content-Type": "application/json" };
  const created = await fetch(origin + "/api/assistant-grants", { method: "POST", headers, body: JSON.stringify({ label: "Fictional stdio trial", domains: ["library"] }) });
  assert.equal(created.status, 201);
  const { grant, token } = await created.json();
  const transport = new StdioClientTransport({ command: process.execPath, args: [new URL("../src/index.mjs", import.meta.url).pathname], env: { PCC_ORIGIN: origin, PCC_ASSISTANT_TOKEN: token }, stderr: "pipe" });
  const client = new Client({ name: "pcc-live-fixture", version: "1" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 5);
    const result = await client.callTool({ name: "pcc_library_list", arguments: {} });
    assert.notEqual(result.isError, true);
    assert.ok(result.structuredContent.records.some((row) => row.sourceId === "connector-example-book"));
    const denied = await client.callTool({ name: "pcc_read_record", arguments: { domain: "notes", sourceId: "connector-example-book" } });
    assert.equal(denied.isError, true);
    const revoked = await fetch(origin + "/api/assistant-grants", { method: "DELETE", headers, body: JSON.stringify({ id: grant.id }) });
    assert.equal(revoked.status, 204);
    assert.equal((await client.callTool({ name: "pcc_library_list", arguments: {} })).isError, true);
  } finally {
    await client.close(); await transport.close();
    await fetch(origin + "/api/assistant-grants", { method: "DELETE", headers, body: JSON.stringify({ id: grant.id }) });
  }
});
