import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "../src/server.mjs";
import { createPccClient, validateOrigin, loadCredential } from "../src/client.mjs";
import { tools } from "../src/tools.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createServer as httpServer } from "node:http";
import { mkdtemp, writeFile, chmod, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const token = "pcc_ro_" + "a".repeat(43);
const envelope = { version: 1, revision: 1, generatedAt: "2026-10-30T12:00:00.000Z", coverage: ["library"], warnings: [] };
const library = { ...envelope, records: [], total: 0, complete: true, nextCursor: null };
test("client accepts only configured secure origins", () => {
  for (const url of ["http://example.test", "http://localhost", "https://u:p@example.test", "https://example.test/path", "file:///tmp/a"]) assert.throws(() => validateOrigin(url));
  assert.equal(validateOrigin("http://127.0.0.1:3107"), "http://127.0.0.1:3107");
  assert.equal(validateOrigin("https://pcc.example.test"), "https://pcc.example.test");
});
test("client sends fixed read operation, refuses redirects and sanitizes server errors", async () => {
  const call = createPccClient({ origin: "http://127.0.0.1:3107", token, fetchImpl: async (url, init) => {
    assert.equal(url.pathname, "/api/assistant/library"); assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error"); assert.equal(init.headers.Authorization, `Bearer ${token}`);
    return Response.json(library);
  } });
  assert.deepEqual(await call("library", {}), library);
  const denied = createPccClient({ origin: "http://127.0.0.1:3107", token, fetchImpl: async () => new Response(`private ${token}`, { status: 403 }) });
  await assert.rejects(denied("library", {}), { message: "PCC access denied or credential expired/revoked." });
  await assert.rejects(call("constructor", {}), /Unsupported/);
});
test("planner POST uses a distinct opt-in credential, scoped URL and JSON schema", async () => {
  const plannerToken = "pcc_plan_" + "b".repeat(43);
  const call = createPccClient({ origin: "http://127.0.0.1:3107", token: plannerToken,
    fetchImpl: async (url, init) => {
      assert.equal(url.pathname, "/api/assistant/planner");
      assert.equal(init.method, "POST");
      assert.equal(init.headers["Content-Type"], "application/json");
      assert.equal(init.headers.Authorization, "Bearer " + plannerToken);
      assert.equal(JSON.parse(init.body).replaceFrom, "2026-11-16");
      return Response.json({saved:true,revision:5,count:1,calendarCheckedAt:"2026-11-14T16:00:00.000Z"});
    },
  });
  const proposal = {revision:4,replaceFrom:"2026-11-16",
    sessions:[{date:"2026-11-16",start:"10:30",minutes:120,title:"Fictional analysis",work:[]}]};
  const tool=tools.find(item=>item.operation==="planner-submit");
  assert.ok(tool);
  assert.equal(tool.schema.safeParse(proposal).success,true);
  assert.equal(tool.schema.safeParse({...proposal,sessions:[{...proposal.sessions[0],admin:true}]}).success,false);
  assert.equal((await call("planner-submit",proposal)).saved,true);
  const calendar = createPccClient({origin:"http://127.0.0.1:3107",token:plannerToken,fetchImpl:async (url,init)=>{
    assert.equal(init.method,"GET");
    assert.equal(url.pathname,"/api/assistant/planner");
    assert.equal(url.searchParams.get("from"),"2026-11-16");
    return Response.json({revision:4,timezone:"Europe/Lisbon",preferences:{},busy:[],sessions:[],fetchedAt:"2026-11-14T16:00:00.000Z"});
  }});
  assert.equal((await calendar("planner-calendar",{from:"2026-11-16",to:"2026-11-20"})).revision,4);
});
test("malformed, HTML and oversized responses never reach tools", async () => {
  for (const response of [Response.json({ token }), new Response("<html>login</html>", { headers: { "content-type": "text/html" } }), new Response('"' + "x".repeat(250001) + '"', { headers: { "content-type": "application/json" } })]) {
    const call = createPccClient({ origin: "http://127.0.0.1:3107", token, fetchImpl: async () => response });
    await assert.rejects(call("library", {}), /invalid|oversized/);
  }
});
test("tool schemas reject identity, URL, raw mutation and unknown argument injection", () => {
  for (const tool of tools) {
    assert.equal(tool.schema.safeParse({ userId: "other", url: "https://evil.test", mutation: {} }).success, false);
  }
});
test("MCP protocol discovers five read-only and two scoped planner tools and returns structured results", async () => {
  const [left, right] = InMemoryTransport.createLinkedPair();
  const server = createServer(async () => library);
  const client = new Client({ name: "pcc-test", version: "1" });
  try {
    await server.connect(left); await client.connect(right);
    const listed = await client.listTools(); assert.equal(listed.tools.length, 7);
    assert.equal(listed.tools.filter(tool=>tool.annotations.readOnlyHint).length,6);
    assert.equal(listed.tools.find(tool=>tool.name==="pcc_submit_planner_plan")?.annotations.readOnlyHint,false);
    const result = await client.callTool({ name: "pcc_library_list", arguments: {} });
    assert.deepEqual(result.structuredContent, library);
    const invalid = await client.callTool({ name: "pcc_library_list", arguments: { userId: "other" } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); await server.close(); }
});
test("real stdio process handles discovery and HTTP read without stdout noise", async () => {
  const fake = httpServer((request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify(library));
  });
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  const transport = new StdioClientTransport({ command: process.execPath, args: [new URL("../src/index.mjs", import.meta.url).pathname], env: { PCC_ORIGIN: `http://127.0.0.1:${fake.address().port}`, PCC_ASSISTANT_TOKEN: token }, stderr: "pipe" });
  const client = new Client({ name: "stdio-test", version: "1" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 7);
    assert.deepEqual((await client.callTool({ name: "pcc_library_list", arguments: {} })).structuredContent, library);
  } finally { await client.close(); await transport.close(); await new Promise((resolve) => fake.close(resolve)); }
});
test("credential sources are exclusive and validated", async () => {
  await assert.rejects(loadCredential({}));
  await assert.rejects(loadCredential({ PCC_ASSISTANT_TOKEN: token, PCC_ASSISTANT_TOKEN_FILE: "/unread" }));
  assert.equal(await loadCredential({ PCC_ASSISTANT_TOKEN: token }), token);
});

test("credential file enforces owner-only permissions and rejects symlinks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pcc-mcp-fixture-"));
  const file = join(directory, "fictional-token");
  try {
    await writeFile(file, token + "\n", { mode: 0o600 });
    assert.equal(await loadCredential({ PCC_ASSISTANT_TOKEN_FILE: file }), token);
    await chmod(file, 0o644);
    await assert.rejects(loadCredential({ PCC_ASSISTANT_TOKEN_FILE: file }));
    await chmod(file, 0o600);
    await symlink(file, join(directory, "linked"));
    await assert.rejects(loadCredential({ PCC_ASSISTANT_TOKEN_FILE: join(directory, "linked") }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("HTTP redirect never forwards credentials to a second destination", async () => {
  let forwarded = false;
  const fake = httpServer((request, response) => {
    if (request.url === "/destination") { forwarded = true; response.end("bad"); }
    else { response.writeHead(302, { location: "/destination" }); response.end(); }
  });
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  try {
    const call = createPccClient({ origin: `http://127.0.0.1:${fake.address().port}`, token });
    await assert.rejects(call("library", {}), /request failed/);
    assert.equal(forwarded, false);
  } finally { await new Promise((resolve) => fake.close(resolve)); }
});

test("cancellation aborts a real pending read", async () => {
  const fake = httpServer((_request, _response) => {});
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  try {
    const call = createPccClient({ origin: `http://127.0.0.1:${fake.address().port}`, token, timeoutMs: 50 });
    await assert.rejects(call("library", {}), /timed out|cancelled/);
  } finally { fake.closeAllConnections(); await new Promise((resolve) => fake.close(resolve)); }
});
