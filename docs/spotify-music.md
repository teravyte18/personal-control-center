# Spotify listening history (private Music space)

## Goal and shipped scope

The Music space is a personal time capsule of Spotify listening. It does **not** try to replace Spotify playback, recommendations, or playlists.

This first slice includes:

- per-user PostgreSQL tables for track metadata, dated playback events and encrypted OAuth refresh tokens;
- idempotent importer for Spotify **Extended Streaming History** audio JSON;
- Spotify Premium OAuth connection and manual sync;
- hourly background polling in a small optional Alpine Compose service;
- a Music space with connection status, totals, first/last play and last poll.

Planned follow-ups: month/year Wrapped-style views, artist/tag enrichment and a 5-play permanent archive playlist. Nothing in this slice modifies any Spotify playlist.

## Important data boundaries

- Raw Spotify exports are private and must never enter Git, PRs, issues, or the application image.
- The importer deliberately retains only Spotify track ID, title, artist, album, timestamp, and duration. It ignores IP address, platform, playback reason, geographic information, shuffle, skip and other metadata.
- Podcast and video entries are not ingested.
- Distinct playback events use a per-user `(track_id, played_at)` key; rerunning the importer or polling twice is safe.
- Exported `ms_played` is stored exactly, including skips, to allow different thresholds later.
- API events have `ms_played = NULL`: Spotify's recently-played endpoint does not provide exact duration. Never treat their listening-time sums as complete.
- Counts and track metadata are user-scoped; OAuth refresh tokens use AES-256-GCM at rest.
- Disconnect removes the app's refresh token but **keeps** the historical music data; revoking the app in Spotify account settings is a separate action.
- No genre or emotional/mood labels are inferred yet.

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
