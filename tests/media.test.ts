import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaDetails,
  getMediaItems,
  isMediaItem,
  mediaMatchesQuery,
  mediaProgressLabel,
  normalizeMediaDetails,
  parseMediaDetails,
  serializeMediaDetails,
  sortMediaItems,
} from "../src/domain/media.ts";
import { getNotes } from "../src/domain/notes.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(id: string, description: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    title: `Media ${id}`,
    description,
    actions: [],
    kind: "note",
    status: "active",
    area: "personal",
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
    ...overrides,
  };
}

test("serializes media details and preserves multiline thoughts", () => {
  const description = serializeMediaDetails({
    ...createMediaDetails(),
    type: "series",
    status: "watching",
    thoughts: "Strong start\r\nGreat atmosphere",
    currentSeason: 2,
    currentEpisode: 4,
  });
  const parsed = parseMediaDetails(description);
  assert.ok(parsed);
  assert.equal(parsed.type, "series");
  assert.equal(parsed.status, "watching");
  assert.equal(parsed.thoughts, "Strong start\nGreat atmosphere");
  assert.equal(parsed.currentSeason, 2);
  assert.equal(parsed.currentEpisode, 4);
  assert.equal(isMediaItem(item("one", description)), true);
  assert.equal(parseMediaDetails("Normal note body"), null);
});

test("normalizes rating, dates, status, type, and series progress", () => {
  const normalized = normalizeMediaDetails({
    type: "series",
    status: "completed",
    rating: 8.26,
    watchedDate: "2026-08-31",
    startDate: "2026-09-01",
    finishDate: "2026-02-31",
    currentSeason: 3.9,
    currentEpisode: 7.8,
  });
  assert.equal(normalized.rating, 8.5);
  assert.equal(normalized.watchedDate, "");
  assert.equal(normalized.startDate, "2026-09-01");
  assert.equal(normalized.finishDate, "");
  assert.equal(normalized.currentSeason, 3);
  assert.equal(normalized.currentEpisode, 7);

  const film = normalizeMediaDetails({
    type: "film",
    watchedDate: "2026-09-14",
    startDate: "2026-09-01",
    finishDate: "2026-09-02",
    currentSeason: 2,
    currentEpisode: 5,
  });
  assert.equal(film.watchedDate, "2026-09-14");
  assert.equal(film.startDate, "");
  assert.equal(film.finishDate, "");
  assert.equal(film.currentSeason, undefined);
  assert.equal(film.currentEpisode, undefined);
});

test("legacy movie start or finish dates migrate into watched date", () => {
  assert.equal(normalizeMediaDetails({ type: "film", finishDate: "2026-09-10" }).watchedDate, "2026-09-10");
  assert.equal(normalizeMediaDetails({ type: "film", startDate: "2026-09-09" }).watchedDate, "2026-09-09");
});

test("media list ignores ordinary notes and inactive media records", () => {
  const description = serializeMediaDetails({ ...createMediaDetails(), status: "watching" });
  const media = getMediaItems([
    item("active", description),
    item("normal-note", "ordinary note"),
    item("archived", description, { status: "archived" }),
  ]);
  assert.deepEqual(media.map((entry) => entry.item.id), ["active"]);
  assert.equal(mediaMatchesQuery(media[0], "active"), true);
  assert.equal(mediaMatchesQuery(media[0], "missing"), false);
});

test("normal Notes excludes media metadata records", () => {
  const media = item("media", serializeMediaDetails(createMediaDetails()));
  const note = item("note", "Normal note text", { title: "Normal note" });
  assert.deepEqual(getNotes([media, note]).map((candidate) => candidate.id), ["note"]);
});

test("media browsing prioritizes watching and rated entries", () => {
  const media = getMediaItems([
    item("wishlist", serializeMediaDetails({ ...createMediaDetails(), status: "wishlist" }), { title: "Wishlist" }),
    item("completed-low", serializeMediaDetails({ ...createMediaDetails(), status: "completed", rating: 7 }), { title: "Beta" }),
    item("watching", serializeMediaDetails({ ...createMediaDetails(), status: "watching" }), { title: "Current" }),
    item("completed-high", serializeMediaDetails({ ...createMediaDetails(), status: "completed", rating: 9 }), { title: "Alpha" }),
    item("dropped", serializeMediaDetails({ ...createMediaDetails(), status: "dropped" }), { title: "Dropped" }),
  ]);
  assert.deepEqual(sortMediaItems(media).map((entry) => entry.item.id), [
    "watching",
    "completed-high",
    "completed-low",
    "dropped",
    "wishlist",
  ]);
});

test("formats lightweight series progress", () => {
  assert.equal(mediaProgressLabel({ type: "film", currentSeason: 2, currentEpisode: 3 }), "");
  assert.equal(mediaProgressLabel({ type: "series", currentSeason: 2, currentEpisode: 3 }), "S2 · E3");
  assert.equal(mediaProgressLabel({ type: "series", currentSeason: 2, currentEpisode: undefined }), "Season 2");
  assert.equal(mediaProgressLabel({ type: "series", currentSeason: undefined, currentEpisode: 3 }), "Episode 3");
});
