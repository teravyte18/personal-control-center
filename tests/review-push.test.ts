import assert from "node:assert/strict";
import test from "node:test";
import { getReviewPushContext, reviewPeriodCompleted, validTimeZone } from "../src/domain/review-push.ts";

test("review push becomes due after 08:00 local time throughout the review week", () => {
  const before = getReviewPushContext(new Date("2026-09-20T06:30:00.000Z"), "Europe/Lisbon");
  const after = getReviewPushContext(new Date("2026-09-20T07:30:00.000Z"), "Europe/Lisbon");

  assert.equal(before.localDate, "2026-09-20");
  assert.equal(before.localHour, 7);
  assert.equal(before.reminderDue, false);

  assert.equal(after.localHour, 8);
  assert.equal(after.reminderDue, true);
  assert.equal(after.periodStart, "2026-09-12");
  assert.equal(after.periodEnd, "2026-09-18");
});

test("Saturday sends the same due reminder as the rest of the week", () => {
  const context = getReviewPushContext(new Date("2026-09-19T11:00:00.000Z"), "Europe/Lisbon");
  assert.equal(context.weekday, 6);
  assert.equal(context.reminderDue, true);
  assert.equal(context.periodStart, "2026-09-12");
  assert.equal(context.periodEnd, "2026-09-18");
});

test("completed review period suppresses reminder", () => {
  const context = getReviewPushContext(new Date("2026-09-21T09:00:00.000Z"), "Europe/Lisbon");
  assert.equal(reviewPeriodCompleted([
    { periodStart: "2026-09-12", periodEnd: "2026-09-18" },
  ], context), true);
  assert.equal(reviewPeriodCompleted([], context), false);
});

test("timezone validation rejects invalid identifiers", () => {
  assert.equal(validTimeZone("Europe/Lisbon"), true);
  assert.equal(validTimeZone("Not/A_Timezone"), false);
});
