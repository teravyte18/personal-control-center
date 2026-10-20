import assert from "node:assert/strict";
import test from "node:test";
import { runMusicPollStages } from "../src/domain/music-poll.ts";

test("genre tagging continues when playlist synchronization fails", async () => {
  const called: string[] = [];
  const failures: string[] = [];
  const result = await runMusicPollStages({
    syncHistory: async () => { called.push("history"); return 4; },
    syncArchive: async () => { called.push("archive"); throw new Error("playlist permission expired"); },
    enrichGenres: async () => { called.push("genres"); return { configured: true, processed: 12 }; },
  }, (stage) => failures.push(stage));
  assert.deepEqual(called, ["history", "archive", "genres"]);
  assert.deepEqual(result, { inserted: 4, archived: 0, enriched: 12, failedStages: ["archive"] });
  assert.deepEqual(failures, ["archive"]);
});

test("history failures do not stop archive or Last.fm enrichment", async () => {
  const called: string[] = [];
  const result = await runMusicPollStages({
    syncHistory: async () => { called.push("history"); throw new Error("Spotify unavailable"); },
    syncArchive: async () => { called.push("archive"); return 2; },
    enrichGenres: async () => { called.push("genres"); return { configured: true, processed: 5 }; },
  });
  assert.deepEqual(called, ["history", "archive", "genres"]);
  assert.deepEqual(result, { inserted: 0, archived: 2, enriched: 5, failedStages: ["history"] });
});

test("one tag lookup failure never masks a successful history poll", async () => {
  const result = await runMusicPollStages({
    syncHistory: async () => 3,
    syncArchive: async () => 0,
    enrichGenres: async () => { throw new Error("Last.fm rate limited"); },
  });
  assert.deepEqual(result, { inserted: 3, archived: 0, enriched: 0, failedStages: ["genres"] });
});

test("a missing optional Last.fm key is not a failure", async () => {
  const result = await runMusicPollStages({
    syncHistory: async () => 0,
    syncArchive: async () => 0,
    enrichGenres: async () => ({ configured: false, processed: 0 }),
  });
  assert.deepEqual(result.failedStages, []);
});
