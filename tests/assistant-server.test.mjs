import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

// This test mutates only a deliberately provisioned fictional integration stack.
// Never silently fall back to the production port.
const enabled = process.env.PCC_TEST_ALLOW_FICTIONAL_MUTATIONS === "1" && Boolean(process.env.PCC_TEST_BASE_URL);
const base = process.env.PCC_TEST_BASE_URL;
async function request(path, { cookie, token, body, method = "GET", origin = base } = {}) {
  const response = await fetch(base + path, { method, headers: {
    ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data, response };
}
const read = (operation, input, token) => request(`/api/assistant/${operation}?input=${encodeURIComponent(JSON.stringify(input))}`, { token });

test("assistant grants isolate users/domains, cannot write, and revoke/expire independently", { skip: !enabled }, async () => {
  const memberEmail = `connector-${Date.now()}@example.test`;
  const login = await request("/api/auth/login", { method: "POST", body: { email: "owner@example.test", password: "owner-bootstrap-password-123" } });
  assert.equal(login.status, 200);
  const ownerCookie = login.response.headers.get("set-cookie").split(";", 1)[0];
  const ownerId = login.data.user.id;
  const invite = await request("/api/admin/users", { cookie: ownerCookie, method: "POST", body: { email: memberEmail } });
  assert.equal(invite.status, 200);
  const activation = await request("/api/auth/activate", { method: "POST", body: { token: new URL(invite.data.activationUrl).searchParams.get("token"), password: "fictional-member-password-123" } });
  assert.equal(activation.status, 200);
  const memberLogin = await request("/api/auth/login", { method: "POST", body: { email: memberEmail, password: "fictional-member-password-123" } });
  assert.equal(memberLogin.status, 200);
  const memberCookie = memberLogin.response.headers.get("set-cookie").split(";", 1)[0];

  const book = { id: "connector-example-book", title: "Fictional Orchard", kind: "note", status: "active", area: "personal", actions: [],
    description: '__pcc_book_v3__\n' + JSON.stringify({ author: "Example Author", thoughts: "An old orchard reflection", readingState: "finished", ownership: "owned", priority: "none", contentType: "book", format: "physical", ratings: { overallOverride: 9 } }),
    createdAt: "2020-01-01T12:00:00Z", updatedAt: "2020-01-01T12:00:00Z" };
  const added = await request("/api/personal-data/mutations", { method: "POST", cookie: ownerCookie, body: { type: "add-item", item: book } });
  assert.equal(added.status, 200);

  const deniedOrigin = await request("/api/assistant-grants", { cookie: ownerCookie, method: "POST", origin: "https://evil.example.test", body: { label: "No", domains: ["library"] } });
  assert.equal(deniedOrigin.status, 403);
  assert.equal((await request("/api/assistant-grants", { method: "POST", body: { label: "No", domains: ["library"] } })).status, 401);
  const created = await request("/api/assistant-grants", { cookie: ownerCookie, method: "POST", body: { label: "Fictional Library trial", domains: ["library"], days: 7 } });
  assert.equal(created.status, 201);
  const { token, grant } = created.data;
  assert.match(token, /^pcc_ro_[A-Za-z0-9_-]{43}$/);
  const listed = await request("/api/assistant-grants", { cookie: ownerCookie });
  assert.equal(listed.status, 200); assert.doesNotMatch(JSON.stringify(listed.data), /token|hash/);
  const library = await read("library", {}, token);
  assert.equal(library.status, 200); assert.ok(library.data.records.some((row) => row.sourceId === book.id));
  assert.match(library.response.headers.get("cache-control"), /private.*no-store/);
  const historical = await read("search", { query: "orchard", domains: ["library"] }, token);
  assert.equal(historical.status, 200); assert.ok(historical.data.totalMatches > 0);
  assert.equal((await read("planning", { timezone: "UTC" }, token)).status, 403);
  assert.equal((await read("read", { domain: "notes", sourceId: book.id }, token)).status, 403);
  assert.equal((await read("context", { domains: ["notes"] }, token)).status, 403);
  assert.equal((await read("library", { userId: activation.data.user.id }, token)).status, 400);
  assert.equal((await read("library", {}, "pcc_ro_" + "z".repeat(43))).status, 403);
  assert.equal((await read("library", {})).status, 401);

  // Bearer grant must never become a general browser or write credential.
  for (const path of ["/api/personal-data", "/api/personal-data/export", "/api/admin/users", "/api/assistant-grants"]) {
    assert.equal((await request(path, { token })).status, 401);
  }
  for (const path of ["/api/personal-data/mutations", "/api/personal-data/import", "/api/book-covers", "/api/integrations/google-calendar/events"]) {
    assert.equal((await request(path, { token, method: "POST", body: {} })).status, 401);
  }
  assert.equal((await request("/api/assistant/library", { token, method: "POST", body: {} })).status, 405);

  const member = await request("/api/assistant-grants", { cookie: memberCookie, method: "POST", body: { label: "Other fictional account", domains: ["library"] } });
  assert.equal(member.status, 201);
  const memberLibrary = await read("library", {}, member.data.token);
  assert.equal(memberLibrary.status, 200); assert.equal(memberLibrary.data.total, 0);
  assert.equal((await read("read", { domain: "library", sourceId: book.id }, member.data.token)).status, 403);
  assert.equal((await request("/api/assistant-grants", { cookie: memberCookie, method: "DELETE", body: { id: grant.id } })).status, 204);
  assert.equal((await read("library", {}, token)).status, 200);
  assert.equal((await request("/api/assistant-grants", { cookie: ownerCookie, method: "DELETE", body: { id: grant.id } })).status, 204);
  assert.equal((await read("library", {}, token)).status, 403);

  const planning = await request("/api/assistant-grants", { cookie: ownerCookie, method: "POST", body: { label: "Planning test", domains: ["projects", "tasks", "rhythm"] } });
  assert.equal(planning.status, 201);
  const plan = await read("planning", { timezone: "Europe/Lisbon" }, planning.data.token);
  assert.equal(plan.status, 200); assert.equal(plan.data.calendarCoverage, "not-included");
  assert.equal((await read("library", {}, planning.data.token)).status, 403);

  if (process.env.PCC_TEST_DATABASE_URL) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.PCC_TEST_DATABASE_URL, { max: 1 });
    try {
      const [stored] = await sql`select token_hash from assistant_grants where id = ${planning.data.grant.id}`;
      assert.equal(stored.token_hash, createHash("sha256").update(planning.data.token).digest("hex"));
      await sql`update assistant_grants set expires_at = now() - interval '1 second' where id = ${planning.data.grant.id}`;
      assert.equal((await read("planning", { timezone: "UTC" }, planning.data.token)).status, 403);
      await sql`update users set status = 'revoked' where id = ${activation.data.user.id}`;
      assert.equal((await read("library", {}, member.data.token)).status, 403);
      assert.notEqual(ownerId, activation.data.user.id);
    } finally { await sql.end(); }
  }
});
