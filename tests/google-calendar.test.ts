import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleCalendarEventBody,
  buildGoogleCalendarProjections,
  mutationAffectsGoogleCalendar,
  nextDate,
} from "../src/domain/google-calendar.ts";

const base = {
  title: "Neutral example",
  description: "",
  status: "active",
  actions: [],
};

test("projects active dated tasks and excludes undated or closed tasks", () => {
  const projections = buildGoogleCalendarProjections({
    items: [
      { ...base, id: "dated", kind: "task", checkInDate: "2026-08-02" },
      { ...base, id: "undated", kind: "task" },
      { ...base, id: "completed", kind: "task", status: "completed", checkInDate: "2026-08-03" },
      { ...base, id: "archived", kind: "task", status: "archived", checkInDate: "2026-08-04" },
    ],
  });

  assert.deepEqual(projections, [{
    sourceType: "task",
    sourceId: "dated",
    itemId: "dated",
    summary: "Neutral example",
    description: "Task from Personal Control Center",
    date: "2026-08-02",
  }]);
});

test("projects only the newest open project action", () => {
  const projections = buildGoogleCalendarProjections({
    items: [{
      ...base,
      id: "project-1",
      kind: "project",
      title: "Neutral project",
      actions: [
        {
          id: "finished",
          title: "Finished action",
          targetDate: "2026-07-20",
          openedAt: "2026-07-18T10:00:00.000Z",
          completedAt: "2026-07-20T12:00:00.000Z",
        },
        {
          id: "current",
          title: "Current action",
          targetDate: "2026-08-05",
          openedAt: "2026-07-21T10:00:00.000Z",
        },
      ],
    }],
  });

  assert.equal(projections.length, 1);
  assert.deepEqual(projections[0], {
    sourceType: "project-action",
    sourceId: "current",
    itemId: "project-1",
    summary: "Current action",
    description: "Project action from Personal Control Center\n\nProject: Neutral project",
    date: "2026-08-05",
  });
});

test("builds an all-day Google event with an exclusive next-day end", () => {
  const body = buildGoogleCalendarEventBody({
    sourceType: "task",
    sourceId: "task-1",
    itemId: "task-1",
    summary: "Neutral task",
    description: "Task from Personal Control Center",
    date: "2026-12-31",
  });

  assert.deepEqual(body.start, { date: "2026-12-31" });
  assert.deepEqual(body.end, { date: "2027-01-01" });
  assert.equal(nextDate("2028-02-28"), "2028-02-29");
  assert.deepEqual(body.extendedProperties.private, {
    pccSourceType: "task",
    pccSourceId: "task-1",
    pccItemId: "task-1",
  });
});

test("ignores review-only mutations but reacts to personal item changes", () => {
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-review-draft" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "complete-review" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-item" }), true);
  assert.equal(mutationAffectsGoogleCalendar({ type: "complete-project-action" }), true);
});
