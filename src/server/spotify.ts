import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/server/database";
import { runMusicPollStages } from "@/domain/music-poll";

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const SCOPES = ["user-read-recently-played"];
const PLAYLIST_SCOPES = ["playlist-read-private", "playlist-modify-private", "playlist-modify-public"];

type Connection = {
  user_id: string;
  encrypted_refresh_token: string;
  last_polled_at: Date | string | null;
  last_automated_poll_at: Date | string | null;
  last_error: string | null;
  playlist_scopes_granted: boolean;
};
type TokenResult = { access_token?: string; refresh_token?: string; scope?: string };
type RecentPlay = {
  played_at?: string;
  track?: {
    id?: string;
    name?: string;
    album?: { name?: string };
    artists?: Array<{ name?: string }>;
    is_local?: boolean;
  };
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Spotify integration.`);
  return value;
}

function tokenKey() {
  const value = Buffer.from(required("PCC_SPOTIFY_TOKEN_ENCRYPTION_KEY"), "base64");
  if (value.length !== 32) throw new Error("Spotify encryption key must contain 32 bytes.");
  return value;
}

export function spotifyRedirectUri() {
  const explicit = process.env.PCC_SPOTIFY_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return new URL("/api/integrations/spotify/callback", required("PCC_PUBLIC_URL")).toString();
}

export function isSpotifyConfigured() {
  try {
    required("PCC_SPOTIFY_CLIENT_ID");
    required("PCC_SPOTIFY_CLIENT_SECRET");
    spotifyRedirectUri();
    tokenKey();
    return true;
  } catch {
    return false;
  }
}

export function spotifyAuthorizationUrl(state: string, playlistAccess = false) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", required("PCC_SPOTIFY_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", spotifyRedirectUri());
  url.searchParams.set("scope", [...SCOPES, ...(playlistAccess ? PLAYLIST_SCOPES : [])].join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");
  return url;
}

function encryptToken(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptToken(value: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Spotify credential is malformed.");
  const [nonce, authTag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), nonce);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

async function exchangeToken(parameters: URLSearchParams): Promise<TokenResult> {
  const credentials = Buffer.from(`${required("PCC_SPOTIFY_CLIENT_ID")}:${required("PCC_SPOTIFY_CLIENT_SECRET")}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parameters,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Spotify token request failed (HTTP ${response.status}).`);
  const result = await response.json() as TokenResult;
  if (!result.access_token) throw new Error("Spotify did not return an access token.");
  return result;
}

export async function connectSpotify(userId: string, code: string, playlistAccess = false) {
  const tokens = await exchangeToken(new URLSearchParams({
    grant_type: "authorization_code", code, redirect_uri: spotifyRedirectUri(),
  }));
  if (!tokens.refresh_token) throw new Error("Spotify did not provide a refresh token.");
  const granted = new Set(tokens.scope?.split(" ") ?? []);
  const authorized = playlistAccess && PLAYLIST_SCOPES.every((scope) => granted.has(scope));
  if (playlistAccess && !authorized) throw new Error("Spotify did not grant playlist access.");
  const sql = getDatabase();
  await sql`
    insert into spotify_connections (user_id, encrypted_refresh_token, playlist_scopes_granted)
    values (${userId}, ${encryptToken(tokens.refresh_token)}, ${authorized})
    on conflict (user_id) do update set
      encrypted_refresh_token = excluded.encrypted_refresh_token,
      playlist_scopes_granted = excluded.playlist_scopes_granted,
      last_error = null, updated_at = now()
  `;
}

async function connection(userId: string) {
  const sql = getDatabase();
  const [row] = await sql<Connection[]>`
    select user_id, encrypted_refresh_token, last_polled_at, last_automated_poll_at, last_error, playlist_scopes_granted
    from spotify_connections where user_id = ${userId}
  `;
  return row ?? null;
}

type SpotifySummary = {
  recorded_plays: string;
  recorded_tracks: string;
  historical_ms: string;
  first_play: Date | string | null;
  latest_play: Date | string | null;
};
export async function spotifyStatus(userId: string) {
  const sql = getDatabase();
  const [summary] = await sql<SpotifySummary[]>`
    select count(*)::text as recorded_plays,
      count(distinct track_id)::text as recorded_tracks,
      coalesce(sum(ms_played),0)::text as historical_ms,
      min(played_at) as first_play,
      max(played_at) as latest_play
    from spotify_play_events where user_id = ${userId}
  `;
  const current = await connection(userId);
  return {
    configured: isSpotifyConfigured(),
    workerTokenConfigured: Boolean(process.env.PCC_SPOTIFY_WORKER_TOKEN?.trim()),
    connected: Boolean(current),
    playlistPermission: Boolean(current?.playlist_scopes_granted),
    recordedPlays: Number(summary.recorded_plays),
    recordedTracks: Number(summary.recorded_tracks),
    historicalListeningMs: Number(summary.historical_ms),
    firstPlay: summary.first_play ? new Date(summary.first_play).toISOString() : null,
    latestPlay: summary.latest_play ? new Date(summary.latest_play).toISOString() : null,
    lastPolledAt: current?.last_polled_at ? new Date(current.last_polled_at).toISOString() : null,
    lastAutomatedPollAt: current?.last_automated_poll_at ? new Date(current.last_automated_poll_at).toISOString() : null,
    lastError: current?.last_error ?? null,
  };
}

export async function disconnectSpotify(userId: string) {
  const sql = getDatabase();
  await sql`delete from spotify_connections where user_id = ${userId}`;
  // Keep the listening archive; disconnect only revokes the PCC-stored credential.
}

export async function spotifyAccessToken(userId: string) {
  const current = await connection(userId);
  if (!current) throw new Error("Spotify is not connected.");
  const refreshed = await exchangeToken(new URLSearchParams({
    grant_type: "refresh_token", refresh_token: decryptToken(current.encrypted_refresh_token),
  }));
  if (refreshed.refresh_token) {
    const sql = getDatabase();
    await sql`
      update spotify_connections set encrypted_refresh_token = ${encryptToken(refreshed.refresh_token)}, updated_at = now()
      where user_id = ${userId}`;
  }
  return refreshed.access_token as string;
}

const inFlight = new Map<string, Promise<number>>();
export async function syncSpotify(userId: string): Promise<number> {
  const pending = inFlight.get(userId);
  if (pending) return pending;
  const task = doSyncSpotify(userId);
  inFlight.set(userId, task);
  try {
    return await task;
  } finally {
    if (inFlight.get(userId) === task) inFlight.delete(userId);
  }
}

async function doSyncSpotify(userId: string) {
  const current = await connection(userId);
  if (!current) throw new Error("Spotify is not connected.");
  const sql = getDatabase();
  try {
    const accessToken = await spotifyAccessToken(userId);
    const [latest] = await sql<{ played_at: Date | null }[]>`
      select max(played_at) as played_at from spotify_play_events where user_id = ${userId}
    `;
    const query = new URLSearchParams({ limit: "50" });
    if (latest?.played_at) query.set("after", String(new Date(latest.played_at).getTime()));
    const response = await fetch(`${API_URL}/me/player/recently-played?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Spotify recent-play request failed (HTTP ${response.status}).`);
    const result = await response.json() as { items?: RecentPlay[] };
    let inserted = 0;
    const plays = Array.isArray(result.items) ? result.items : [];
    for (const item of plays) {
      const track = item.track;
      const trackId = track?.id;
      if (!trackId || !/^[A-Za-z0-9]{22}$/.test(trackId) || track?.is_local) continue;
      const when = item.played_at && Date.parse(item.played_at);
      if (!when || !Number.isFinite(when)) continue;
      const name = track.name?.trim();
      const artist = track.artists?.map((entry) => entry.name?.trim()).filter(Boolean).join(", ");
      if (!name || !artist) continue;
      await sql.begin(async (tx) => {
        await tx`
          insert into spotify_tracks (user_id, track_id, name, artist, album)
          values (${userId}, ${trackId}, ${name}, ${artist}, ${track.album?.name ?? ""})
          on conflict (user_id, track_id) do update set
            name = excluded.name, artist = excluded.artist, album = excluded.album, updated_at = now()
        `;
        const saved = await tx`
          insert into spotify_play_events (user_id, track_id, played_at, source, ms_played)
          values (${userId}, ${trackId}, ${new Date(when).toISOString()}, 'api', null)
          on conflict (user_id, track_id, played_at) do nothing returning track_id
        `;
        inserted += saved.length;
      });
    }
    await sql`
      update spotify_connections set last_polled_at = now(), last_error = null, updated_at = now()
      where user_id = ${userId}
    `;
    return inserted;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spotify synchronization failed.";
    await sql`
      update spotify_connections set last_error = ${message.slice(0, 350)}, updated_at = now()
      where user_id = ${userId}
    `;
    throw error;
  }
}

export async function syncAllConnectedSpotify() {
  if (!isSpotifyConfigured()) {
    return { configured: false, connected: 0, inserted: 0, archived: 0, enriched: 0,
      failures: 0, historyFailures: 0, archiveFailures: 0, genreFailures: 0 };
  }
  const sql = getDatabase();
  const users = await sql<{ user_id: string }[]>`select user_id from spotify_connections`;
  const { syncMusicArchive, enrichMusicGenres } = await import("@/server/music-archive");
  let inserted = 0, archived = 0, enriched = 0;
  let failures = 0, historyFailures = 0, archiveFailures = 0, genreFailures = 0;
  for (const user of users) {
    // Only the authorized worker endpoint calls this function. Track its actual
    // invocation separately from the manual "Sync now" timestamp.
    await sql`
      update spotify_connections set last_automated_poll_at = now()
      where user_id = ${user.user_id}
    `;
    const run = await runMusicPollStages({
      syncHistory: () => syncSpotify(user.user_id),
      syncArchive: () => syncMusicArchive(user.user_id),
      enrichGenres: () => enrichMusicGenres(user.user_id, 12),
    }, (stage, error) => {
      const message = error instanceof Error ? error.message : "Unknown error.";
      console.error(`Automatic music ${stage} failed: ${message}`);
    });
    inserted += run.inserted;
    archived += run.archived;
    enriched += run.enriched;
    if (run.failedStages.length) failures++;
    if (run.failedStages.includes("history")) historyFailures++;
    if (run.failedStages.includes("archive")) archiveFailures++;
    if (run.failedStages.includes("genres")) genreFailures++;
  }
  return { configured: true, connected: users.length, inserted, archived, enriched,
    failures, historyFailures, archiveFailures, genreFailures };
}

export function validSpotifyWorkerToken(request: Request) {
  const expected = process.env.PCC_SPOTIFY_WORKER_TOKEN?.trim();
  const value = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!expected || !value) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}
