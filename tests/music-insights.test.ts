import assert from "node:assert/strict";
import test from "node:test";
import { daysBetween, musicWindow, todayMusicPeriod } from "../src/domain/music-insights.ts";

test("month/year validation and year rollover", () => {
  assert.equal(musicWindow("month", "2026-12", "Europe/Lisbon")?.end, "2027-01-01");
  assert.equal(musicWindow("year", "2026", "UTC")?.end, "2027-01-01");
  assert.equal(musicWindow("month", "2026-00", "UTC"), null);
  assert.equal(musicWindow("month", "2026-13", "UTC"), null);
  assert.equal(musicWindow("month", "2026-11", "Invalid/Zone"), null);
  assert.equal(musicWindow("year", "x' OR 1=1", "UTC"), null);
});
test("local month is selected using the client's time zone", () => {
  assert.equal(todayMusicPeriod(new Date("2026-03-01T00:30:00Z"), "America/New_York"), "2026-02");
  assert.equal(todayMusicPeriod(new Date("2026-03-01T00:30:00Z"), "Europe/Lisbon"), "2026-03");
  assert.equal(daysBetween("2025-01-01T00:00:00Z", "2026-01-01T00:00:00Z"), 365);
});
