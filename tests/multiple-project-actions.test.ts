import assert from "node:assert/strict";
import test from "node:test";
import {
  addProjectAction,
  completeProjectAction,
  getCompletedProjectActions,
  getOpenProjectActions,
  normalizeItem,
  updateProjectAction,
  type Item,
} from "../src/domain/personal-data.ts";
import { isProjectPastCheckIn } from "../src/domain/project-dates.ts";
import { buildGoogleCalendarProjections } from "../src/domain/google-calendar.ts";

const baseProject: Item = {
  id: "project-1",
  title: "Neutral project",
  description: "",
  actions: [],
  kind: "project",
  status: "active",
  area: "uncategorized",
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z",
};

test("a project can keep dated and undated open actions", () => {
  const later = addProjectAction(baseProject, "Later dated action", "2026-08-10", new Date("2026-07-20T10:00:00.000Z"));
  const undated = addProjectAction(later, "Undated parallel action", "", new Date("2026-07-21T10:00:00.000Z"));
  const earlier = addProjectAction(undated, "Earlier dated action", "2026-08-02", new Date("2026-07-22T10:00:00.000Z"));

  assert.equal(earlier.actions.length, 3);
  assert.deepEqual(
    getOpenProjectActions(earlier).map((action) => [action.title, action.targetDate]),
    [
      ["Earlier dated action", "2026-08-02"],
      ["Later dated action", "2026-08-10"],
      ["Undated parallel action", ""],
    ],
  );
});

test("completing one parallel action leaves the project and its other actions active", () => {
  const first = addProjectAction(baseProject, "First action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const project = addProjectAction(first, "Second action", "", new Date("2026-07-21T10:00:00.000Z"));
  const [firstOpen] = getOpenProjectActions(project);
  const completed = completeProjectAction(
    project,
    firstOpen.id,
    "Finished independently.",
    "keep-active",
    "",
    "",
    new Date("2026-07-29T12:00:00.000Z"),
  );

  assert.equal(completed.status, "active");
  assert.equal(getOpenProjectActions(completed).length, 1);
  assert.equal(getOpenProjectActions(completed)[0].title, "Second action");
  assert.equal(getOpenProjectActions(completed)[0].targetDate, "");
  assert.equal(getCompletedProjectActions(completed)[0].completionNote, "Finished independently.");
});

test("a project cannot be moved to waiting while another action remains open", () => {
  const first = addProjectAction(baseProject, "First action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const project = addProjectAction(first, "Second action", "", new Date("2026-07-21T10:00:00.000Z"));
  const [firstOpen] = getOpenProjectActions(project);

  assert.equal(
    completeProjectAction(project, firstOpen.id, "Done", "waiting", "", "", new Date("2026-07-29T12:00:00.000Z")),
    project,
  );
});

test("a successor action may be created without a date", () => {
  const project = addProjectAction(baseProject, "Current action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const current = getOpenProjectActions(project)[0];
  const updated = completeProjectAction(
    project,
    current.id,
    "Finished.",
    "next-action",
    "Undated successor",
    "",
    new Date("2026-07-29T12:00:00.000Z"),
  );

  assert.equal(getOpenProjectActions(updated)[0].title, "Undated successor");
  assert.equal(getOpenProjectActions(updated)[0].targetDate, "");
});

test("rescheduling records notes when dates are changed, removed, or set", () => {
  const project = addProjectAction(baseProject, "Open action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const action = getOpenProjectActions(project)[0];
  const moved = updateProjectAction(
    project,
    action.id,
    { title: action.title, targetDate: "2026-08-09", rescheduleNote: "Waiting for another input." },
    new Date("2026-07-29T12:00:00.000Z"),
  );
  const dateRemoved = updateProjectAction(
    moved,
    action.id,
    { title: "Open action with clearer wording", targetDate: "", rescheduleNote: "No useful date yet." },
    new Date("2026-07-30T12:00:00.000Z"),
  );
  const dateRestored = updateProjectAction(
    dateRemoved,
    action.id,
    { title: "Open action with clearer wording", targetDate: "2026-08-12", rescheduleNote: "The dependency is now scheduled." },
    new Date("2026-07-31T12:00:00.000Z"),
  );
  const updated = getOpenProjectActions(dateRestored)[0];

  assert.equal(updated.id, action.id);
  assert.equal(updated.targetDate, "2026-08-12");
  assert.deepEqual(updated.reschedules, [
    {
      previousTargetDate: "2026-08-02",
      targetDate: "2026-08-09",
      changedAt: "2026-07-29T12:00:00.000Z",
      note: "Waiting for another input.",
    },
    {
      previousTargetDate: "2026-08-09",
      targetDate: "",
      changedAt: "2026-07-30T12:00:00.000Z",
      note: "No useful date yet.",
    },
    {
      previousTargetDate: "",
      targetDate: "2026-08-12",
      changedAt: "2026-07-31T12:00:00.000Z",
      note: "The dependency is now scheduled.",
    },
  ]);

  const restored = normalizeItem(JSON.parse(JSON.stringify(dateRestored)));
  assert.ok(restored);
  assert.deepEqual(getOpenProjectActions(restored)[0].reschedules, updated.reschedules);
});

test("any overdue dated action marks an active project overdue while undated and waiting projects stay quiet", () => {
  const undated = addProjectAction(baseProject, "Undated action", "", new Date("2026-07-20T10:00:00.000Z"));
  assert.equal(isProjectPastCheckIn(undated, new Date(2026, 6, 29)), false);

  const future = addProjectAction(undated, "Future action", "2026-08-10", new Date("2026-07-21T10:00:00.000Z"));
  const project = addProjectAction(future, "Overdue action", "2026-07-28", new Date("2026-07-22T10:00:00.000Z"));
  assert.equal(isProjectPastCheckIn(project, new Date(2026, 6, 29)), true);
  assert.equal(isProjectPastCheckIn({ ...project, status: "waiting" }, new Date(2026, 6, 29)), false);
});

test("Google Calendar projects dated open actions and skips undated actions", () => {
  const projections = buildGoogleCalendarProjections({
    items: [{
      id: "project-1",
      title: "Neutral project",
      description: "",
      kind: "project",
      status: "active",
      actions: [
        { id: "one", title: "First open action", targetDate: "2026-08-02", openedAt: "2026-07-20T10:00:00.000Z" },
        { id: "undated", title: "Undated open action", targetDate: "", openedAt: "2026-07-21T10:00:00.000Z" },
        { id: "two", title: "Second open action", targetDate: "2026-08-04", openedAt: "2026-07-22T10:00:00.000Z" },
        { id: "done", title: "Completed action", targetDate: "2026-07-25", openedAt: "2026-07-19T10:00:00.000Z", completedAt: "2026-07-25T12:00:00.000Z" },
      ],
    }],
  });

  assert.deepEqual(projections.map((projection) => projection.sourceId), ["one", "two"]);
});
