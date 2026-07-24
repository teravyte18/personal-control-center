import assert from "node:assert/strict";
import test from "node:test";
import {
  debouncedMutationKey,
  mergeDebouncedMutation,
} from "../src/domain/debounced-mutations.ts";

test("item text changes for the same item are coalesced", () => {
  const first = {
    type: "update-item" as const,
    id: "item-1",
    updates: { title: "First" },
    occurredAt: "2026-07-24T18:00:00.000Z",
  };
  const second = {
    type: "update-item" as const,
    id: "item-1",
    updates: { description: "Context" },
    occurredAt: "2026-07-24T18:00:01.000Z",
  };

  assert.equal(debouncedMutationKey(first), "item:item-1");
  assert.deepEqual(mergeDebouncedMutation(first, second), {
    ...second,
    updates: { title: "First", description: "Context" },
  });
});

test("the latest value wins for repeated text edits", () => {
  const first = {
    type: "update-item" as const,
    id: "item-1",
    updates: { title: "Long title" },
    occurredAt: "2026-07-24T18:00:00.000Z",
  };
  const second = {
    type: "update-item" as const,
    id: "item-1",
    updates: { title: "Short" },
    occurredAt: "2026-07-24T18:00:01.000Z",
  };

  assert.deepEqual(mergeDebouncedMutation(first, second), second);
});

test("review fields debounce independently", () => {
  const happened = {
    type: "update-review-draft" as const,
    field: "happened" as const,
    value: "A busy week",
  };
  const learned = {
    type: "update-review-draft" as const,
    field: "learned" as const,
    value: "Protect focus time",
  };

  assert.equal(debouncedMutationKey(happened), "review:happened");
  assert.equal(debouncedMutationKey(learned), "review:learned");
  assert.deepEqual(mergeDebouncedMutation(happened, learned), learned);
});
