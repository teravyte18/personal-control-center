import assert from "node:assert/strict";
import test from "node:test";
import {
  archiveItem,
  normalizeItem,
  restoreArchivedItem,
  type Item,
} from "../src/domain/personal-data.ts";

const waitingProject: Item = {
  id: "project-archive",
  title: "Neutral project",
  description: "",
  actions: [{
    id: "action-1",
    title: "Wait for a result",
    targetDate: "2026-07-20",
    openedAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-16T10:00:00.000Z",
    completedAt: "2026-07-16T10:00:00.000Z",
    completionNote: "The action is resolved; the project is waiting for a future next step.",
  }],
  kind: "project",
  status: "waiting",
  area: "uncategorized",
  createdAt: "2026-07-10T10:00:00.000Z",
  updatedAt: "2026-07-16T10:00:00.000Z",
};

test("archive preserves project history and restores the prior status", () => {
  const archived = archiveItem(waitingProject, new Date("2026-07-17T12:00:00.000Z"));

  assert.equal(archived.status, "archived");
  assert.equal(archived.statusBeforeArchive, "waiting");
  assert.equal(archived.archivedAt, "2026-07-17T12:00:00.000Z");
  assert.deepEqual(archived.actions, waitingProject.actions);

  const restored = restoreArchivedItem(archived, new Date("2026-07-18T12:00:00.000Z"));
  assert.equal(restored.status, "waiting");
  assert.equal(restored.statusBeforeArchive, undefined);
  assert.equal(restored.archivedAt, undefined);
  assert.deepEqual(restored.actions, waitingProject.actions);
});

test("archived accomplishments retain their original completion metadata", () => {
  const accomplishment: Item = {
    ...waitingProject,
    status: "completed",
    statusBeforeCompletion: "waiting",
    completedAt: "2026-07-16T09:00:00.000Z",
  };
  const archived = archiveItem(accomplishment, new Date("2026-07-17T12:00:00.000Z"));
  const normalized = normalizeItem(JSON.parse(JSON.stringify(archived)));

  assert.ok(normalized);
  assert.equal(normalized.status, "archived");
  assert.equal(normalized.statusBeforeArchive, "completed");
  assert.equal(normalized.completedAt, "2026-07-16T09:00:00.000Z");

  const restored = restoreArchivedItem(normalized, new Date("2026-07-18T12:00:00.000Z"));
  assert.equal(restored.status, "completed");
  assert.equal(restored.completedAt, "2026-07-16T09:00:00.000Z");
  assert.equal(restored.statusBeforeCompletion, "waiting");
});
