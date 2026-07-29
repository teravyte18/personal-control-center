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

test("a project can keep multiple independently dated open actions", () => {
  const first = addProjectAction(baseProject, "Later action", "2026-08-10", new Date("2026-07-20T10:00:00.000Z"));
  const second = addProjectAction(first, "Earlier action", "2026-08-02", new Date("2026-07-21T10:00:00.000Z"));

  assert.equal(second.actions.length, 2);
  assert.deepEqual(getOpenProjectActions(second).map((action) => action.title), ["Earlier action", "Later action"]);
});

test("completing one parallel action leaves the project and its other actions active", () => {
  const first = addProjectAction(baseProject, "First action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const project = addProjectAction(first, "Second action", "2026-08-04", new Date("2026-07-21T10:00:00.000Z"));
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
  assert.equal(getCompletedProjectActions(completed)[0].completionNote, "Finished independently.");
});

test("a project cannot be moved to waiting while another action remains open", () => {
  const first = addProjectAction(baseProject, "First action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const project = addProjectAction(first, "Second action", "2026-08-04", new Date("2026-07-21T10:00:00.000Z"));
  const [firstOpen] = getOpenProjectActions(project);

  assert.equal(
    completeProjectAction(project, firstOpen.id, "Done", "waiting", "", "", new Date("2026-07-29T12:00:00.000Z")),
    project,
  );
});

test("rescheduling keeps the action identity and records each date change", () => {
  const project = addProjectAction(baseProject, "Open action", "2026-08-02", new Date("2026-07-20T10:00:00.000Z"));
  const action = getOpenProjectActions(project)[0];
  const moved = updateProjectAction(
    project,
    action.id,
    { title: action.title, targetDate: "2026-08-09" },
    new Date("2026-07-29T12:00:00.000Z"),
  );
  const movedAgain = updateProjectAction(
    moved,
    action.id,
    { title: "Open action with clearer wording", targetDate: "2026-08-12" },
    new Date("2026-07-30T12:00:00.000Z"),
  );
  const updated = getOpenProjectActions(movedAgain)[0];

  assert.equal(updated.id, action.id);
  assert.equal(updated.targetDate, "2026-08-12");
  assert.deepEqual(updated.reschedules, [
    { previousTargetDate: "2026-08-02", targetDate: "2026-08-09", changedAt: "2026-07-29T12:00:00.000Z" },
    { previousTargetDate: "2026-08-09", targetDate: "2026-08-12", changedAt: "2026-07-30T12:00:00.000Z" },
  ]);

  const restored = normalizeItem(JSON.parse(JSON.stringify(movedAgain)));
  assert.ok(restored);
  assert.deepEqual(getOpenProjectActions(restored)[0].reschedules, updated.reschedules);
});

test("any overdue open action marks the project overdue", () => {
  const first = addProjectAction(baseProject, "Future action", "2026-08-10", new Date("2026-07-20T10:00:00.000Z"));
  const project = addProjectAction(first, "Overdue action", "2026-07-28", new Date("2026-07-21T10:00:00.000Z"));

  assert.equal(isProjectPastCheckIn(project, new Date(2026, 6, 29)), true);
});

test("Google Calendar projects every dated open project action", () => {
  const projections = buildGoogleCalendarProjections({
    items: [{
      id: "project-1",
      title: "Neutral project",
      description: "",
      kind: "project",
      status: "active",
      actions: [
        { id: "one", title: "First open action", targetDate: "2026-08-02", openedAt: "2026-07-20T10:00:00.000Z" },
        { id: "two", title: "Second open action", targetDate: "2026-08-04", openedAt: "2026-07-21T10:00:00.000Z" },
        { id: "done", title: "Completed action", targetDate: "2026-07-25", openedAt: "2026-07-19T10:00:00.000Z", completedAt: "2026-07-25T12:00:00.000Z" },
      ],
    }],
  });

  assert.deepEqual(projections.map((projection) => projection.sourceId), ["one", "two"]);
});
