export type SpotifyArchiveSettings = {
  playlistId: string;
  threshold: number;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export function spotifyPlaylistId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (/^[A-Za-z0-9]{22}$/.test(input)) return input;
  if (input.startsWith("spotify:playlist:")) {
    const id = input.slice("spotify:playlist:".length);
    return /^[A-Za-z0-9]{22}$/.test(id) ? id : null;
  }
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "playlist" || !/^[A-Za-z0-9]{22}$/.test(parts[1])) return null;
    return parts[1];
  } catch { return null; }
}

export function validArchiveThreshold(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
}

export function spotifyItemIds(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) return [];
  const ids: string[] = [];
  for (const entry of value.items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry.item ?? entry.track;
    if (item && typeof item.id === "string" && /^[A-Za-z0-9]{22}$/.test(item.id)) ids.push(item.id);
  }
  return ids;
}

const GENRES: Record<string, string> = {
  "hip hop": "Hip-hop", "hip-hop": "Hip-hop", "rap": "Hip-hop", "trap": "Hip-hop",
  "portuguese hip hop": "Portuguese hip-hop", "tuga": "Portuguese hip-hop",
  "rock": "Rock", "alternative rock": "Alternative rock", "indie rock": "Indie rock",
  "pop": "Pop", "indie pop": "Indie pop", "synthpop": "Synthpop", "electropop": "Electropop",
  "electronic": "Electronic", "electronica": "Electronic", "edm": "Electronic", "house": "House",
  "techno": "Techno", "drum and bass": "Drum and bass", "ambient": "Ambient",
  "jazz": "Jazz", "soul": "Soul", "rnb": "R&B", "r&b": "R&B", "neo soul": "Neo-soul",
  "funk": "Funk", "disco": "Disco", "metal": "Metal", "punk": "Punk",
  "classical": "Classical", "folk": "Folk", "country": "Country",
  "reggae": "Reggae", "latin": "Latin", "bossa nova": "Bossa nova",
  "afrobeats": "Afrobeats", "afrobeat": "Afrobeat", "soundtrack": "Soundtrack",
  "grime": "Grime", "indie": "Indie", "alternative": "Alternative",
};

export function normalizeLastFmTags(value: unknown): string[] {
  if (!value || typeof value !== "object" || !("toptags" in value)) return [];
  const root = value.toptags;
  if (!root || typeof root !== "object" || !("tag" in root) || !Array.isArray(root.tag)) return [];
  const list: Array<{ name: string; count: number }> = [];
  for (const t of root.tag) {
    if (!t || typeof t !== "object") continue;
    const name = typeof t.name === "string" ? t.name.toLowerCase().trim().replace(/\s+/g, " ") : "";
    const count = Number(t.count);
    if (!GENRES[name] || !Number.isFinite(count) || count < 1) continue;
    list.push({ name: GENRES[name], count });
  }
  return [...new Map(list.sort((a,b) => b.count - a.count).map((tag) => [tag.name, tag])).values()]
    .slice(0,3).map((tag) => tag.name);
}
