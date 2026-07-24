import assert from "node:assert/strict";
import test from "node:test";
import {
  createItem,
  isOpenTask,
  isTaskDueToday,
  isTaskOverdue,
  toggleItemCompleted,
  updateItemFields,
  type ReviewDraft,
  type ReviewEntry,
} from "../src/domain/personal-data.ts";
import {
  getCurrentReviewPeriod,
  isReviewCompletedForPeriod,
  isReviewDraftForPeriod,
  isReviewReminderDue,
  isTimestampInReviewPeriod,
} from "../src/domain/weekly-review.ts";

const emptyDraft: ReviewDraft = {
  periodStart: "",
  periodEnd: "",
  location: "",
  photoName: "",
  happened: "",
  wentWell: "",
  difficult: "",
  learned: "",
  nextWeek: "",
};

test("standalone tasks may remain open without a date", () => {
  const task = createItem("One-off action", { kind: "task", status: "active" }, new Date("2026-07-20T10:00:00Z"));
  assert.ok(task);
  assert.equal(isOpenTask(task), true);
  assert.equal(task.checkInDate, undefined);
  assert.equal(isTaskDueToday(task, new Date(2026, 6, 24, 12)), false);
  assert.equal(isTaskOverdue(task, new Date(2026, 6, 24, 12)), false);
});

test("dated tasks can be rescheduled without an action timeline", () => {
  const task = createItem("Dated action", {
    kind: "task",
    status: "active",
    checkInDate: "2026-07-24",
  }, new Date("2026-07-20T10:00:00Z"));
  assert.ok(task);
  assert.equal(task.actions.length, 0);
  assert.equal(isTaskDueToday(task, new Date(2026, 6, 24, 12)), true);
  assert.equal(isTaskOverdue(task, new Date(2026, 6, 25, 12)), true);

  const rescheduled = updateItemFields(task, { checkInDate: "2026-07-30" }, new Date("2026-07-25T09:00:00Z"));
  assert.equal(rescheduled.checkInDate, "2026-07-30");
  assert.equal(rescheduled.actions.length, 0);
  assert.equal(isTaskOverdue(rescheduled, new Date(2026, 6, 25, 12)), false);
});

test("completing a task removes it from the active task set while preserving review metadata", () => {
  const task = createItem("Complete action", { kind: "task", status: "active" }, new Date("2026-07-20T10:00:00Z"));
  assert.ok(task);
  const completed = toggleItemCompleted(task, new Date("2026-07-23T18:00:00Z"));
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-07-23T18:00:00.000Z");
  assert.equal(isOpenTask(completed), false);
});

test("Saturday opens a review for the immediately preceding Saturday-to-Friday period", () => {
  const friday = getCurrentReviewPeriod(new Date(2026, 6, 24, 12));
  assert.deepEqual(friday, { start: "2026-07-11", end: "2026-07-17", openedOn: "2026-07-18" });

  const saturday = getCurrentReviewPeriod(new Date(2026, 6, 25, 0, 1));
  assert.deepEqual(saturday, { start: "2026-07-18", end: "2026-07-24", openedOn: "2026-07-25" });
});

test("review periods freeze their date range and completed periods remain closed", () => {
  const period = getCurrentReviewPeriod(new Date(2026, 6, 21, 12));
  const draft = { ...emptyDraft, periodStart: period.start, periodEnd: period.end };
  const entry: ReviewEntry = {
    ...draft,
    id: "review-1",
    completedAt: "2026-07-19T09:00:00.000Z",
  };

  assert.equal(isReviewDraftForPeriod(draft, period), true);
  assert.equal(isReviewCompletedForPeriod([entry], period), true);
  assert.equal(isTimestampInReviewPeriod("2026-07-12T10:00:00.000Z", period), true);
  assert.equal(isTimestampInReviewPeriod("2026-07-18T10:00:00.000Z", period), false);
});

test("unfinished reviews remind once the local clock passes 08:00 from Sunday through Friday", () => {
  const sundayMorning = new Date(2026, 6, 19, 8, 0);
  const period = getCurrentReviewPeriod(sundayMorning);
  const draft = { ...emptyDraft, periodStart: period.start, periodEnd: period.end };

  assert.equal(isReviewReminderDue(new Date(2026, 6, 19, 7, 59), draft, []), false);
  assert.equal(isReviewReminderDue(sundayMorning, draft, []), true);
  assert.equal(isReviewReminderDue(new Date(2026, 6, 24, 23, 0), draft, []), true);
  assert.equal(isReviewReminderDue(new Date(2026, 6, 25, 8, 0), draft, []), false);

  const completed: ReviewEntry = { ...draft, id: "review-complete", completedAt: "2026-07-19T09:00:00.000Z" };
  assert.equal(isReviewReminderDue(sundayMorning, draft, [completed]), false);
});
