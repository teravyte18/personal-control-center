import assert from "node:assert/strict";
import test from "node:test";
import { attemptCalendarSync } from "../src/domain/calendar-sync-result.ts";

test("reports successful Calendar reconciliation explicitly", async () => {
  let called = false;
  const result = await attemptCalendarSync(async () => { called = true; });
  assert.equal(called, true);
  assert.deepEqual(result, { attempted: true, succeeded: true, error: "" });
});

test("keeps a successful PCC save independent while reporting Calendar failure", async () => {
  const persisted = { saved: true, revision: 7 };
  const result = await attemptCalendarSync(async () => { throw new Error("Calendar unavailable"); });
  assert.deepEqual(persisted, { saved: true, revision: 7 });
  assert.deepEqual(result, { attempted: true, succeeded: false, error: "Calendar unavailable" });
});
