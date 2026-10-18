import "server-only";

import { getDatabase } from "@/server/database";
import { spotifyAccessToken } from "@/server/spotify";
import { normalizeLastFmTags, spotifyItemIds, spotifyPlaylistId, validArchiveThreshold } from "@/domain/music-archive";

const BASE = "https://api.spotify.com/v1";
type SettingsRow = {
  playlist_id: string; threshold: number; enabled: boolean;
  last_synced_at: Date | string | null; last_error: string | null; pending_count: number;
};
type AccountRow = { playlist_scopes_granted: boolean };
type PlaylistPage = { items?: unknown[]; total?: number };
type SpotifyProfile = { id?: string };
type Playlist = { id?: string; name?: string; owner?: { id?: string } };

export class MusicArchiveInputError extends Error {}

async function settings(userId: string) {
  const sql = getDatabase();
  const [row] = await sql<SettingsRow[]>`
    select playlist_id, threshold, enabled, last_synced_at, last_error, pending_count
    from spotify_archive_settings where user_id = ${userId}
  `;
  return row ?? null;
}

export async function musicArchiveStatus(userId: string) {
  const sql = getDatabase();
  const [account] = await sql<AccountRow[]>`
    select playlist_scopes_granted from spotify_connections where user_id = ${userId}
  `;
  const current = await settings(userId);
  const [totals] = await sql<{ tagged: string; total: string }[]>`
    select count(*)::text as total, count(tags.track_id)::text as tagged
    from spotify_tracks t
    left join spotify_track_tags tags on tags.user_id = t.user_id and tags.track_id = t.track_id
    where t.user_id = ${userId}
  `;
  return {
    connected: Boolean(account),
    playlistPermission: Boolean(account?.playlist_scopes_granted),
    genresConfigured: Boolean(process.env.PCC_LASTFM_API_KEY?.trim()),
    tracksWithTagCache: Number(totals.tagged),
    totalTracks: Number(totals.total),
    playlistId: current?.playlist_id ?? null,
    playlistUrl: current?.playlist_id ? `https://open.spotify.com/playlist/${current.playlist_id}` : null,
    threshold: current?.threshold ?? 5,
    enabled: current?.enabled ?? false,
    lastSyncedAt: current?.last_synced_at ? new Date(current.last_synced_at).toISOString() : null,
    lastError: current?.last_error ?? null,
    pendingCount: current?.pending_count ?? 0,
  };
}

async function spotifyRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error(`Spotify archive API HTTP ${response.status}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}.`);
  }
  return response.json() as Promise<T>;
}

export async function configureMusicArchive(userId: string, input: unknown) {
  if (!input || typeof input !== "object") throw new MusicArchiveInputError("Invalid settings.");
  const value = input as { playlist?: unknown; threshold?: unknown; enabled?: unknown };
  const playlistId = spotifyPlaylistId(value.playlist);
  const threshold = validArchiveThreshold(value.threshold);
  if (!playlistId || threshold === null || typeof value.enabled !== "boolean") {
    throw new MusicArchiveInputError("Enter a Spotify playlist URL and a threshold between 1 and 100.");
  }
  const sql = getDatabase();
  const [account] = await sql<AccountRow[]>`
    select playlist_scopes_granted from spotify_connections where user_id = ${userId}
  `;
  if (value.enabled) {
    if (!account?.playlist_scopes_granted) {
      throw new MusicArchiveInputError("Reconnect Spotify with playlist access enabled first.");
    }
    // Only a playlist owned by this account can be linked.
    const accessToken = await spotifyAccessToken(userId);
    const [profile, playlist] = await Promise.all([
      spotifyRequest<SpotifyProfile>(accessToken, "/me"),
      spotifyRequest<Playlist>(accessToken, `/playlists/${playlistId}`),
    ]);
    if (!profile.id || playlist.owner?.id !== profile.id) {
      throw new MusicArchiveInputError("Choose a playlist owned by your connected Spotify account.");
    }
  }
  await sql`
    insert into spotify_archive_settings (user_id, playlist_id, threshold, enabled, last_error)
    values (${userId}, ${playlistId}, ${threshold}, ${value.enabled}, null)
    on conflict (user_id) do update set
      playlist_id = excluded.playlist_id, threshold = excluded.threshold,
      enabled = excluded.enabled, last_synced_at = null, last_error = null, pending_count = 0, updated_at = now()
  `;
  return musicArchiveStatus(userId);
}

const inFlight = new Map<string, Promise<number>>();

export async function syncMusicArchive(userId: string, force = false): Promise<number> {
  const pending = inFlight.get(userId);
  if (pending) return pending;
  const task = reconcile(userId, force);
  inFlight.set(userId, task);
  try { return await task; }
  finally { if (inFlight.get(userId) === task) inFlight.delete(userId); }
}

async function reconcile(userId: string, force: boolean) {
  const setting = await settings(userId);
  if (!setting?.enabled) return 0;
  const sql = getDatabase();
  try {
    const [conn] = await sql<AccountRow[]>`
      select playlist_scopes_granted from spotify_connections where user_id = ${userId}
    `;
    if (!conn?.playlist_scopes_granted) throw new Error("Playlist permission is not granted; reconnect Spotify.");

    // Archive crossings are based on qualified plays. Historical duration >= 30s,
    // API events count as an approximate play because Spotify does not provide ms_played.
    const newlyQualified = await sql<{ track_id: string }[]>`
      with qualified as (
        select track_id, played_at,
          row_number() over (partition by track_id order by played_at) as ordinal
        from spotify_play_events
        where user_id = ${userId} and (ms_played >= 30000 or ms_played is null)
      )
      insert into spotify_archive_qualifications (user_id, track_id, first_qualified_at)
      select ${userId}, track_id, played_at from qualified
      where ordinal = ${setting.threshold}
      on conflict (user_id, track_id) do nothing
      returning track_id
    `;
    if (!force && !newlyQualified.length && setting.pending_count === 0 && setting.last_synced_at &&
        Date.now() - new Date(setting.last_synced_at).getTime() < 24 * 3600_000) return 0;

    // Read all existing items (new API route, 50 per page) to avoid duplicate additions.
    const accessToken = await spotifyAccessToken(userId);
    const [profile, playlist] = await Promise.all([
      spotifyRequest<SpotifyProfile>(accessToken, "/me"),
      spotifyRequest<Playlist>(accessToken, `/playlists/${setting.playlist_id}`),
    ]);
    if (!profile.id || playlist.owner?.id !== profile.id) {
      throw new Error("Spotify playlist owner no longer matches the connected account.");
    }
    const present = new Set<string>();
    let offset = 0;
    for (;;) {
      const page = await spotifyRequest<PlaylistPage>(accessToken,
        `/playlists/${setting.playlist_id}/items?limit=50&offset=${offset}`);
      for (const id of spotifyItemIds(page)) present.add(id);
      const total = Number(page.total ?? 0);
      offset += 50;
      if (!Array.isArray(page.items) || page.items.length < 50 || offset >= total) break;
      if (offset > 20000) throw new Error("Archive playlist is too large to scan safely.");
    }
    const eligible = await sql<{ track_id: string }[]>`
      select track_id from spotify_archive_qualifications where user_id = ${userId}
      order by first_qualified_at asc
    `;
    const missing = eligible.map((item) => item.track_id).filter((id) => !present.has(id));
    let added = 0;
    // Keep hourly work bounded; remaining songs are added during later polls/syncs.
    for (let offset = 0; offset < Math.min(missing.length, 200); offset += 100) {
      const chunk = missing.slice(offset, offset + 100);
      await spotifyRequest(accessToken, `/playlists/${setting.playlist_id}/items`, {
        method: "POST", body: JSON.stringify({ uris: chunk.map((id) => `spotify:track:${id}`) }),
      });
      added += chunk.length;
    }
    await sql`
      update spotify_archive_settings set last_synced_at = now(), last_error = null, pending_count = ${Math.max(0, missing.length - added)}, updated_at = now()
      where user_id = ${userId}
    `;
    return added;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Archive synchronization failed.";
    await sql`
      update spotify_archive_settings set last_error = ${message.slice(0,350)}, updated_at = now()
      where user_id = ${userId}
    `;
    throw err;
  }
}

const pendingTags = new Set<string>();

export async function enrichMusicGenres(userId: string, limit = 12) {
  const key = process.env.PCC_LASTFM_API_KEY?.trim();
  if (!key) return { configured: false, processed: 0 };
  if (pendingTags.has(userId)) return { configured: true, processed: 0 };
  pendingTags.add(userId);
  try {
    const sql = getDatabase();
    const candidates = await sql<{ track_id: string; name: string; artist: string }[]>`
      select t.track_id, t.name, t.artist
      from spotify_tracks t
      left join spotify_track_tags cached on cached.user_id = t.user_id and cached.track_id = t.track_id
      left join spotify_play_events p on p.user_id = t.user_id and p.track_id = t.track_id
      where t.user_id = ${userId} and cached.track_id is null
      group by t.track_id, t.name, t.artist
      order by count(p.played_at) desc, t.name asc
      limit ${Math.min(50, Math.max(1, limit))}
    `;
    let processed = 0;
    for (const entry of candidates) {
      const params = new URLSearchParams({
        method: "track.getTopTags", api_key: key, format: "json",
        artist: entry.artist.split(",")[0].trim(), track: entry.name, autocorrect: "1",
      });
      const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`, {
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Last.fm tag lookup HTTP ${response.status}.`);
      const result = await response.json() as unknown;
      const tags = normalizeLastFmTags(result);
      await sql`
        insert into spotify_track_tags (user_id, track_id, tags)
        values (${userId}, ${entry.track_id}, ${tags})
        on conflict (user_id, track_id) do update set tags = excluded.tags, fetched_at = now()
      `;
      processed++;
    }
    return { configured: true, processed };
  } finally { pendingTags.delete(userId); }
}
