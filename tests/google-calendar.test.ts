import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleCalendarEventBody,
  buildGoogleCalendarProjections,
  canSkipCalendarRead,
  mutationAffectsGoogleCalendar,
  nextDate,
} from "../src/domain/google-calendar.ts";

test("only unreadable secondary calendars can be skipped with incomplete coverage", () => {
  for (const status of [403, 404]) {
    assert.equal(canSkipCalendarRead(status, false), true);
    assert.equal(canSkipCalendarRead(status, true), false);
  }
  assert.equal(canSkipCalendarRead(500, false), false);
});

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

test("projects unlinked planner check-ins as timed events keyed by stable session ID", () => {
  const session = {
    id: "session-check-in",
    date: "2026-11-18",
    start: "09:00",
    minutes: 30,
    title: "Daily check-in",
    work: [],
    estimateMinutes: 30,
    locked: false,
    createdAt: "2026-11-01T09:00:00.000Z",
  };
  const first = buildGoogleCalendarProjections({
    items: [],
    plannerPreferences: { timezone: "Europe/Lisbon" },
    plannerSessions: [session],
  });
  const moved = buildGoogleCalendarProjections({
    items: [],
    plannerPreferences: { timezone: "Europe/Lisbon" },
    plannerSessions: [{ ...session, date: "2026-11-19", start: "10:00" }],
  });

  assert.equal(first[0]?.sourceType, "planner-session");
  assert.equal(first[0]?.sourceId, "session-check-in");
  assert.equal(moved[0]?.sourceId, first[0]?.sourceId, "rescheduling preserves the Calendar mapping key");
  assert.deepEqual(buildGoogleCalendarEventBody(first[0]!).start, {
    dateTime: "2026-11-18T09:00:00",
    timeZone: "Europe/Lisbon",
  });
  assert.deepEqual(buildGoogleCalendarEventBody(first[0]!).end, {
    dateTime: "2026-11-18T09:30:00",
    timeZone: "Europe/Lisbon",
  });
  assert.equal(buildGoogleCalendarEventBody(first[0]!).extendedProperties.private.pccSourceId, "session-check-in");
  assert.deepEqual(buildGoogleCalendarProjections({ items: [], plannerSessions: [{ ...session, outcome: "completed" }] }), [],
    "completed sessions are absent from the desired projection");
  assert.deepEqual(buildGoogleCalendarProjections({ items: [], plannerSessions: [] }), [],
    "deleted sessions are absent from the desired projection and reconciler removes their mapped event");
});

test("keeps planner session wall times and timezone across Lisbon DST transition dates", () => {
  const session = (date: string, start: string) => ({
    id: `dst-${date}`,
    date,
    start,
    minutes: 45,
    title: "DST session",
    work: [],
    estimateMinutes: 45,
    locked: false,
    createdAt: "2026-01-01T09:00:00.000Z",
  });

  for (const [date, start, end] of [
    ["2026-03-29", "03:15", "04:00"],
    ["2026-10-25", "03:15", "04:00"],
  ]) {
    const projection = buildGoogleCalendarProjections({
      items: [],
      plannerPreferences: { timezone: "Europe/Lisbon" },
      plannerSessions: [session(date, start)],
    })[0];
    const body = buildGoogleCalendarEventBody(projection!);
    assert.deepEqual(body.start, { dateTime: `${date}T${start}:00`, timeZone: "Europe/Lisbon" });
    assert.deepEqual(body.end, { dateTime: `${date}T${end}:00`, timeZone: "Europe/Lisbon" });
  }
});

test("ignores review and expense mutations but reacts to Calendar-backed item changes", () => {
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-review-draft" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "complete-review" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "add-expense-transaction" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-expense-transaction" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "delete-expense-transaction" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-expense-settings" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "set-expense-reconciled-through" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "add-rhythm-template" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "add-rhythm-completion" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "add-weekly-focus" }), false);
  assert.equal(mutationAffectsGoogleCalendar({ type: "update-item" }), true);
  assert.equal(mutationAffectsGoogleCalendar({ type: "complete-project-action" }), true);
  assert.equal(mutationAffectsGoogleCalendar({ type: "upsert-planner-session" }), true);
  assert.equal(mutationAffectsGoogleCalendar({ type: "delete-planner-session" }), true);
});
