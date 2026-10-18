export type MusicWindow = { mode: "month" | "year"; value: string; start: string; end: string; timeZone: string };
export type MusicRankedTrack = { trackId: string; name: string; artist: string; plays: number };
export type MusicRankedArtist = { name: string; plays: number; previousPlays: number };
export type MusicRediscovery = MusicRankedTrack & { lastHeardAt: string; returnedAt: string; daysAway: number };
export type MusicInsights = {
  period: MusicWindow;
  plays: number;
  uniqueTracks: number;
  newTracks: number;
  knownDurationMs: number;
  knownDurationPlays: number;
  unknownDurationPlays: number;
  topTracks: MusicRankedTrack[];
  topArtists: MusicRankedArtist[];
  rediscoveries: MusicRediscovery[];
  trend: { period: string; plays: number }[];
};

export function musicWindow(mode: string | null, value: string | null, tz: string | null): MusicWindow | null {
  if (mode !== "month" && mode !== "year") return null;
  if (!value || (mode === "month" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) ||
    (mode === "year" && !/^\d{4}$/.test(value))) return null;
  const year = Number(value.slice(0, 4));
  if (year < 2000 || year > 2100) return null;
  const timeZone = tz || "UTC";
  if (timeZone.length > 80) return null;
  try { new Intl.DateTimeFormat("en", { timeZone }).format(new Date()); }
  catch { return null; }
  const month = mode === "month" ? Number(value.slice(5, 7)) : 1;
  const nextYear = mode === "year" ? year + 1 : month === 12 ? year + 1 : year;
  const nextMonth = mode === "year" ? 1 : month === 12 ? 1 : month + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { mode, value, start, end, timeZone };
}

export function musicMonthOrYear(value: unknown): "month" | "year" {
  return value === "year" ? "year" : "month";
}

export function todayMusicPeriod(now = new Date(), timeZone = "UTC") {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const y = p.find((x) => x.type === "year")?.value ?? "2026";
  const m = p.find((x) => x.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

export function daysBetween(a: string, b: string) {
  return Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
}
