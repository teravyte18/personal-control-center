import assert from "node:assert/strict";
import test from "node:test";
import { createItem } from "../src/domain/personal-data.ts";
import {
  enqueueOfflineCapture,
  loadOfflineCaptures,
  markOfflineCaptureAttempt,
  offlineCaptureStorageKey,
  removeOfflineCapture,
} from "../src/lib/offline-capture.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function captureMutation(title: string, now: Date) {
  const item = createItem(title, undefined, now);
  assert.ok(item);
  return { type: "add-item", item } as const;
}

test("offline captures are durable and scoped to the active application user", () => {
  const storage = new MemoryStorage();
  const first = captureMutation("First offline note", new Date("2026-07-27T10:00:00.000Z"));
  const second = captureMutation("Second account note", new Date("2026-07-27T11:00:00.000Z"));

  enqueueOfflineCapture(storage, "user-a", first, new Date("2026-07-27T12:00:00.000Z"));
  enqueueOfflineCapture(storage, "user-b", second, new Date("2026-07-27T12:05:00.000Z"));

  assert.deepEqual(loadOfflineCaptures(storage, "user-a").map((record) => record.mutation.item.title), ["First offline note"]);
  assert.deepEqual(loadOfflineCaptures(storage, "user-b").map((record) => record.mutation.item.title), ["Second account note"]);
  assert.notEqual(offlineCaptureStorageKey("user-a"), offlineCaptureStorageKey("user-b"));
});

test("re-queueing the same client-generated item remains duplicate safe", () => {
  const storage = new MemoryStorage();
  const mutation = captureMutation("Retry-safe note", new Date("2026-07-27T10:00:00.000Z"));

  enqueueOfflineCapture(storage, "user-a", mutation, new Date("2026-07-27T12:00:00.000Z"));
  enqueueOfflineCapture(storage, "user-a", mutation, new Date("2026-07-27T13:00:00.000Z"));

  const records = loadOfflineCaptures(storage, "user-a");
  assert.equal(records.length, 1);
  assert.equal(records[0].id, mutation.item.id);
  assert.equal(records[0].queuedAt, "2026-07-27T12:00:00.000Z");
});

test("failed attempts retain the capture and record bounded retry details", () => {
  const storage = new MemoryStorage();
  const mutation = captureMutation("Temporarily unavailable", new Date("2026-07-27T10:00:00.000Z"));
  enqueueOfflineCapture(storage, "user-a", mutation);

  markOfflineCaptureAttempt(
    storage,
    "user-a",
    mutation.item.id,
    "network unavailable",
    new Date("2026-07-27T14:00:00.000Z"),
  );

  const [record] = loadOfflineCaptures(storage, "user-a");
  assert.equal(record.attemptCount, 1);
  assert.equal(record.lastAttemptAt, "2026-07-27T14:00:00.000Z");
  assert.equal(record.lastError, "network unavailable");
});

test("confirmed captures are removed without disturbing later queued entries", () => {
  const storage = new MemoryStorage();
  const first = captureMutation("First", new Date("2026-07-27T10:00:00.000Z"));
  const second = captureMutation("Second", new Date("2026-07-27T11:00:00.000Z"));
  enqueueOfflineCapture(storage, "user-a", first, new Date("2026-07-27T12:00:00.000Z"));
  enqueueOfflineCapture(storage, "user-a", second, new Date("2026-07-27T13:00:00.000Z"));

  const remaining = removeOfflineCapture(storage, "user-a", first.item.id);

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.item.id);
  assert.equal(loadOfflineCaptures(storage, "user-a")[0].mutation.item.title, "Second");
});

test("malformed queue data is ignored instead of blocking capture", () => {
  const storage = new MemoryStorage();
  storage.setItem(offlineCaptureStorageKey("user-a"), "not-json");
  assert.deepEqual(loadOfflineCaptures(storage, "user-a"), []);
});
