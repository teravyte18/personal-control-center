import "server-only";

import { musicWindow, type MusicInsights } from "@/domain/music-insights";
import { getDatabase } from "@/server/database";

type Stats = { plays: string; unique_tracks: string; known_ms: string; known_plays: string; unknown_plays: string };
type Track = { track_id: string; name: string; artist: string; plays: string; tags: string[] | null };
type Artist = { name: string; plays: string; previous_plays: string };
type Genre = { name: string; plays: string };
type Novel = { total: string };
type Return = { track_id: string; name: string; artist: string; plays: string; last_heard: Date | string; first_return: Date | string; days_away: number };
type Trend = { period: string; plays: string };

export async function getMusicInsights(userId: string, mode: string | null, value: string | null, timeZone: string | null): Promise<MusicInsights | null> {
  const period = musicWindow(mode, value, timeZone);
  if (!period) return null;
  const sql = getDatabase();
  const start = period.start, end = period.end, tz = period.timeZone;
  // Local calendar boundaries are converted to UTC by PostgreSQL, preserving DST shifts.
  const lower = sql`(${start}::timestamp at time zone ${tz})`;
  const upper = sql`(${end}::timestamp at time zone ${tz})`;
  const prevStart = period.mode === "month"
    ? new Date(Date.UTC(Number(start.slice(0,4)), Number(start.slice(5,7)) - 2, 1)).toISOString().slice(0,10)
    : `${Number(start.slice(0,4))-1}-01-01`;
  const previousLower = sql`(${prevStart}::timestamp at time zone ${tz})`;

  const [stats, tracks, artists, discoveries, returns, timeline, genres] = await Promise.all([
    sql<Stats[]>`
      select count(*)::text as plays, count(distinct track_id)::text as unique_tracks,
        coalesce(sum(ms_played), 0)::text as known_ms,
        count(ms_played)::text as known_plays,
        (count(*) - count(ms_played))::text as unknown_plays
      from spotify_play_events
      where user_id = ${userId} and played_at >= ${lower} and played_at < ${upper}
    `,
    sql<Track[]>`
      select p.track_id, t.name, t.artist, tags.tags, count(*)::text as plays
      from spotify_play_events p join spotify_tracks t on t.user_id = p.user_id and t.track_id = p.track_id
      left join spotify_track_tags tags on tags.user_id = t.user_id and tags.track_id = t.track_id
      where p.user_id = ${userId} and p.played_at >= ${lower} and p.played_at < ${upper}
      group by p.track_id, t.name, t.artist, tags.tags order by count(*) desc, t.name asc limit 15
    `,
    sql<Artist[]>`
      with counted as (
        select t.artist as name, count(*) filter (where p.played_at >= ${lower})::int as plays,
          count(*) filter (where p.played_at < ${lower})::int as previous_plays
        from spotify_play_events p join spotify_tracks t on t.user_id = p.user_id and t.track_id = p.track_id
        where p.user_id = ${userId} and p.played_at >= ${previousLower} and p.played_at < ${upper}
        group by t.artist
      )
      select name, plays::text, previous_plays::text from counted
      where plays > 0 order by plays desc, name asc limit 12
    `,
    sql<Novel[]>`
      select count(*)::text as total from (
        select track_id from spotify_play_events where user_id = ${userId}
        group by track_id having min(played_at) >= ${lower} and min(played_at) < ${upper}
      ) first_time
    `,
    sql<Return[]>`
      with first_in_window as (
        select p.track_id, min(p.played_at) first_return, count(*)::text plays
        from spotify_play_events p
        where p.user_id = ${userId} and p.played_at >= ${lower} and p.played_at < ${upper}
        group by p.track_id
      )
      select first_in_window.track_id, t.name, t.artist, first_in_window.plays,
        prior.last_heard, first_in_window.first_return,
        floor(extract(epoch from (first_in_window.first_return - prior.last_heard)) / 86400)::int as days_away
      from first_in_window
      join spotify_tracks t on t.user_id = ${userId} and t.track_id = first_in_window.track_id
      join lateral (
        select max(played_at) last_heard from spotify_play_events
        where user_id = ${userId} and track_id = first_in_window.track_id
          and played_at < ${lower}
      ) prior on prior.last_heard is not null
      where first_in_window.first_return - prior.last_heard >= interval '180 days'
      order by days_away desc, first_in_window.plays desc limit 12
    `,
    sql<Trend[]>`
      select to_char(date_trunc('month', played_at at time zone ${tz}), 'YYYY-MM') period,
        count(*)::text plays
      from spotify_play_events
      where user_id = ${userId} and played_at >= ${lower} and played_at < ${upper}
      group by 1 order by 1 asc
    `,
    sql<Genre[]>`
      select tags.tags[1] as name, count(*)::text as plays
      from spotify_play_events p
      join spotify_track_tags tags on tags.user_id = p.user_id and tags.track_id = p.track_id
      where p.user_id = ${userId} and p.played_at >= ${lower} and p.played_at < ${upper}
        and cardinality(tags.tags) > 0
      group by tags.tags[1] order by count(*) desc limit 8
    `,
  ]);

  return {
    period,
    plays: Number(stats[0].plays),
    uniqueTracks: Number(stats[0].unique_tracks),
    newTracks: Number(discoveries[0].total),
    knownDurationMs: Number(stats[0].known_ms),
    knownDurationPlays: Number(stats[0].known_plays),
    unknownDurationPlays: Number(stats[0].unknown_plays),
    topTracks: tracks.map((t) => ({ trackId: t.track_id, name: t.name, artist: t.artist, plays: Number(t.plays), tags: t.tags ?? [] })),
    topArtists: artists.map((a) => ({ name: a.name, plays: Number(a.plays), previousPlays: Number(a.previous_plays) })),
    topGenres: genres.map((g) => ({ name: g.name, plays: Number(g.plays) })),
    rediscoveries: returns.map((r) => ({
      trackId: r.track_id, name: r.name, artist: r.artist, plays: Number(r.plays),
      lastHeardAt: new Date(r.last_heard).toISOString(), returnedAt: new Date(r.first_return).toISOString(), daysAway: r.days_away,
    })),
    trend: timeline.map((t) => ({ period: t.period, plays: Number(t.plays) })),
  };
}
