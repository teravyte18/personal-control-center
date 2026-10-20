import assert from "node:assert/strict";
import test from "node:test";
import { emptyReview, type Item } from "../src/domain/personal-data.ts";
import { emptyPersonalDataSnapshot, type PersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";
import { parseResolvedContextParams, resolvePersonalContext } from "../src/domain/resolved-context.ts";

const now = new Date("2026-10-20T12:00:00.000Z");
const old = "2021-01-02T10:00:00.000Z";
const recent = "2026-10-19T10:00:00.000Z";

function item(id: string, title: string, kind: Item["kind"], overrides: Partial<Item> = {}): Item {
  return {
    id, title, kind, description: "", actions: [],
    status: "active", area: "personal",
    createdAt: old, updatedAt: recent, ...overrides,
  };
}
function snapshot(items: Item[] = [], overrides: Partial<PersonalDataSnapshot> = {}): PersonalDataSnapshot {
  return { ...emptyPersonalDataSnapshot, items, ...overrides };
}
function options(input: string) {
  return parseResolvedContextParams(new URLSearchParams(input));
}

test("resolved-context params share strict Phase 2 validation and have bounded budgets", () => {
  const parsed = options("q=thesis");
  assert.equal(parsed.maxChars, 8000);
  assert.equal(parsed.maxRecords, 12);
  assert.deepEqual(parsed.includeCurrent, []);
  assert.deepEqual(parsed.search.domains, ["reviews", "library", "projects", "tasks", "thoughts", "notes"]);
  const custom = options("q=thesis&current=tasks,rhythm,tasks&maxChars=1000&maxRecords=1&limit=3");
  assert.deepEqual(custom.includeCurrent, ["tasks", "rhythm"]);
  assert.equal(custom.search.limit, 3);
  assert.equal(custom.maxRecords, 1);
  assert.equal(custom.maxChars, 1000);

  assert.throws(() => options("q=thesis&current=keychain"), /Unsupported current-state/);
  assert.throws(() => options("q=thesis&domains=keychain"), /supported retrieval domains/);
  assert.throws(() => options("q=thesis&userId=other"), /Unsupported resolved-context parameter/);
  assert.throws(() => options("q=thesis&q=other"), /Repeated resolved-context/);
  assert.throws(() => options("q=thesis&maxChars=500"), /between 1000 and 20000/);
  assert.throws(() => options("q=thesis&maxChars=99999999"), /between 1000 and 20000/);
  assert.throws(() => options("q=thesis&maxChars=2e3"), /between 1000 and 20000/);
  assert.throws(() => options("q=thesis&maxRecords=21"), /between 1 and 20/);
  assert.throws(() => options("q=thesis&from=2026-02-31"), /valid inclusive date range/);
});

test("old Reviews outside raw context window remain discoverable and retain canonical references", () => {
  const history = Array.from({ length: 28 }, (_, index) => ({
    ...emptyReview,
    id: "review-" + index,
    periodStart: "2021-01-01",
    periodEnd: "2021-01-07",
    completedAt: old,
    difficult: index === 27 ? "Thesis motivation disappeared without deadlines" : "Ordinary week",
  }));
  const result = resolvePersonalContext(snapshot([], { history }), "account",
    options("q=thesis%20motivation&domains=reviews&maxChars=3000"), now);
  assert.equal(result.mode, "manual-deterministic");
  assert.equal(result.search.totalMatches, 1);
  assert.equal(result.search.results[0].sourceId, "review-27");
  assert.equal(result.selected[0].origin, "retrieved");
  assert.equal(result.selected[0].sourceRefs[0].sourceId, "review-27");
  assert.equal(result.selected[0].sourceKind, "review");
  assert.match(result.finalContext, /Thesis motivation disappeared/);
  assert.ok(result.budget.usedChars <= 3000);
  assert.ok(result.warnings.some((message) => /not semantic/.test(message)));
});

test("selected current Projects/Tasks are included even without a keyword match", () => {
  const data = snapshot([
    item("project", "Manage bills", "project", {
      description: "Work on the household",
      actions: [{
        id: "action", title: "Schedule electrician", details: "Call company",
        openedAt: old, updatedAt: recent, targetDate: "",
      }],
    }),
    item("task", "Buy groceries", "task", { checkInDate: "2026-10-23" }),
    item("archived", "Retired plan", "task", { status: "archived" }),
  ]);
  const result = resolvePersonalContext(data, "account",
    options("q=nonexistent&current=projects,tasks"), now);
  assert.equal(result.search.totalMatches, 0);
  assert.deepEqual(result.selected.map((d) => d.sourceId), ["project", "project", "task"]);
  assert.deepEqual(result.selected.map((d) => d.sourceSubId ?? ""), ["", "action", ""]);
  assert.ok(result.selected.every((d) => d.origin === "current"));
  assert.ok(result.selected.every((d) => d.reasons.length > 0));
  assert.ok(!result.finalContext.includes("Retired plan"));
});

test("current and search matches use one canonical document with merged reasons", () => {
  const data = snapshot([
    item("task", "Thesis analysis", "task", { description: "Read the thesis paper" }),
    item("other", "Other task", "task"),
  ]);
  const result = resolvePersonalContext(data, "account",
    options("q=thesis&current=tasks&domains=tasks"), now);
  assert.equal(result.search.totalMatches, 1);
  assert.equal(result.budget.deduplicatedMatches, 1);
  assert.equal(result.selected.filter((entry) => entry.sourceId === "task").length, 1);
  assert.equal(result.selected[0].origin, "current");
  assert.ok(result.selected[0].reasons.some((reason) => /Title terms/.test(reason)));
  assert.ok(result.selected[0].reasons.some((reason) => /Open task/.test(reason)));
});

test("old history remains represented when unrelated current state is selected", () => {
  const tasks = Array.from({ length: 15 }, (_, index) =>
    item("task-" + index, "Daily chore " + index, "task"));
  const data = snapshot(tasks, { history: [{
    ...emptyReview, id: "old-review", completedAt: old,
    periodStart: "2021-01-01", periodEnd: "2021-01-07",
    learned: "CUDA optimization challenges",
  }] });
  const result = resolvePersonalContext(data, "account",
    options("q=CUDA&current=tasks&maxRecords=4&maxChars=6000"), now);
  assert.ok(result.selected.some((entry) => entry.sourceId === "old-review"));
  assert.ok(result.selected.some((entry) => entry.origin === "current"));
  assert.ok(result.excluded.some((entry) => entry.reason === "Record limit reached"));
});

test("budget applies only after retrieval; no source exceeds overall character cap", () => {
  const long = "Deep dive on CUDA ".repeat(600);
  const data = snapshot([
    item("a", "CUDA one", "note", { description: long }),
    item("b", "CUDA two", "note", { description: long }),
    item("c", "CUDA three", "note", { description: long }),
  ]);
  const result = resolvePersonalContext(data, "account",
    options("q=CUDA&maxChars=1000&maxRecords=3"), now);
  assert.equal(result.search.totalMatches, 3);
  assert.ok(result.budget.usedChars <= 1000);
  assert.equal(result.budget.usedChars, result.finalContext.length);
  assert.ok(result.selected.every((entry) => entry.content.length <= 1800));
  assert.ok(result.budget.truncatedRecords > 0);
  assert.ok(result.selected.some((entry) => entry.truncated));
  assert.ok(result.excluded.length > 0);
  assert.ok(result.warnings.some((message) => /excluded/.test(message)));
});

test("Rhythm is derived from the canonical weekly provider with explicit source references", () => {
  const data = snapshot([], {
    rhythmTemplates: [{
      id: "running", title: "Run", targetPerWeek: 3, state: "active",
      createdAt: recent, updatedAt: recent,
    }],
    rhythmCompletions: [{
      id: "run-1", templateId: "running", completedAt: "2026-10-19T08:00:00.000Z",
    }],
  });
  const result = resolvePersonalContext(data, "account",
    options("q=nonexistent&current=rhythm"), now);
  assert.equal(result.search.totalMatches, 0);
  assert.equal(result.selected.length, 1);
  assert.equal(result.selected[0].sourceKind, "derived-rhythm-snapshot");
  assert.deepEqual(result.selected[0].sourceRefs, [{ domain: "rhythm-template", sourceId: "running" }]);
  assert.match(result.finalContext, /"targetPerWeek": 3/);
  assert.match(result.finalContext, /"completedThisWeek": 1/);
});

test("deleted or edited source content is never left behind in subsequent resolution", () => {
  const before = resolvePersonalContext(snapshot([item("one", "Journal", "note", { description: "Rare memory" })]),
    "account", options("q=memory"), now);
  assert.equal(before.search.totalMatches, 1);
  const edited = resolvePersonalContext(snapshot([item("one", "Journal", "note", { description: "Something different" })]),
    "account", options("q=memory"), now);
  assert.equal(edited.search.totalMatches, 0);
  const deleted = resolvePersonalContext(snapshot([]), "account", options("q=memory"), now);
  assert.equal(deleted.search.totalMatches, 0);
  assert.equal(deleted.finalContext, "");
});

test("only requested domains enter the response, and Keychain remains absent", () => {
  const data = snapshot([
    item("task", "Visible thesis", "task"),
    item("secret", "Private keychain", "note", {
      description: "__pcc_keychain_v1__\n{\"password\":\"very-secret\"}",
    }),
    item("thought", "Separate thesis", "thought"),
  ]);
  const result = resolvePersonalContext(data, "account",
    options("q=thesis&domains=tasks"), now);
  assert.deepEqual(result.selected.map((entry) => entry.sourceId), ["task"]);
  assert.doesNotMatch(JSON.stringify(result), /very-secret|Private keychain|Separate thesis/);
});
