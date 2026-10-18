# Spotify listening history (private Music space)

## Goal and shipped scope

The Music space is a personal time capsule of Spotify listening. It does **not** try to replace Spotify playback, recommendations, or playlists.

This first slice includes:

- per-user PostgreSQL tables for track metadata, dated playback events and encrypted OAuth refresh tokens;
- idempotent importer for Spotify **Extended Streaming History** audio JSON;
- Spotify Premium OAuth connection and manual sync;
- hourly background polling in a small optional Alpine Compose service;
- a Music space with connection status, totals, first/last play and last poll.

The second slice (issue #86) adds a timezone-aware monthly/yearly Music Insights panel, listing plays, distinct songs, first-ever songs, most played tracks, top credited artists, six-month rediscoveries and a year-at-a-glance view.

The API is GET `/api/music/insights?mode=month&period=2026-10&tz=Europe/Lisbon` (or `mode=year&period=2026`). It requires an authenticated session and always derives the user from that session. Dates are bounded using PostgreSQL local-calendar timestamps converted to UTC; no listening data is sent to third parties for analytics.

Music now follows the Expenses space hierarchy: timeline and archive settings live in separate tabs; month/year controls lead into compact summaries, genre coverage and ranked listening lists. Ranked artists are ordered by their **numeric** play counts, not the text representation of those counts. The genre section remains visible even with zero enrichment, offering setup guidance rather than silently disappearing. The archive's optional Last.fm key needs to be configured privately on the Pi before any tags can appear.

Historical exported durations are summed separately; Spotify API play events have null duration and contribute to play counts but *not* recorded listening hours. The UI explicitly reports that distinction. A "first-time song" means first ever recorded in the database; missing historical records can affect this label. Artist names are currently copied from Spotify's credited-artist field (collaborations may share one label), not split into separate contributors. "Artists on the rise" compares the selected period's counts with the prior period and is a listening-pattern heuristic, not a mood inference.

Issue #87 implements an optional archive and genre enrichment layer:

- The Music page links an *existing, owner-controlled* Spotify playlist via its URL and a configurable threshold (default 5).
- Archive editing is opt-in. **Reconnect Spotify with playlist access** requests `playlist-read-private`, `playlist-modify-private`, and `playlist-modify-public` beyond the basic recent-plays scope. The existing connection remains read-only until this consent flow is taken.
- Saving preferences alone does not write to Spotify. Once enabled, the hourly collector (or Music → Check playlist now) reconciles: load the playlist's current items, calculate qualified tracks and append missing Spotify URIs in batches. Never delete or reorder existing entries.
- Historical qualified listens use `ms_played >= 30000`. API listens with null duration count as **approximate** qualified events. A track's first threshold-crossing timestamp is stored privately.
- The existing playlist need not be recreated; it is scanned before new writes. Permissions and ownership are checked before enabling.
- A Spotify session with the extended permissions must be authorized once for the extra scopes; saved refresh tokens remain AES-256-GCM encrypted.
- `PCC_LASTFM_API_KEY` is an optional server-side key for `track.getTopTags`. Tags are mapped through a small reviewed genre vocabulary, cached once per track, and the worker enriches up to 12 tracks per hour, prioritizing most-played songs. The Music page also has an "Enrich next 25 songs" control. Missing or unsupported tags are valid empty results; partial coverage is shown in the UI.
- Genre charts represent **the top available cached tag** on enriched songs, not complete ground truth; genres are neither user mood nor an AI-generated inference. No new external libraries are required.

The Spotify Web API uses the 2026 endpoints `GET/POST /playlists/{id}/items`; reads have a 50-item page maximum and writes support up to 100 URIs. The reconciliation writer caps additions at 200 items per run and honors Spotify errors (including 429) rather than retrying aggressively. The collector keeps the history even if playlist/Last.fm API calls fail. Nothing exposes raw exports or credentials.

See https://developer.spotify.com/documentation/web-api/reference/get-playlists-items and https://www.last.fm/api/show/track.getTopTags.

### Setup checklist for archive and optional genres
1. Keep the existing Spotify developer client ID/secret/encryption key unchanged.
2. In Music, select **Reconnect Spotify with playlist access**. Approve the explicitly added playlist scopes.
3. Paste a Spotify playlist link, choose the minimum plays, enable automatic additions, and Save.
4. Press **Check playlist now** to verify the first reconciliation. Existing entries are not removed or reordered.
5. Optional: create a Last.fm API key and set `PCC_LASTFM_API_KEY` privately in `.env`, then redeploy the app container with its environment. The collector's hourly enrichment remains bounded; manual enrichment is available from Music.
6. If the playlist owner differs from your Spotify account, linking while enabled is rejected. If you want to stop automatic additions, disable it and Save; archived Spotify songs remain intact.

## Random song from your personal archive

The **Rediscover a song → Surprise me** control on Music selects one song uniformly
from tracks in the user's own listening-history database with at least **five**
qualifying plays. Historical export plays count when `ms_played >= 30000` and
recently-played API events count approximately because Spotify does not expose
their duration. The feature works without a linked Spotify playlist or playlist
editing permissions. It never changes a playlist or starts music remotely.

The result displays title, artist, qualified play count and an **Open in Spotify**
link. **Another song** avoids returning the immediately previous track when
more than one eligible song exists. Selection is uniform *across tracks* (not
weighted by play counts) to surface forgotten listening phases. It uses an
authenticated, user-scoped, uncached API route:
`GET /api/music/random?exclude=<previous-spotify-track-id>`.
With no qualifying tracks, an informative empty state appears.

This intentionally uses a fixed **five-play threshold**, independently of
a separately configured automatic-playlist threshold.

## Important data boundaries

- Raw Spotify exports are private and must never enter Git, PRs, issues, or the application image.
- The importer deliberately retains only Spotify track ID, title, artist, album, timestamp, and duration. It ignores IP address, platform, playback reason, geographic information, shuffle, skip and other metadata.
- Podcast and video entries are not ingested.
- Distinct playback events use a per-user `(track_id, played_at)` key; rerunning the importer or polling twice is safe.
- Exported `ms_played` is stored exactly, including skips, to allow different thresholds later.
- API events have `ms_played = NULL`: Spotify's recently-played endpoint does not provide exact duration. Never treat their listening-time sums as complete.
- Counts and track metadata are user-scoped; OAuth refresh tokens use AES-256-GCM at rest.
- Disconnect removes the app's refresh token but **keeps** the historical music data; revoking the app in Spotify account settings is a separate action.
- No emotional/mood labels are inferred; rediscovery thresholds are based only on recorded timestamps.

## Spotify developer setup

Spotify Developer Dashboard: https://developer.spotify.com/dashboard

1. Create a Spotify development app (the developer account must have **Spotify Premium**).
2. Register the precise production redirect URI:
   `https://your-pcc-host.ts.net/api/integrations/spotify/callback`
3. Add the account to the app's allowlist if Spotify asks for it. Use **Web API** / server-side Authorization Code OAuth.
4. In the Pi's private `.env`, set:
   ```dotenv
   PCC_SPOTIFY_CLIENT_ID=your-client-id
   PCC_SPOTIFY_CLIENT_SECRET=your-client-secret
   PCC_SPOTIFY_TOKEN_ENCRYPTION_KEY=base64-key-from-openssl
   PCC_SPOTIFY_WORKER_TOKEN=long-random-worker-token
   PCC_SPOTIFY_POLL_INTERVAL_SECONDS=3600
   ```
   Generate the two secret values independently:
   ```sh
   openssl rand -base64 32
   openssl rand -hex 32
   ```
   Leave `PCC_SPOTIFY_REDIRECT_URI` blank unless an override is required.
5. Deploy normally (`scripts/deploy-production.sh main`) after merging, then visit **Spaces → Music → Connect Spotify**.
6. Press **Sync now** and verify that the Last API check timestamp changes. The polling worker then runs hourly.

If `PCC_SPOTIFY_WORKER_TOKEN` is blank, the worker sleeps without polling. Never point `PCC_PUBLIC_URL` at an HTTP public hostname.

## One-time backfill from Spotify Extended Streaming History

Complete this after deployment, ideally **before** connecting Spotify so the API starts beyond the latest exported timestamp.

1. Transfer your downloaded **extended history ZIP** privately to the Pi (for example via SCP), outside the repository.
2. From the checkout on the Pi, extract it under the Git-ignored import directory:
   ```sh
   mkdir -p data/spotify-import
   unzip -q /path/to/your-private-history.zip -d data/spotify-import
   ```
3. Run the importer in an ephemeral container with the same PostgreSQL access as the migration service. Supply the email of the PCC account that owns this data:
   ```sh
   docker compose run --rm \
     -e PCC_SPOTIFY_IMPORT_USER_EMAIL="your-pcc-login@example.com" \
     -v "$PWD/data/spotify-import:/imports:ro" \
     migrate node scripts/import-spotify-history.mjs /imports
   ```
4. Verify record counts in the Music page, then delete the extracted raw JSONs and original ZIP from the Pi if no longer needed.

The importer processes every `Streaming_History_Audio*.json` file recursively and ignores videos/podcasts. It inserts in small transactions; repeated runs only add missing events.

If the app has already been collecting live plays before import, overlap at the export/API boundary can result in a few near-duplicate plays because the APIs may timestamp the same listening differently. Import first whenever possible.

## Recovery, monitoring and limitations

- PostgreSQL backup covers the tables automatically.
- The Spotify encryption key must be kept alongside your other recovery secrets. Rotating or losing it requires reconnecting Spotify.
- API reads are limited to the last 50 recent items and provide timestamps but no exact duration. Polling hourly usually works, but a prolonged outage or >50 plays between checks can miss data. This is **not** a guaranteed lossless stream.
- The service relies on the Spotify Web API's current availability and permissions. API 401/403/429 failures leave history intact and show the last sync error in Music.
- The worker's internal endpoint requires a separate Bearer secret and is not publicly usable.
- If Spotify no longer allows a requested scope, reconnect and consult its developer migration guides before changing the API integration.

## Validation

```sh
npm run lint
npm test
npm run build
docker compose config --quiet
docker compose --profile funnel config --quiet
```

Acceptance: user A cannot read/mutate user B's history or tokens; no raw export appears in Git; repeated imports/polls never duplicate exact event keys; the worker remains disabled unless its token is configured; disconnect never deletes music history.
