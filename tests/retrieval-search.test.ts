import assert from "node:assert/strict";
import test from "node:test";
import { createBookDetails, serializeBookDetails } from "../src/domain/library.ts";
import { emptyReview, type Item } from "../src/domain/personal-data.ts";
import { emptyPersonalDataSnapshot, type PersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";
import { buildRetrievalDocuments, type RetrievalDocument } from "../src/domain/retrieval-documents.ts";
import {
  parseRetrievalSearchParams, RetrievalSearchInputError, searchRetrievalDocuments,
} from "../src/domain/retrieval-search.ts";

const old = "2021-01-03T12:00:00.000Z";
const recent = "2026-10-19T12:00:00.000Z";
const now = new Date("2026-10-20T12:00:00.000Z");

function item(id: string, title: string, kind: Item["kind"], overrides: Partial<Item> = {}): Item {
  return { id, title, kind, description: "", actions: [], status: "active", area: "personal",
    createdAt: old, updatedAt: old, ...overrides };
}
function snapshot(items: Item[], overrides: Partial<PersonalDataSnapshot> = {}): PersonalDataSnapshot {
  return { ...emptyPersonalDataSnapshot, items, ...overrides };
}
function options(query: string, settings: URLSearchParams = new URLSearchParams()) {
  settings.set("q", query);
  return parseRetrievalSearchParams(settings);
}
function search(documents: RetrievalDocument[], query: string, settings = new URLSearchParams()) {
  return searchRetrievalDocuments(documents, "owner", options(query, settings), now);
}

test("strict input validation and bounded defaults", () => {
  const parsed = options("  thesis  ");
  assert.equal(parsed.query, "thesis");
  assert.equal(parsed.limit, 10);
  assert.deepEqual(parsed.domains, ["reviews", "library", "projects", "tasks", "thoughts", "notes"]);
  assert.deepEqual(options("física", new URLSearchParams("limit=25&domains=notes,reviews,notes&from=2020-01-01&to=2026-10-20")).domains, ["notes", "reviews"]);
  assert.throws(() => parseRetrievalSearchParams(new URLSearchParams("q=")), RetrievalSearchInputError);
  assert.throws(() => options("what did I do"), /meaningful search terms/);
  assert.throws(() => options("x".repeat(241)), /240/);
  assert.throws(() => options("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen"), /16 meaningful/);
  assert.throws(() => options("thesis", new URLSearchParams("domains=keychain")), /supported retrieval domains/);
  assert.throws(() => options("thesis", new URLSearchParams("domains=")), /supported retrieval domains/);
  assert.throws(() => options("thesis", new URLSearchParams("limit=0")), /between 1 and 25/);
  assert.throws(() => options("thesis", new URLSearchParams("limit=26")), /between 1 and 25/);
  assert.throws(() => options("thesis", new URLSearchParams("limit=1.5")), /between 1 and 25/);
  assert.throws(() => options("thesis", new URLSearchParams("from=2025-02-29")), /valid inclusive date/);
  assert.throws(() => options("thesis", new URLSearchParams("from=2026-11-01&to=2026-10-01")), /valid inclusive date/);
  assert.throws(() => parseRetrievalSearchParams(new URLSearchParams("q=thesis&q=another")), /Repeated search parameters/);
  assert.throws(() => options("thesis", new URLSearchParams("userId=someone-else")), /Unsupported search parameter/);
});

test("exact title and phrase matches outrank loose body matches with reasons", () => {
  const docs = buildRetrievalDocuments(snapshot([
    item("exact", "Avengers Twilight", "note", { updatedAt: old }),
    item("title-terms", "Twilight Avengers explained", "note"),
    item("body", "Comic reflection", "note", { description: "Avengers Twilight art was memorable" }),
    item("partial", "Unrelated idea", "note", { description: "I enjoy Avengers comics" }),
  ]), "owner");
  const result = search(docs, "Avengers Twilight");
  assert.deepEqual(result.results.map((d) => d.sourceId), ["exact", "title-terms", "body", "partial"]);
  assert.equal(result.results[0].reasons[0], "Exact title match");
  assert.ok(result.results[1].reasons.some((r) => r.includes("All search terms in title")));
  assert.ok(result.results[2].reasons.some((r) => r.includes("Search phrase occurs in text")));
  assert.equal(result.totalMatches, 4);
  assert.ok(result.results.every((hit) => hit.snippet.length <= 362));
});

test("full historical reviews and archived task actions remain retrievable, unlike bounded context", () => {
  const reviews = Array.from({ length: 26 }, (_, i) => ({
    ...emptyReview, id: "review-" + i, periodStart: "2021-01-01", periodEnd: "2021-01-07",
    difficult: i === 25 ? "Struggled with thesis motivation" : "Routine checkup",
    completedAt: old,
  }));
  const project = item("project", "Master work", "project", {
    status: "archived", actions: [{
      id: "action", title: "Benchmark placement", targetDate: "",
      openedAt: old, updatedAt: old, completedAt: old,
      details: "CUDA throughput baseline", completionNote: "GPU benchmark complete",
    }],
  });
  const corpus = buildRetrievalDocuments(snapshot([project], { history: reviews }), "owner");
  const thesis = search(corpus, "thesis motivation");
  assert.equal(thesis.results[0].sourceId, "review-25");
  assert.equal(thesis.results[0].domain, "reviews");
  assert.equal(thesis.results[0].occurredAt, old);
  const gpu = search(corpus, "GPU benchmark");
  assert.equal(gpu.results[0].sourceId, "project");
  assert.equal(gpu.results[0].sourceSubId, "action");
  assert.equal(gpu.results[0].metadata.completed, true);
  assert.ok(gpu.results[0].reasons.some((r) => r.includes("Text terms")));
});

test("domain and inclusive event-date filters apply before ranking", () => {
  const doc = buildRetrievalDocuments(snapshot([
    item("old-note", "Physics experiment", "note", { createdAt: old, updatedAt: recent }),
    item("recent-task", "Physics experiment", "task", { createdAt: recent, updatedAt: recent }),
  ]), "owner");
  const notes = search(doc, "physics", new URLSearchParams("domains=notes"));
  assert.deepEqual(notes.results.map((d) => d.sourceId), ["old-note"]);
  const bounded = search(doc, "physics", new URLSearchParams("from=2026-10-19&to=2026-10-19"));
  assert.deepEqual(bounded.results.map((d) => d.sourceId), ["recent-task"]);
  const byOldDate = search(doc, "physics", new URLSearchParams("to=2021-01-03"));
  assert.deepEqual(byOldDate.results.map((d) => d.sourceId), ["old-note"]);
});

test("unmatched documents do not enter results; Unicode diacritics are normalized", () => {
  const docs = buildRetrievalDocuments(snapshot([
    item("portuguese", "Física Computacional", "note"),
    item("other", "Baking bread", "note"),
  ]), "owner");
  const matched = search(docs, "fisica");
  assert.equal(matched.totalMatches, 1);
  assert.equal(matched.results[0].sourceId, "portuguese");
  assert.equal(search(docs, "nonexistent").totalMatches, 0);
});

test("limit is applied after full-corpus search; stable tie order", () => {
  const docs = buildRetrievalDocuments(snapshot(Array.from({ length: 40 }, (_, i) =>
    item("item-" + i, "Same term", "note", { updatedAt: old }),
  )), "owner");
  const inputs = new URLSearchParams("limit=3");
  const first = search(docs, "term", inputs);
  const reordered = search([...docs].reverse(), "term", inputs);
  assert.equal(first.totalMatches, 40);
  assert.equal(first.results.length, 3);
  assert.deepEqual(first, reordered);
  assert.ok(first.results.every(d => d.reasons.includes("Title terms: term")));
});

test("search independently enforces the account boundary and never returns raw record bodies", () => {
  const own = item("shared", "My private unique thesis", "note", {
    description: "thesis " + "do-not-return-full-secret-body".repeat(50),
  });
  const others = item("shared", "Their private thesis", "note", { description: "thesis second-account" });
  const all = [
    ...buildRetrievalDocuments(snapshot([own]), "owner"),
    ...buildRetrievalDocuments(snapshot([others]), "second"),
  ];
  const result = search(all, "thesis");
  assert.equal(result.totalMatches, 1);
  assert.equal(result.results[0].title, own.title);
  assert.ok(result.results[0].id.startsWith("owner:"));
  assert.equal("text" in result.results[0], false);
  assert.equal("userId" in result.results[0], false);
  assert.doesNotMatch(JSON.stringify(result), /Their private|second-account/);
  assert.throws(() => searchRetrievalDocuments(all, "", options("thesis")), /user ID/);
});

test("edited/deleted records are reflected by rebuilding the canonical projection", () => {
  const before = buildRetrievalDocuments(snapshot([item("doc", "Journal", "note", { description: "An interesting memory" })]), "owner");
  assert.equal(search(before, "memory").totalMatches, 1);
  const after = buildRetrievalDocuments(snapshot([item("doc", "Journal", "note", { description: "Changed content" })]), "owner");
  assert.equal(search(after, "memory").totalMatches, 0);
  assert.equal(search(after, "changed").totalMatches, 1);
  assert.equal(search(buildRetrievalDocuments(snapshot([]), "owner"), "changed").totalMatches, 0);
});

test("Library matches decoded author, title and reflection rather than serialized payload", () => {
  const book = item("book", "The Myth of Sisyphus", "note", {
    description: serializeBookDetails({ ...createBookDetails("Good prose"), author: "Albert Camus" }),
  });
  const docs = buildRetrievalDocuments(snapshot([book]), "owner");
  const result = search(docs, "Camus");
  assert.equal(result.results[0].domain, "library");
  assert.equal(result.results[0].sourceKind, "book");
  assert.equal(result.results[0].sourceId, "book");
  assert.equal(result.results[0].metadata.status, "active");
});
