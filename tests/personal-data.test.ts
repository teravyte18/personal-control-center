import assert from "node:assert/strict";
import test from "node:test";
import {
  isCompletedThisWeek,
  isCreatedThisWeek,
  normalizeItem,
  normalizeItems,
  normalizeReviewDraft,
  toggleItemCompleted,
  transitionItemStatus,
  type Item,
} from "../src/domain/personal-data.ts";

const baseItem: Item = {
  id: "item-1",
  title: "Neutral example",
  description: "",
  kind: "project",
  status: "waiting",
  area: "uncategorized",
  createdAt: "2026-07-14T10:00:00.000Z",
  updatedAt: "2026-07-14T10:00:00.000Z",
};

test("normalizes legacy items with safe defaults", () => {
  const item = normalizeItem({ id: "legacy", title: "Legacy item" }, new Date("2026-07-15T12:00:00.000Z"));

  assert.ok(item);
  assert.equal(item.kind, "unclassified");
  assert.equal(item.status, "inbox");
  assert.equal(item.area, "uncategorized");
  assert.equal(item.description, "");
});

test("ignores malformed stored entries", () => {
  const items = normalizeItems([
    { id: "valid", title: "Valid" },
    { id: "missing-title" },
    null,
  ], new Date("2026-07-15T12:00:00.000Z"));

  assert.equal(items.length, 1);
  assert.equal(items[0].id, "valid");
});

test("completion preserves and restores the prior status", () => {
  const completed = toggleItemCompleted(baseItem, new Date("2026-07-16T10:00:00.000Z"));

  assert.equal(completed.status, "completed");
  assert.equal(completed.statusBeforeCompletion, "waiting");
  assert.equal(completed.completedAt, "2026-07-16T10:00:00.000Z");

  const reopened = toggleItemCompleted(completed, new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(reopened.status, "waiting");
  assert.equal(reopened.completedAt, undefined);
  assert.equal(reopened.statusBeforeCompletion, undefined);
});

test("moving away from completed clears completion metadata", () => {
  const completed = toggleItemCompleted(baseItem, new Date("2026-07-16T10:00:00.000Z"));
  const active = transitionItemStatus(completed, "active", new Date("2026-07-17T10:00:00.000Z"));

  assert.equal(active.status, "active");
  assert.equal(active.completedAt, undefined);
  assert.equal(active.statusBeforeCompletion, undefined);
});

test("weekly calculations use Monday as the start of the week", () => {
  const reference = new Date("2026-07-17T12:00:00.000Z");
  const completedThisWeek = {
    ...baseItem,
    status: "completed" as const,
    completedAt: "2026-07-14T09:00:00.000Z",
  };
  const completedLastWeek = {
    ...completedThisWeek,
    completedAt: "2026-07-12T09:00:00.000Z",
  };

  assert.equal(isCompletedThisWeek(completedThisWeek, reference), true);
  assert.equal(isCompletedThisWeek(completedLastWeek, reference), false);
  assert.equal(isCreatedThisWeek(baseItem, reference), true);
});

test("review draft migration keeps only string fields", () => {
  const draft = normalizeReviewDraft({
    location: "Home",
    happened: 42,
    nextWeek: "Continue",
  });

  assert.equal(draft.location, "Home");
  assert.equal(draft.happened, "");
  assert.equal(draft.nextWeek, "Continue");
});
