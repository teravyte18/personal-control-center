import assert from "node:assert/strict";
import test from "node:test";
import { emptyPersonalDataSnapshot, type PersonalDataSnapshot } from "../src/domain/personal-data-snapshot.ts";
import { createBookDetails, serializeBookDetails } from "../src/domain/library.ts";
import { createMediaDetails, serializeMediaDetails } from "../src/domain/media.ts";
import { NOTE_ORDER_METADATA_TITLE } from "../src/domain/notes.ts";
import { emptyReview, type Item } from "../src/domain/personal-data.ts";
import { buildRetrievalDocuments, retrievalDomains } from "../src/domain/retrieval-documents.ts";

const old = "2021-01-02T12:00:00.000Z";
const recent = "2026-10-15T12:00:00.000Z";

function item(id: string, title: string, kind: Item["kind"], overrides: Partial<Item> = {}): Item {
  return {
    id, title, kind, description: "", actions: [], status: "active", area: "personal",
    createdAt: old, updatedAt: recent, ...overrides,
  };
}
function snapshot(overrides: Partial<PersonalDataSnapshot>): PersonalDataSnapshot {
  return { ...emptyPersonalDataSnapshot, ...overrides };
}

test("Phase 1 projects complete eligible history without 12-record or 90-day context limits", () => {
  const history = Array.from({ length: 24 }, (_, index) => ({
    ...emptyReview, id: "review-" + index,
    periodStart: "2021-01-01", periodEnd: "2021-01-07",
    learned: "An old reflection " + index, completedAt: old,
  }));
  const items = Array.from({ length: 30 }, (_, index) =>
    item("task-" + index, "Old task " + index, "task", {
      status: index === 0 ? "archived" : index === 1 ? "completed" : "active",
    }),
  );
  const documents = buildRetrievalDocuments(snapshot({
    items, history,
    draft: { ...emptyReview, learned: "Private unsubmitted draft must not appear" },
  }), "user-1");
  assert.equal(documents.length, 54);
  assert.equal(documents.filter((document) => document.domain === "reviews").length, 24);
  assert.ok(documents.some((document) => document.sourceId === "review-23" && document.text.includes("old reflection 23")));
  assert.ok(documents.some((document) => document.sourceId === "task-0" && document.metadata.status === "archived"));
  assert.ok(documents.some((document) => document.sourceId === "task-1" && document.metadata.status === "completed"));
  assert.ok(!JSON.stringify(documents).includes("Private unsubmitted draft"));
  assert.deepEqual(retrievalDomains, ["reviews", "library", "projects", "tasks", "thoughts", "notes"]);
});

test("Projects produce a parent document and every historical action with stable provenance", () => {
  const project = item("project:alpha", "Master thesis", "project", {
    status: "archived", description: "GPU placement", projectTakeaways: "Keep tests repeatable",
    actions: [
      {
        id: "run:1", title: "Benchmark first version", targetDate: "2025-03-01",
        details: "Compare CPU with CUDA", completionNote: "Speed improved", openedAt: old,
        updatedAt: recent, completedAt: recent, reschedules: [{
          previousTargetDate: "2025-02-01", targetDate: "2025-03-01",
          changedAt: old, note: "Hardware unavailable",
        }],
      },
      {
        id: "run:2", title: "Write up", targetDate: "",
        openedAt: old, updatedAt: old,
      },
    ],
  });
  const docs = buildRetrievalDocuments(snapshot({ items: [project] }), "user");
  assert.equal(docs.length, 3);
  const root = docs.find((entry) => entry.sourceKind === "project");
  const action = docs.find((entry) => entry.sourceSubId === "run:1");
  assert.ok(root);
  assert.ok(action);
  assert.equal(root.sourceId, "project:alpha");
  assert.equal(action.sourceId, "project:alpha");
  assert.equal(action.sourceKind, "project-action");
  assert.equal(action.metadata.completed, true);
  assert.equal(action.metadata.targetDate, "2025-03-01");
  assert.match(action.text, /Compare CPU with CUDA/);
  assert.match(action.text, /Speed improved/);
  assert.match(action.text, /Hardware unavailable/);
  assert.match(root.text, /Keep tests repeatable/);
  assert.equal(new Set(docs.map((d) => d.id)).size, 3);
});

test("Books, comics and media are Library records, not raw serialized Notes", () => {
  const book = item("book", "Avengers: Twilight", "note", {
    description: serializeBookDetails({
      ...createBookDetails("A memorable ending"),
      author: "Chip Zdarsky", contentType: "comic", currentIssue: "#6", issuesRead: "#1–6",
      readingState: "finished", ownership: "owned", ratings: { overallOverride: 9 },
      coverId: "private-cover-id",
    }),
  });
  const series = item("series", "Arcane", "note", {
    description: serializeMediaDetails({
      ...createMediaDetails(), type: "series", status: "watching",
      currentSeason: 2, currentEpisode: 3, thoughts: "Love the art",
      posterId: "private-poster-id",
    }),
  });
  const rawNote = item("note", "Useful notes", "note", { description: "Markdown paragraph\n- item" });
  const unknown = item("unknown", "Sensitive structured record", "note", {
    description: "__pcc_password_v9__\n" + JSON.stringify({ password: "should-never-be-indexed" }),
  });
  const malformed = item("malformed", "Broken Book", "note", {
    description: "__pcc_book_v3__\n{invalid",
  });
  const ordering = item("ordering", NOTE_ORDER_METADATA_TITLE, "note", {
    description: "note metadata only", status: "archived",
  });
  const docs = buildRetrievalDocuments(snapshot({
    items: [rawNote, unknown, malformed, ordering, series, book],
  }), "account");
  assert.equal(docs.length, 3);
  const b = docs.find((d) => d.sourceId === "book");
  const m = docs.find((d) => d.sourceId === "series");
  assert.equal(b?.domain, "library");
  assert.equal(b?.sourceKind, "book");
  assert.equal(b?.metadata.type, "comic");
  assert.equal(b?.metadata.rating, 9);
  assert.match(b?.text ?? "", /Chip Zdarsky/);
  assert.match(b?.text ?? "", /#1–6/);
  assert.equal(m?.sourceKind, "series");
  assert.match(m?.text ?? "", /Love the art/);
  assert.equal(m?.metadata.status, "watching");
  assert.equal(docs.find((d) => d.sourceId === "note")?.domain, "notes");
  assert.doesNotMatch(JSON.stringify(docs), /private-cover-id|private-poster-id|should-never-be-indexed|__pcc_/);
});

test("Old archived Notes and Thoughts remain accessible, without unrelated spaces", () => {
  const records: Item[] = [
    item("note", "Reference", "note", { status: "archived", description: "Historical instructions" }),
    item("thought", "Idea", "thought", { status: "archived", description: "Maybe do this eventually" }),
    item("task", "Task", "task", { status: "completed", description: "Closed task" }),
    item("inbox", "Unprocessed", "unclassified", { description: "Not selected for retrieval" }),
    item("keychain", "Encrypted vault", "note", {
      description: "__pcc_keychain_v1__\n" + JSON.stringify({ secret: "never-project-me" }),
    }),
  ];
  const docs = buildRetrievalDocuments(snapshot({ items: records }), "account");
  assert.deepEqual(docs.map((d) => d.domain).sort(), ["notes", "tasks", "thoughts"]);
  assert.match(docs.find((d) => d.domain === "notes")?.text ?? "", /Historical instructions/);
  assert.doesNotMatch(JSON.stringify(docs), /never-project-me|Not selected for retrieval/);
});

test("Projection is deterministic, account-scoped and reflects canonical edits/deletions", () => {
  const a = item("shared-id", "Original", "task");
  const b = item("other", "Personal note", "note", { description: "Before" });
  const data = snapshot({ items: [a, b] });
  const originalSnapshot = structuredClone(data);
  const first = buildRetrievalDocuments(data, "alice");
  const reversed = buildRetrievalDocuments(snapshot({ items: [b, a] }), "alice");
  assert.deepEqual(first, reversed);
  assert.deepEqual(data, originalSnapshot, "Projection may not mutate snapshot or embedded arrays");
  const otherUser = buildRetrievalDocuments(data, "bob");
  assert.ok(first.every((d, index) => d.userId === "alice" && d.id !== otherUser[index].id));
  const changed = buildRetrievalDocuments(snapshot({
    items: [{ ...b, description: "After" }],
  }), "alice");
  assert.equal(changed.length, 1);
  assert.equal(changed[0].id, first.find((d) => d.sourceId === "other")?.id);
  assert.match(changed[0].text, /After/);
  assert.doesNotMatch(JSON.stringify(changed), /Original|Before/);
  assert.throws(() => buildRetrievalDocuments(data, ""), /user ID is required/);
});
