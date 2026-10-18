import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { parseSpotifyAudioRow } from "./spotify-history-parser.mjs";

const root = process.argv[2];
const email = process.env.PCC_SPOTIFY_IMPORT_USER_EMAIL?.trim();
const databaseUrl = process.env.DATABASE_URL;
if (!root || !email || !databaseUrl) {
  console.error("Usage: PCC_SPOTIFY_IMPORT_USER_EMAIL=<your PCC email> node scripts/import-spotify-history.mjs /imports");
  process.exit(1);
}

async function audioFiles(directory) {
  const info = await stat(directory);
  if (info.isFile()) {
    return /Streaming_History_Audio.*\.json$/i.test(path.basename(directory)) ? [directory] : [];
  }
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await audioFiles(child));
    else if (entry.isFile() && /Streaming_History_Audio.*\.json$/i.test(entry.name)) result.push(child);
  }
  return result.sort();
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const [user] = await sql`
    select id from users where lower(email) = lower(${email}) and status = 'active'
  `;
  if (!user) throw new Error("Active PCC account not found for supplied import email.");
  const paths = await audioFiles(root);
  if (!paths.length) throw new Error("No Streaming_History_Audio*.json files found; unzip your extended history first.");
  let imported = 0, ignored = 0;
  for (const file of paths) {
    const data = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(data)) throw new Error("Unexpected Spotify history format: " + path.basename(file));
    for (let start = 0; start < data.length; start += 500) {
      const events = data.slice(start, start + 500).map(parseSpotifyAudioRow).filter(Boolean);
      ignored += Math.min(500, data.length - start) - events.length;
      if (!events.length) continue;
      // One atomic transaction per batch: upsert tracks before referencing them.
      await sql.begin(async (tx) => {
        const tracks = [...new Map(events.map((event) => [event.trackId, event])).values()]
          .map((event) => ({
            user_id: user.id, track_id: event.trackId, name: event.name,
            artist: event.artist, album: event.album,
          }));
        await tx`
          insert into spotify_tracks ${tx(tracks, "user_id", "track_id", "name", "artist", "album")}
          on conflict (user_id, track_id) do update
          set name = excluded.name, artist = excluded.artist, album = excluded.album, updated_at = now()
        `;
        const rows = events.map((e) => ({
          user_id: user.id, track_id: e.trackId, played_at: e.playedAt,
          source: "export", ms_played: e.msPlayed,
        }));
        const inserted = await tx`
          insert into spotify_play_events ${tx(rows, "user_id", "track_id", "played_at", "source", "ms_played")}
          on conflict (user_id, track_id, played_at) do nothing
          returning track_id
        `;
        imported += inserted.length;
      });
    }
    console.log(`Imported ${path.basename(file)}`);
  }
  console.log(`Done: ${imported} new plays; ${ignored} non-song or invalid records ignored. Re-imports are safe.`);
} finally {
  await sql.end({ timeout: 5 });
}
