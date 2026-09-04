import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPinnedDestinationIds,
  normalizeMobilePinnedDestinationIds,
} from "../src/lib/navigation.ts";

test("mobile quick access defaults to four primary destinations", () => {
  assert.deepEqual(normalizeMobilePinnedDestinationIds(null), [...defaultPinnedDestinationIds]);
});

test("mobile quick access preserves a custom order", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["thoughts", "tasks", "projects", "review"]),
    ["thoughts", "tasks", "projects", "review"],
  );
});

test("Expenses can be pinned without changing the default quick access", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["expenses", "inbox", "projects", "review"]),
    ["expenses", "inbox", "projects", "review"],
  );
  assert.deepEqual(normalizeMobilePinnedDestinationIds(null), [...defaultPinnedDestinationIds]);
});

test("Keychain can be pinned without changing the default quick access", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["keychain", "inbox", "projects", "review"]),
    ["keychain", "inbox", "projects", "review"],
  );
  assert.deepEqual(normalizeMobilePinnedDestinationIds(null), [...defaultPinnedDestinationIds]);
});

test("mobile quick access removes duplicates and unavailable spaces", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["thoughts", "thoughts", "archive", "library", "tasks"]),
    ["thoughts", "library", "tasks", "inbox"],
  );
});
