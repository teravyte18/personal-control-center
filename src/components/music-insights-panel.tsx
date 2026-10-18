"use client";

import { useEffect, useMemo, useState } from "react";
import { todayMusicPeriod, type MusicInsights } from "@/domain/music-insights";

const formatter = new Intl.NumberFormat(undefined);
const safeTimeZone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
})();

function formatCount(n: number) { return formatter.format(n); }
function songLink(trackId: string) { return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`; }
function duration(milliseconds: number) { return `${Math.round(milliseconds / 3600000).toLocaleString()}h`; }

function RankedTracks({ tracks }: { tracks: MusicInsights["topTracks"] }) {
  if (!tracks.length) return <p className="text-sm text-slate-500">No tracks in this period.</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {tracks.map((track, index) => (
        <li key={track.trackId} className="flex items-center gap-3 py-2.5">
          <span className="w-6 shrink-0 text-right text-xs text-slate-400">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <a href={songLink(track.trackId)} target="_blank" rel="noopener noreferrer"
              className="block truncate text-sm font-semibold text-slate-800 hover:underline">{track.name}</a>
            <p className="truncate text-xs text-slate-500">{track.artist}</p>
            {track.tags?.length ? <p className="truncate text-[11px] text-emerald-700">{track.tags.slice(0,2).join(" · ")}</p> : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-slate-500">{formatCount(track.plays)} plays</span>
        </li>
      ))}
    </ol>
  );
}

export function MusicInsightsPanel() {
  const [mode, setMode] = useState<"month" | "year">("month");
  const [period, setPeriod] = useState(() => todayMusicPeriod(new Date(), safeTimeZone));
  const [insights, setInsights] = useState<MusicInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = period.slice(0, 4);
  const timeZone = safeTimeZone;
  useEffect(() => {
    let active = true;
    const search = new URLSearchParams({ mode, period: mode === "year" ? year : period, tz: timeZone });
    void fetch(`/api/music/insights?${search}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as MusicInsights & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load music insights.");
        if (active) { setInsights(body); setError(""); setLoading(false); }
      })
      .catch((cause) => {
        if (active) { setInsights(null); setLoading(false); setError(cause instanceof Error ? cause.message : "Unable to load insights."); }
      });
    return () => { active = false; };
  }, [mode, period, year, timeZone]);

  const topPhase = useMemo(() => insights?.topArtists
    .filter((artist) => artist.plays >= 5 && artist.plays > artist.previousPlays * 2)
    .slice(0, 4) ?? [], [insights]);
  const trendMax = Math.max(1, ...(insights?.trend.map((month) => month.plays) ?? []));

  function changeMode(next: "month" | "year") {
    setMode(next); setLoading(true);
  }

  function shift(direction: -1 | 1) {
    const y = Number(year);
    const m = Number(period.slice(5, 7));
    if (mode === "year") {
      const next = y + direction;
      if (next >= 2000 && next <= 2100) setPeriod(`${next}-${period.slice(5, 7)}`);
    } else {
      const next = new Date(Date.UTC(y, m - 1 + direction, 1));
      if (next.getUTCFullYear() >= 2000 && next.getUTCFullYear() <= 2100) {
        setPeriod(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
      }
    }
    setLoading(true);
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Your musical timeline</h3>
          <p className="mt-1 text-sm text-slate-500">What defined a month or a year of your listening?</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Music period type" value={mode} onChange={(e) => changeMode(e.target.value as "month" | "year")}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="month">Month</option><option value="year">Year</option>
          </select>
          <button type="button" aria-label="Previous period" onClick={() => shift(-1)}
            className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-slate-700">←</button>
          <input aria-label="Selected music period" value={mode === "year" ? year : period}
            type={mode === "year" ? "number" : "month"} min={mode === "year" ? "2000" : "2000-01"} max={mode === "year" ? "2100" : "2100-12"}
            onChange={(e) => {
              if (mode === "year") {
                if (/^\d{4}$/.test(e.target.value)) { setPeriod(`${e.target.value}-${period.slice(5, 7)}`); setLoading(true); }
              } else { setPeriod(e.target.value); setLoading(true); }
            }}
            className="min-h-11 w-36 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm text-slate-900"/>
          <button type="button" aria-label="Next period" onClick={() => shift(1)}
            className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-slate-700">→</button>
        </div>
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading this period…</p> : null}
      {!loading && insights ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Play events", formatCount(insights.plays)],
              ["Different songs", formatCount(insights.uniqueTracks)],
              ["First-time songs", formatCount(insights.newTracks)],
              ["Recorded listening", duration(insights.knownDurationMs)],
            ].map(([title, value]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{title}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Listening time covers {formatCount(insights.knownDurationPlays)} exports with durations.
            {insights.unknownDurationPlays > 0 ? ` ${formatCount(insights.unknownDurationPlays)} API play events have unknown durations and are excluded from hours.` : ""}
            {" "}Calendar boundaries: {timeZone}.
          </p>

          {mode === "year" && insights.trend.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-base font-semibold">Months at a glance</h4>
              <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = `${year}-${String(i + 1).padStart(2, "0")}`;
                  const count = insights.trend.find((t) => t.period === month)?.plays ?? 0;
                  return <button key={month} type="button" onClick={() => { setPeriod(month); changeMode("month"); }}
                    className="flex min-w-0 flex-col items-center gap-1 rounded-lg hover:bg-slate-100"
                    title={`${month}: ${count} plays`}>
                    <span className="text-[10px] text-slate-500">{formatCount(count)}</span>
                    <span className="flex h-24 w-full items-end overflow-hidden rounded-md bg-slate-100">
                      <span className="w-full rounded-t-md bg-emerald-600" style={{ height: `${count ? Math.max(4, 100 * count / trendMax) : 0}%` }}/>
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(Date.UTC(Number(year), i, 1)).toLocaleString(undefined, { month: "short", timeZone: "UTC" })}</span>
                  </button>;
                })}
              </div>
            </div>
          ) : null}

          {insights.topGenres.length ? (
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-base font-semibold">Genres this period</h4>
              <p className="mt-1 text-xs text-slate-500">Community tags cached from Last.fm, covering only enriched tracks. Uncategorized listening is excluded.</p>
              <div className="mt-3 space-y-2">
                {insights.topGenres.map((genre) => (
                  <div key={genre.name} className="flex items-center gap-2 text-xs">
                    <span className="w-32 truncate">{genre.name}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${100 * genre.plays / Math.max(1, insights.topGenres[0].plays)}%` }} />
                    </span>
                    <span className="w-14 text-right text-slate-500">{genre.plays} plays</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-base font-semibold">Most played tracks</h4>
              <RankedTracks tracks={insights.topTracks}/>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-base font-semibold">Top credited artists</h4>
              <p className="mt-1 text-xs text-slate-500">Collaborations listed together in the source count as one credited name.</p>
              <ol className="mt-3 divide-y divide-slate-100">
                {insights.topArtists.map((artist, index) => (
                  <li key={artist.name} className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="w-6 text-right text-xs text-slate-400">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{artist.name}</span>
                    <span className="text-xs text-slate-500">{artist.plays} plays</span>
                  </li>
                ))}
              </ol>
              {topPhase.length ? <div className="mt-4 border-t border-slate-100 pt-3">
                <h5 className="text-sm font-semibold">Artists on the rise</h5>
                <p className="mt-1 text-xs text-slate-500">More than twice as many plays as the previous {mode}.</p>
                <p className="mt-2 text-sm">{topPhase.map((a) => a.name).join(" · ")}</p>
              </div> : null}
            </section>
          </div>
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="text-base font-semibold">Rediscovered after 6+ months</h4>
            <p className="mt-1 text-xs text-slate-500">Tracks played again after at least 180 days since their previous listen.</p>
            {insights.rediscoveries.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {insights.rediscoveries.map((track) => (
                  <div key={track.trackId} className="rounded-xl bg-slate-50 px-3 py-2">
                    <a href={songLink(track.trackId)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold hover:underline">{track.name}</a>
                    <p className="truncate text-xs text-slate-500">{track.artist} · {track.daysAway} days away</p>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">No long-dormant songs returned in this period.</p>}
          </section>
        </>
      ) : null}
    </section>
  );
}
