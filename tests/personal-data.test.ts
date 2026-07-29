import assert from "node:assert/strict";
import test from "node:test";
import {
  addProjectAction,
  completeProjectAction,
  getCompletedProjectActions,
  getCurrentProjectAction,
  isCompletedThisWeek,
  isCreatedThisWeek,
  isProjectActionCompletedThisWeek,
  isProjectActionOpenedThisWeek,
  isProjectActionTargetReached,
  normalizeItem,
  normalizeItems,
  normalizeReviewDraft,
  projectHasNextAction,
  projectRequiresNextAction,
  toggleItemCompleted,
  transitionItemStatus,
  type Item,
} from "../src/domain/personal-data.ts";
import { isProjectActionPastCheckIn, isProjectPastCheckIn } from "../src/domain/project-dates.ts";

const baseItem: Item = {
  id: "item-1",
  title: "Neutral example",
  description: "",
  actions: [],
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
  assert.deepEqual(item.actions, []);
});

test("migrates the previous next action into a timeline entry", () => {
  const item = normalizeItem({
    id: "project-1",
    title: "Legacy project",
    kind: "project",
    status: "active",
    nextAction: "Take the next step",
    updatedAt: "2026-07-15T12:00:00.000Z",
  });

  assert.ok(item);
  assert.equal(item.actions.length, 1);
  assert.equal(item.actions[0].title, "Take the next step");
  assert.equal(item.actions[0].targetDate, "");
  assert.equal(item.actions[0].id, "project-1-migrated-action");
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

test("completion preserves and restores the prior project status", () => {
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

test("active projects require a current action while waiting projects do not", () => {
  const activeProject = { ...baseItem, status: "active" as const };
  const waitingProject = { ...baseItem, status: "waiting" as const };
  const withAction = addProjectAction(activeProject, "Take one concrete step", "", new Date("2026-07-17T10:00:00.000Z"));

  assert.equal(projectRequiresNextAction(activeProject), true);
  assert.equal(projectHasNextAction(activeProject), false);
  assert.equal(projectRequiresNextAction(waitingProject), false);
  assert.equal(projectHasNextAction(waitingProject), true);
  assert.equal(projectHasNextAction(withAction), true);
});

test("project actions require a title but their check-in date is optional", () => {
  const activeProject = { ...baseItem, status: "active" as const };
  assert.equal(addProjectAction(activeProject, "", "2026-07-20"), activeProject);
  assert.equal(addProjectAction(activeProject, "Valid action", "not-a-date"), activeProject);

  const undated = addProjectAction(activeProject, "Undated action", "", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(undated.actions.length, 1);
  assert.equal(getCurrentProjectAction(undated)?.title, "Undated action");
  assert.equal(getCurrentProjectAction(undated)?.targetDate, "");

  const dated = addProjectAction(activeProject, "Dated action", "2026-07-20", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(dated.actions.length, 1);
  assert.equal(getCurrentProjectAction(dated)?.targetDate, "2026-07-20");
});

test("completing an action records a note and opens an undated next action", () => {
  const activeProject = addProjectAction(
    { ...baseItem, status: "active" },
    "First action",
    "2026-07-18",
    new Date("2026-07-14T10:00:00.000Z"),
  );
  const current = getCurrentProjectAction(activeProject);
  assert.ok(current);

  const updated = completeProjectAction(
    activeProject,
    current.id,
    "Finished with a useful result.",
    "next-action",
    "Second action",
    "",
    new Date("2026-07-17T10:00:00.000Z"),
  );

  assert.equal(updated.status, "active");
  assert.equal(getCurrentProjectAction(updated)?.title, "Second action");
  assert.equal(getCurrentProjectAction(updated)?.targetDate, "");
  assert.equal(getCompletedProjectActions(updated)[0].title, "First action");
  assert.equal(getCompletedProjectActions(updated)[0].completionNote, "Finished with a useful result.");
});

test("completing an action can pause or complete the project", () => {
  const activeProject = addProjectAction(
    { ...baseItem, status: "active" },
    "Current action",
    "2026-07-18",
    new Date("2026-07-14T10:00:00.000Z"),
  );
  const current = getCurrentProjectAction(activeProject);
  assert.ok(current);

  const waiting = completeProjectAction(activeProject, current.id, "Waiting for an external result.", "waiting", "", "", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(waiting.status, "waiting");
  assert.equal(getCurrentProjectAction(waiting), undefined);

  const anotherProject = addProjectAction(
    { ...baseItem, status: "active" },
    "Final action",
    "",
    new Date("2026-07-14T10:00:00.000Z"),
  );
  const finalAction = getCurrentProjectAction(anotherProject);
  assert.ok(finalAction);
  const completed = completeProjectAction(anotherProject, finalAction.id, "The outcome is complete.", "complete-project", "", "", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-07-17T10:00:00.000Z");
});

test("weekly action calculations use Monday as the start of the week", () => {
  const reference = new Date("2026-07-17T12:00:00.000Z");
  const action = {
    id: "action-1",
    title: "Action",
    targetDate: "2026-07-17",
    openedAt: "2026-07-14T09:00:00.000Z",
    updatedAt: "2026-07-16T09:00:00.000Z",
    completedAt: "2026-07-16T09:00:00.000Z",
    completionNote: "Done",
  };
  const openAction = { ...action, completedAt: undefined, completionNote: undefined };
  const undatedAction = { ...openAction, targetDate: "" };
  const completedProject = { ...baseItem, status: "completed" as const, completedAt: "2026-07-14T09:00:00.000Z" };

  assert.equal(isCompletedThisWeek(completedProject, reference), true);
  assert.equal(isCreatedThisWeek(baseItem, reference), true);
  assert.equal(isProjectActionOpenedThisWeek(action, reference), true);
  assert.equal(isProjectActionCompletedThisWeek(action, reference), true);
  assert.equal(isProjectActionTargetReached(openAction, reference), true);
  assert.equal(isProjectActionTargetReached(undatedAction, reference), false);
  assert.equal(isProjectActionTargetReached(action, reference), false);
});

test("a check-in becomes overdue only after its target date", () => {
  const action = {
    id: "action-overdue",
    title: "Neutral action",
    targetDate: "2026-07-17",
    openedAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z",
  };
  const project = { ...baseItem, status: "active" as const, actions: [action] };

  assert.equal(isProjectActionPastCheckIn(action, new Date(2026, 6, 16, 12)), false);
  assert.equal(isProjectActionPastCheckIn(action, new Date(2026, 6, 17, 23, 59)), false);
  assert.equal(isProjectActionPastCheckIn(action, new Date(2026, 6, 18, 0, 1)), true);
  assert.equal(isProjectActionPastCheckIn({ ...action, targetDate: "" }, new Date(2026, 6, 18, 0, 1)), false);
  assert.equal(isProjectPastCheckIn(project, new Date(2026, 6, 18)), true);
  assert.equal(isProjectPastCheckIn({ ...project, status: "completed" }, new Date(2026, 6, 18)), false);
  assert.equal(isProjectActionPastCheckIn({ ...action, completedAt: "2026-07-18T08:00:00.000Z" }, new Date(2026, 6, 19)), false);
});

test("review draft migration keeps only string fields", () => {
  const draft = normalizeReviewDraft({ location: "Home", happened: 42, nextWeek: "Continue" });

  assert.equal(draft.location, "Home");
  assert.equal(draft.happened, "");
  assert.equal(draft.nextWeek, "Continue");
});
