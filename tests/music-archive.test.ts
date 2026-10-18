import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLastFmTags, spotifyItemIds, spotifyPlaylistId, validArchiveThreshold } from "../src/domain/music-archive.ts";

const id = "1234567890123456789012";
test("only real Spotify playlist identifiers and URLs are accepted", () => {
  assert.equal(spotifyPlaylistId(id), id);
  assert.equal(spotifyPlaylistId(`https://open.spotify.com/playlist/${id}?si=something`), id);
  assert.equal(spotifyPlaylistId(`spotify:playlist:${id}`), id);
  assert.equal(spotifyPlaylistId(`https://example.com/playlist/${id}`), null);
  assert.equal(spotifyPlaylistId("invalid"), null);
  assert.equal(validArchiveThreshold(5),5);
  assert.equal(validArchiveThreshold(0),null);
  assert.equal(validArchiveThreshold(1000),null);
});
test("Spotify's 2026 playlist items and legacy track payloads", () => {
  assert.deepEqual(spotifyItemIds({ items: [{ item: { id } }, { track: { id } }, { item: { id: "bad" } }] }), [id, id]);
  assert.deepEqual(spotifyItemIds({ items: [] }), []);
});
test("genre enrichment filters community tags, sorts by popularity and caps labels", () => {
  const tags = { toptags: { tag: [
    { name: "seen live", count: "1000" }, { name: "rock", count: "100" },
    { name: "alternative rock", count: "500" }, { name: "indie", count: "20" },
    { name: "pop", count: "10" },
  ] } };
  assert.deepEqual(normalizeLastFmTags(tags), ["Alternative rock", "Rock", "Indie"]);
  assert.deepEqual(normalizeLastFmTags({ toptags: {} }), []);
});
