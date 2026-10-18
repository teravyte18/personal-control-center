// Pure parser: intentionally discards IP address, location, device and playback context.
export function parseSpotifyAudioRow(row) {
  if (!row || typeof row !== "object") return null;
  const uri = row.spotify_track_uri;
  const match = typeof uri === "string" ? /^spotify:track:([A-Za-z0-9]{22})$/.exec(uri) : null;
  if (!match || typeof row.ts !== "string") return null;
  const timestamp = Date.parse(row.ts);
  if (!Number.isFinite(timestamp)) return null;
  const duration = row.ms_played;
  if (!Number.isInteger(duration) || duration < 0 || duration > 2147483647) return null;
  const name = typeof row.master_metadata_track_name === "string" ? row.master_metadata_track_name.trim() : "";
  const artist = typeof row.master_metadata_album_artist_name === "string" ? row.master_metadata_album_artist_name.trim() : "";
  const album = typeof row.master_metadata_album_album_name === "string" ? row.master_metadata_album_album_name.trim() : "";
  if (!name || !artist) return null;
  return { trackId: match[1], playedAt: new Date(timestamp).toISOString(), msPlayed: duration, name, artist, album };
}
