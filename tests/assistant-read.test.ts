import assert from "node:assert/strict";
import test from "node:test";
import { assistantRead, planningClock, type AssistantOperation } from "../src/domain/assistant-read.ts";
import { AssistantAccessError, AssistantConflictError, AssistantInputError, parseAssistantDomains, readAssistantJson, requireSameOrigin } from "../src/domain/assistant-access.ts";
import { emptyPersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";
import { createBookDetails, serializeBookDetails } from "../src/domain/library.ts";
import type { Item } from "../src/domain/personal-data.ts";

const now = new Date("2026-10-30T16:00:00Z");
const item = (id: string, kind: Item["kind"], overrides: Partial<Item> = {}): Item => ({ id, kind, title: `Example ${id}`, description: "", actions: [], area: "personal", status: "active", createdAt: "2020-01-01T12:00:00Z", updatedAt: "2020-01-01T12:00:00Z", ...overrides });
function fixture() {
  const snapshot = structuredClone(emptyPersonalDataSnapshot);
  snapshot.items = [
    ...Array.from({ length: 31 }, (_, i) => item(`book-${String(i).padStart(2, "0")}`, "note", { description: serializeBookDetails({ ...createBookDetails("Historical orchard reflection"), author: "Example Author", ownership: i % 2 ? "owned" : "wishlist", readingState: "finished" }) })),
    ...Array.from({ length: 19 }, (_, i) => item(`task-${i}`, "task", { checkInDate: "2026-10-30" })),
    item("unplanned", "task"), item("private", "note", { description: "Unrelated private prose" }),
    item("hidden", "note", { description: "__pcc_keychain_v1__\n{\"password\":\"never-project\"}" }),
    item("project", "project", { actions: [{ id: "action", title: "Open action", targetDate: "2026-10-29", openedAt: now.toISOString(), updatedAt: now.toISOString() }] }),
    item("waiting", "project", { status: "waiting" }),
  ];
  return { revision: 4, snapshot };
}
const domains = ["library", "projects", "tasks", "rhythm", "notes", "reviews", "thoughts"] as const;
function call(operation: AssistantOperation, args: unknown, granted: typeof domains[number][] = [...domains]) {
  return assistantRead(operation, args, fixture(), "account-a", granted, now);
}

test("library inventory paginates beyond context bounds, binds filters and revisions", () => {
  const state = fixture();
  let cursor: string | null = null;
  const ids: string[] = [];
  do {
    const result = assistantRead("library", { limit: 10, ...(cursor ? { cursor } : {}) }, state, "account-a", ["library"], now) as { records: {sourceId: string}[]; nextCursor: string | null; total: number };
    assert.equal(result.total, 31);
    ids.push(...result.records.map((row) => row.sourceId)); cursor = result.nextCursor;
  } while (cursor);
  assert.equal(new Set(ids).size, 31);
  const page = call("library", { limit: 1 }) as { nextCursor: string };
  assert.throws(() => call("library", { ownership: "owned", cursor: page.nextCursor }), AssistantConflictError);
  assert.throws(() => assistantRead("library", { cursor: page.nextCursor }, { ...state, revision: 5 }, "account-a", ["library"], now), AssistantConflictError);
});

test("Library filters preserve wishlist ownership and old records", () => {
  const result = call("library", { ownership: "wishlist", readingState: "finished", limit: 25 }) as { records: { metadata: { ownership: string } }[]; total: number };
  assert.equal(result.total, 16);
  assert.ok(result.records.every((row) => row.metadata.ownership === "wishlist"));
  const search = call("search", { query: "orchard", domains: ["library"] }, ["library"]) as { totalMatches: number; complete: boolean };
  assert.equal(search.totalMatches, 31); assert.equal(search.complete, false);
});

test("all operations enforce explicit domain scope and reject identity injection", () => {
  for (const [op, args] of [["planning", { timezone: "Europe/Lisbon" }], ["search", { domains: ["notes"], query: "private" }], ["read", { domain: "notes", sourceId: "private" }], ["context", { domains: ["notes"] }]] as const) {
    assert.throws(() => call(op, args, ["library"]), AssistantAccessError);
  }
  assert.throws(() => call("library", { userId: "account-b" }), AssistantInputError);
  assert.throws(() => parseAssistantDomains(["keychain"]), AssistantInputError);
  assert.throws(() => parseAssistantDomains(["rhythm"]), AssistantInputError);
  assert.throws(() => call("read", { domain: "notes", sourceId: "hidden" }), AssistantAccessError);
  assert.doesNotMatch(JSON.stringify(call("search", { domains: ["notes"], query: "never project" })), /password|never-project/);
  assert.doesNotMatch(JSON.stringify(call("context", { domains: ["notes"] })), /password|never-project/);
});

test("resolved context does not include unselected granted domains", () => {
  const result = call("context", { domains: ["library"], query: "private orchard" });
  assert.doesNotMatch(JSON.stringify(result), /Unrelated private prose/);
  assert.throws(() => call("context", { domains: ["library"], query: "orchard", current: ["tasks"] }), AssistantInputError);
});

test("planning includes all open work via pagination, explicit calendar limitation and flexible categories", () => {
  const state = fixture();
  state.snapshot.rhythmTemplates = [{ id: "walk", title: "Example intention", state: "active", targetPerWeek: 3, createdAt: now.toISOString(), updatedAt: now.toISOString() }];
  const rows: Record<string, unknown>[] = []; let cursor: string | null = null;
  do {
    const result = assistantRead("planning", { timezone: "Europe/Lisbon", limit: 25, ...(cursor ? { cursor } : {}) }, state, "account-a", [...domains], now) as { records: Record<string, unknown>[]; nextCursor: string | null; calendarCoverage: string; weekStart: string; weekEnd: string };
    assert.equal(result.calendarCoverage, "not-included"); assert.equal(result.weekStart, "2026-10-24"); assert.equal(result.weekEnd, "2026-10-30");
    rows.push(...result.records); cursor = result.nextCursor;
  } while (cursor);
  assert.equal(rows.filter((row) => row.kind === "task").length, 20);
  assert.ok(rows.some((row) => row.category === "needs-next-action"));
  assert.ok(rows.some((row) => row.category === "undated"));
  assert.ok(rows.some((row) => row.category === "overdue"));
  assert.ok(rows.some((row) => row.kind === "rhythm-intention" && row.category === "flexible-this-week"));
});

test("planning calendar dates handle timezone midnight, DST, Saturday and leap dates without host-TZ assumptions", () => {
  assert.equal(planningClock("Pacific/Kiritimati", new Date("2026-10-30T12:00:00Z")).today, "2026-10-31");
  assert.equal(planningClock("Pacific/Kiritimati", new Date("2026-10-30T12:00:00Z")).weekStart, "2026-10-31");
  assert.equal(planningClock("America/New_York", new Date("2026-11-01T05:30:00Z")).today, "2026-11-01");
  assert.equal(planningClock("America/New_York", new Date("2026-11-01T06:30:00Z")).today, "2026-11-01");
  assert.equal(planningClock("UTC", new Date("2028-02-29T00:00:00Z")).weekEnd, "2028-03-03");
  assert.throws(() => call("planning", { timezone: "invalid" }), AssistantInputError);
});

test("single-record projection is bounded and exposes honest page references", () => {
  const state = fixture();
  state.snapshot.items[0].description = serializeBookDetails({ ...createBookDetails("x".repeat(15000)), ownership: "owned" });
  const result = assistantRead("read", { domain: "library", sourceId: "book-00" }, state, "account-a", ["library"], now) as { record: { text: string; truncated: boolean; path: string } };
  assert.equal(result.record.text.length, 12000); assert.equal(result.record.truncated, true); assert.equal(result.record.path, "/library");
  assert.doesNotMatch(JSON.stringify(result), /__pcc_book/);
});

test("grant management requires exact trusted Origin and JSON", () => {
  assert.throws(() => requireSameOrigin(new Request("http://internal/api/assistant-grants", { headers: { Origin: "https://evil.test", "Content-Type": "application/json" } }), "https://pcc.example.test"), AssistantAccessError);
  assert.doesNotThrow(() => requireSameOrigin(new Request("http://internal/api/assistant-grants", { headers: { Origin: "https://pcc.example.test", "Content-Type": "application/json" } }), "https://pcc.example.test"));
});

test("grant JSON bodies are bounded even without Content-Length", async () => {
  await assert.rejects(readAssistantJson(new Request("http://example.test", { method: "POST", body: "x".repeat(5000) })), AssistantInputError);
  await assert.rejects(readAssistantJson(new Request("http://example.test", { method: "POST", body: "not json" })), AssistantInputError);
  assert.deepEqual(await readAssistantJson(new Request("http://example.test", { method: "POST", body: '{"days":7}' })), { days: 7 });
});
