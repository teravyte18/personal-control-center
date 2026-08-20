import assert from "node:assert/strict";
import test from "node:test";
import {
  getNotes,
  NOTE_ORDER_METADATA_TITLE,
  noteContent,
  parseNoteContent,
  parseNoteOrder,
  reorderNotes,
  serializeNoteOrder,
} from "../src/domain/notes.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(overrides: Partial<Item>): Item {
  return {
    id: "item-1",
    title: "Neutral item",
    description: "",
    actions: [],
    kind: "note",
    status: "active",
    area: "uncategorized",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function orderMetadata(description: string): Item {
  return item({
    id: "note-order",
    title: NOTE_ORDER_METADATA_TITLE,
    description,
    kind: "unclassified",
    status: "archived",
  });
}

test("uses the first line as the implicit note title", () => {
  assert.deepEqual(parseNoteContent("Reading list\nBook one\nBook two"), {
    title: "Reading list",
    description: "Book one\nBook two",
  });
  assert.deepEqual(parseNoteContent("  Single line note  "), {
    title: "Single line note",
    description: "",
  });
  assert.equal(parseNoteContent("   \n   "), null);
});

test("normalizes line endings and reconstructs editable note content", () => {
  const parsed = parseNoteContent("Project references\r\nLink one\r\nLink two");
  assert.ok(parsed);
  assert.equal(noteContent(parsed), "Project references\nLink one\nLink two");
});

test("shows only organised active notes and initially orders them by last edit", () => {
  const notes = getNotes([
    item({ id: "older", title: "Older", updatedAt: "2026-07-20T10:00:00.000Z" }),
    item({ id: "newer", title: "Newer", updatedAt: "2026-07-22T10:00:00.000Z" }),
    item({ id: "inbox", title: "Still in Inbox", status: "inbox" }),
    item({ id: "thought", title: "Thought", kind: "thought" }),
    item({ id: "archived", title: "Archived", status: "archived" }),
    item({ id: "legacy-book", title: "Legacy book", description: "__pcc_book_v1__\n{}" }),
    item({ id: "current-book", title: "Current book", description: "__pcc_book_v2__\n{}" }),
  ]);

  assert.deepEqual(notes.map((note) => note.id), ["newer", "older"]);
});

test("manual order persists while newly created unordered notes appear first", () => {
  const items = [
    item({ id: "one", title: "One", updatedAt: "2026-07-20T10:00:00.000Z" }),
    item({ id: "two", title: "Two", updatedAt: "2026-07-21T10:00:00.000Z" }),
    orderMetadata(JSON.stringify(["two", "one"])),
  ];

  assert.deepEqual(parseNoteOrder(items), ["two", "one"]);
  assert.deepEqual(getNotes(items).map((note) => note.id), ["two", "one"]);

  const withNewNote = [
    ...items,
    item({ id: "new", title: "New", updatedAt: "2026-07-22T10:00:00.000Z" }),
  ];
  assert.deepEqual(getNotes(withNewNote).map((note) => note.id), ["new", "two", "one"]);
});

test("reorders cards and serializes their ids", () => {
  const notes = [
    item({ id: "one" }),
    item({ id: "two" }),
    item({ id: "three" }),
  ];
  const reordered = reorderNotes(notes, "three", "one");

  assert.deepEqual(reordered.map((note) => note.id), ["three", "one", "two"]);
  assert.equal(serializeNoteOrder(reordered), '["three","one","two"]');
  assert.deepEqual(reorderNotes(notes, "missing", "one"), notes);
});

test("ignores malformed note-order metadata", () => {
  assert.deepEqual(parseNoteOrder([orderMetadata("not json")]), []);
  assert.deepEqual(parseNoteOrder([orderMetadata('["one",42,"one","two"]')]), ["one", "two"]);
});
