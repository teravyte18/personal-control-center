import "server-only";

import { getDatabase } from "@/server/database";

// The time capsule intentionally samples unique eligible tracks uniformly,
// rather than weighting by popularity, to surface forgotten songs.
const MIN_QUALIFIED_PLAYS = 5;
type RandomRow = { track_id: string; name: string; artist: string; album: string; plays: string };

async function sample(userId: string, excludeTrackId: string) {
  const sql = getDatabase();
  const rows = await sql<RandomRow[]>`
    with qualified as (
      select track_id, count(*)::text as plays
      from spotify_play_events
      where user_id = ${userId}
        and (ms_played >= 30000 or ms_played is null)
      group by track_id
      having count(*) >= ${MIN_QUALIFIED_PLAYS}
    )
    select t.track_id, t.name, t.artist, t.album, q.plays
    from qualified q
    join spotify_tracks t on t.user_id = ${userId} and t.track_id = q.track_id
    where q.track_id <> ${excludeTrackId}
    order by random() limit 1
  `;
  return rows[0] ?? null;
}

export async function randomArchivedSong(userId: string, previousTrackId: string | null) {
  const exclude = previousTrackId && /^[A-Za-z0-9]{22}$/.test(previousTrackId) ? previousTrackId : "";
  // Avoid an immediate repeat where possible; fall back when the archive has just one song.
  const row = await sample(userId, exclude) ?? (exclude ? await sample(userId, "") : null);
  if (!row) return null;
  return {
    trackId: row.track_id,
    title: row.name,
    artist: row.artist,
    album: row.album,
    qualifiedPlays: Number(row.plays),
    spotifyUrl: `https://open.spotify.com/track/${row.track_id}`,
  };
}
