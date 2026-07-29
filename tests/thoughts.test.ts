import assert from "node:assert/strict";
import test from "node:test";
import { getThoughts } from "../src/domain/thoughts.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(overrides: Partial<Item>): Item {
  return {
    id: "item-1",
    title: "Neutral item",
    description: "",
    actions: [],
    kind: "thought",
    status: "active",
    area: "uncategorized",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

test("thoughts space excludes notes and archived thoughts", () => {
  const thoughts = getThoughts([
    item({ id: "older", title: "Older thought" }),
    item({ id: "newer", title: "Newer thought", createdAt: "2026-07-22T10:00:00.000Z" }),
    item({ id: "note", title: "A note", kind: "note" }),
    item({ id: "archived", title: "Archived thought", status: "archived" }),
  ]);

  assert.deepEqual(thoughts.map((thought) => thought.id), ["newer", "older"]);
});
