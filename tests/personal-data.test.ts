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
  updateItemFields,
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
  assert.equal(item.status, "active");
});

test("normalizes active projects without open actions to waiting", () => {
  const item = normalizeItem({
    ...baseItem,
    status: "active",
  });

  assert.ok(item);
  assert.equal(item.status, "waiting");
});

test("normalizes waiting projects with an open action back to active", () => {
  const item = normalizeItem({
    ...baseItem,
    status: "waiting",
    actions: [{
      id: "action-1",
      title: "Continue",
      targetDate: "",
      openedAt: "2026-07-14T10:00:00.000Z",
      updatedAt: "2026-07-14T10:00:00.000Z",
    }],
  });

  assert.ok(item);
  assert.equal(item.status, "active");
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

test("moving away from completed clears completion metadata and respects automatic waiting", () => {
  const completed = toggleItemCompleted(baseItem, new Date("2026-07-16T10:00:00.000Z"));
  const reopened = transitionItemStatus(completed, "active", new Date("2026-07-17T10:00:00.000Z"));

  assert.equal(reopened.status, "waiting");
  assert.equal(reopened.completedAt, undefined);
  assert.equal(reopened.statusBeforeCompletion, undefined);
});

test("adding an action automatically reactivates a waiting project", () => {
  const withAction = addProjectAction(baseItem, "Take one concrete step", "", new Date("2026-07-17T10:00:00.000Z"));

  assert.equal(withAction.status, "active");
  assert.equal(projectRequiresNextAction(withAction), true);
  assert.equal(projectHasNextAction(withAction), true);
});

test("projects without actions remain waiting even when active is requested", () => {
  const requestedActive = transitionItemStatus(baseItem, "active", new Date("2026-07-17T10:00:00.000Z"));

  assert.equal(requestedActive.status, "waiting");
  assert.equal(projectRequiresNextAction(requestedActive), false);
  assert.equal(projectHasNextAction(requestedActive), true);
});

test("project actions require a title but their check-in date is optional", () => {
  assert.equal(addProjectAction(baseItem, "", "2026-07-20"), baseItem);
  assert.equal(addProjectAction(baseItem, "Valid action", "not-a-date"), baseItem);

  const undated = addProjectAction(baseItem, "Undated action", "", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(undated.actions.length, 1);
  assert.equal(undated.status, "active");
  assert.equal(getCurrentProjectAction(undated)?.title, "Undated action");
  assert.equal(getCurrentProjectAction(undated)?.targetDate, "");

  const dated = addProjectAction(baseItem, "Dated action", "2026-07-20", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(dated.actions.length, 1);
  assert.equal(getCurrentProjectAction(dated)?.targetDate, "2026-07-20");
});

test("completing an action records a note and opens an undated next action", () => {
  const activeProject = addProjectAction(
    baseItem,
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

test("completing the final action without a successor moves the project to waiting", () => {
  const activeProject = addProjectAction(
    baseItem,
    "Current action",
    "2026-07-18",
    new Date("2026-07-14T10:00:00.000Z"),
  );
  const current = getCurrentProjectAction(activeProject);
  assert.ok(current);

  const waiting = completeProjectAction(activeProject, current.id, "Finished this step.", "waiting", "", "", new Date("2026-07-17T10:00:00.000Z"));
  assert.equal(waiting.status, "waiting");
  assert.equal(getCurrentProjectAction(waiting), undefined);
});

test("project takeaways survive updates and normalization", () => {
  const updated = updateItemFields(baseItem, {
    projectTakeaways: "What went well, what was difficult, and what I learned.",
  }, new Date("2026-07-17T10:00:00.000Z"));
  const restored = normalizeItem(JSON.parse(JSON.stringify(updated)));

  assert.ok(restored);
  assert.equal(restored.projectTakeaways, "What went well, what was difficult, and what I learned.");
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
