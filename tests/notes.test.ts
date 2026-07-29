import assert from "node:assert/strict";
import test from "node:test";
import { getNotes, noteContent, parseNoteContent } from "../src/domain/notes.ts";
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

test("shows only organised active notes and orders them by last edit", () => {
  const notes = getNotes([
    item({ id: "older", title: "Older", updatedAt: "2026-07-20T10:00:00.000Z" }),
    item({ id: "newer", title: "Newer", updatedAt: "2026-07-22T10:00:00.000Z" }),
    item({ id: "inbox", title: "Still in Inbox", status: "inbox" }),
    item({ id: "thought", title: "Thought", kind: "thought" }),
    item({ id: "archived", title: "Archived", status: "archived" }),
  ]);

  assert.deepEqual(notes.map((note) => note.id), ["newer", "older"]);
});
