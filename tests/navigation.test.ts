import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultDesktopPinnedDestinationIds,
  defaultPinnedDestinationIds,
  normalizeDesktopPinnedDestinationIds,
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

test("Markets can be pinned without changing the default quick access", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["markets", "inbox", "projects", "review"]),
    ["markets", "inbox", "projects", "review"],
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

test("Food can be pinned without changing the default quick access", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["food", "inbox", "projects", "review"]),
    ["food", "inbox", "projects", "review"],
  );
  assert.deepEqual(normalizeMobilePinnedDestinationIds(null), [...defaultPinnedDestinationIds]);
});

test("Library can be pinned without changing the default quick access", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["library", "inbox", "projects", "review"]),
    ["library", "inbox", "projects", "review"],
  );
  assert.deepEqual(normalizeMobilePinnedDestinationIds(null), [...defaultPinnedDestinationIds]);
});

test("mobile quick access removes duplicates and unavailable spaces", () => {
  assert.deepEqual(
    normalizeMobilePinnedDestinationIds(["thoughts", "thoughts", "archive", "library", "tasks"]),
    ["thoughts", "library", "tasks", "inbox"],
  );
});


test("desktop quick access defaults to seven bounded destinations", () => {
  assert.deepEqual(
    normalizeDesktopPinnedDestinationIds(null),
    [...defaultDesktopPinnedDestinationIds],
  );
  assert.equal(normalizeDesktopPinnedDestinationIds(null).length, 7);
});

test("desktop quick access preserves custom pins and removes duplicates", () => {
  assert.deepEqual(
    normalizeDesktopPinnedDestinationIds([
      "projects",
      "projects",
      "markets",
      "notes",
      "library",
      "expenses",
      "review",
      "tasks",
    ]),
    ["projects", "markets", "notes", "library", "expenses", "review", "tasks"],
  );
});
