import assert from "node:assert/strict";
import test from "node:test";
import { upcomingCommitments, weeklyWorkKey } from "../src/domain/planning-view.ts";
import { projectedWorkHref, workHref } from "../src/domain/work-links.ts";

test("source links retain exact action identity and completion only requests its form", () => {
  const href = workHref({ sourceType: "project-action", sourceItemId: "project & one", sourceActionId: "action/2" }, true);
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/projects");
  assert.equal(url.searchParams.get("project"), "project & one");
  assert.equal(url.searchParams.get("action"), "action/2");
  assert.equal(url.searchParams.get("complete"), "1");
  assert.equal(workHref({ sourceType: "task", sourceItemId: "one/two" }), "/tasks?task=one%2Ftwo");
  assert.equal(projectedWorkHref(undefined), undefined);
  assert.equal(projectedWorkHref({ pccItemId: "one", pccSourceType: "unknown" }), undefined);
  assert.equal(projectedWorkHref({ pccItemId: "one", pccSourceType: "project-action" }), undefined);
  assert.equal(projectedWorkHref({ pccItemId: "one", pccSourceType: "project-action", pccSourceId: "two" }), "/projects?project=one&action=two");
});

test("upcoming commitments include ongoing events, respect exclusive all-day ends and exclude projected work", () => {
  const now = new Date(2026, 9, 29, 12);
  const events = [
    { id: "past", start: "2026-10-28", end: "2026-10-29", allDay: true, source: "google" },
    { id: "today", start: "2026-10-29", end: "2026-10-30", allDay: true, source: "agenda" },
    { id: "ongoing", start: new Date(2026, 9, 29, 11).toISOString(), end: new Date(2026, 9, 29, 13).toISOString(), allDay: false, source: "google" },
    { id: "projected", start: "2026-10-29", end: "2026-10-30", allDay: true, source: "project-action" },
  ];
  assert.deepEqual(upcomingCommitments(events, now).map(event => event.id), ["today", "ongoing"]);
  assert.equal(events.length, 4);
});

test("weekly identity distinguishes actions and delimiter-containing ids", () => {
  assert.notEqual(weeklyWorkKey({ sourceType: "project-action", sourceItemId: "a:b", sourceActionId: "c" }), weeklyWorkKey({ sourceType: "project-action", sourceItemId: "a", sourceActionId: "b:c" }));
});
