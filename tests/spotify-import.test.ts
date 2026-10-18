import assert from "node:assert/strict";
import test from "node:test";
import { parseSpotifyAudioRow } from "../scripts/spotify-history-parser.mjs";

const song = {
  ts: "2026-01-12T19:30:00Z",
  spotify_track_uri: "spotify:track:1234567890123456789012",
  master_metadata_track_name: "Example Song",
  master_metadata_album_artist_name: "Example Artist",
  master_metadata_album_album_name: "Example Album",
  ms_played: 45000,
  ip_addr: "192.0.2.123",
  platform: "Example device",
};

test("normalizes timestamp and keeps only music metadata", () => {
  const record = parseSpotifyAudioRow(song);
  assert.deepEqual(record, {
    trackId: "1234567890123456789012",
    playedAt: "2026-01-12T19:30:00.000Z",
    msPlayed: 45000,
    name: "Example Song",
    artist: "Example Artist",
    album: "Example Album",
  });
  assert.equal("ip_addr" in record!, false);
});

test("rejects podcasts, videos, invalid duration or missing identifiers", () => {
  assert.equal(parseSpotifyAudioRow({ ...song, spotify_track_uri: null, spotify_episode_uri: "spotify:episode:test" }), null);
  assert.equal(parseSpotifyAudioRow({ ...song, spotify_track_uri: "spotify:track:invalid" }), null);
  assert.equal(parseSpotifyAudioRow({ ...song, ms_played: -5 }), null);
  assert.equal(parseSpotifyAudioRow({ ...song, ts: "not a date" }), null);
});
