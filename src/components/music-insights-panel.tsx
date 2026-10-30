"use client";

import { useEffect, useState } from "react";
import { todayMusicPeriod, type MusicInsights } from "@/domain/music-insights";

function count(value: number) { return new Intl.NumberFormat().format(value); }
function listeningTime(ms: number) {
  const minutes = Math.round(ms / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}
function spotifyUrl(id: string) { return `https://open.spotify.com/track/${encodeURIComponent(id)}`; }
function shiftPeriod(period: string, mode: "month" | "year", offset: number) {
  const [year, month] = period.split("-").map(Number);
  if (mode === "year") return `${year + offset}-${String(month).padStart(2, "0")}`;
  const next = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
function Tracks({ items, expanded }: { items: MusicInsights["topTracks"]; expanded: boolean }) {
  const visible = expanded ? items : items.slice(0, 6);
  return (
    <ol className="divide-y divide-slate-100">
      {visible.map((track, i) => (
        <li key={track.trackId} className="flex min-w-0 items-center gap-3 py-2.5">
          <span className="w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <a className="block truncate text-sm font-semibold hover:underline" href={spotifyUrl(track.trackId)}
              target="_blank" rel="noopener noreferrer">{track.name}</a>
            <p className="truncate text-xs text-slate-500">{track.artist}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-slate-500">{count(track.plays)}</span>
        </li>
      ))}
    </ol>
  );
}
function Artists({ items, expanded }: { items: MusicInsights["topArtists"]; expanded: boolean }) {
  const visible = expanded ? items : items.slice(0, 6);
  return (
    <ol className="divide-y divide-slate-100">
      {visible.map((artist, i) => (
        <li key={artist.name} className="flex min-w-0 items-center gap-3 py-3">
          <span className="w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{artist.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-500">{count(artist.plays)}</span>
        </li>
      ))}
    </ol>
  );
}

export function MusicInsightsPanel({ onOpenArchive }: { onOpenArchive: () => void }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [mode, setMode] = useState<"month" | "year" | "all">("month");
  const [period, setPeriod] = useState(() => todayMusicPeriod(new Date(), timeZone));
  const [insights, setInsights] = useState<MusicInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTracks, setExpandedTracks] = useState(false);
  const [expandedArtists, setExpandedArtists] = useState(false);

  const year = period.slice(0, 4);
  useEffect(() => {
    let active = true;
    const search = new URLSearchParams({ mode, period: mode === "all" ? "all" : mode === "year" ? year : period, tz: timeZone });
    void fetch(`/api/music/insights?${search}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as MusicInsights & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load music history.");
        if (active) { setInsights(data); setError(""); setLoading(false); }
      })
      .catch((reason) => {
        if (active) { setError(reason instanceof Error ? reason.message : "Unable to load music history."); setInsights(null); setLoading(false); }
      });
    return () => { active = false; };
  }, [mode, period, year, timeZone]);

  function selectMode(next: "month" | "year" | "all") {
    setMode(next); setLoading(true); setExpandedTracks(false); setExpandedArtists(false);
  }
  function selectPeriod(next: string) {
    setPeriod(next); setLoading(true); setExpandedTracks(false); setExpandedArtists(false);
  }

  const topGenres = insights?.topGenres ?? [];
  const tagCoverage = insights && insights.plays > 0 ? Math.round(100 * insights.taggedPlays / insights.plays) : 0;
  const maxGenre = topGenres[0]?.plays || 1;
  const rising = mode === "all" ? [] : insights?.topArtists.filter((a) => a.plays >= 5 && a.plays > a.previousPlays * 2).slice(0, 3) ?? [];
  const maxMonth = Math.max(1, ...(insights?.trend.map((t) => t.plays) ?? []));

  return (
    <div className="mt-5">
      <div className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button type="button" onClick={() => selectMode("month")} aria-pressed={mode === "month"}
          className={`min-h-11 rounded-xl text-sm font-semibold ${mode === "month" ? "bg-slate-950 text-white" : "text-slate-500"}`}>Month</button>
        <button type="button" onClick={() => selectMode("year")} aria-pressed={mode === "year"}
          className={`min-h-11 rounded-xl text-sm font-semibold ${mode === "year" ? "bg-slate-950 text-white" : "text-slate-500"}`}>Year</button>
        <button type="button" onClick={() => selectMode("all")} aria-pressed={mode === "all"}
          className={`min-h-11 rounded-xl text-sm font-semibold ${mode === "all" ? "bg-slate-950 text-white" : "text-slate-500"}`}>All time</button>
      </div>
      {mode !== "all" && <div className="mt-5 flex items-center justify-between gap-2">
        <button type="button" className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-lg"
          aria-label="Previous period" onClick={() => selectPeriod(shiftPeriod(period, mode, -1))}>‹</button>
        <div className="min-w-0 text-center">
          <label className="mt-1 block">
            <span className="sr-only">Choose a music period</span>
            <input aria-label="Choose music period" type={mode === "month" ? "month" : "number"}
              min={mode === "month" ? "2000-01" : "2000"}
              max={mode === "month" ? "2100-12" : "2100"}
              value={mode === "month" ? period : year}
              onChange={(e) => {
                const next = e.target.value;
                if (mode === "month" && /^\d{4}-(0[1-9]|1[0-2])$/.test(next)) selectPeriod(next);
                else if (mode === "year" && /^\d{4}$/.test(next)) selectPeriod(`${next}-${period.slice(5, 7)}`);
              }}
              className="pcc-music-period"/>
          </label>
        </div>
        <button type="button" className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-lg"
          aria-label="Next period" onClick={() => selectPeriod(shiftPeriod(period, mode, 1))}>›</button>
      </div>}

      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading listening history…</p> : null}
      {!loading && insights && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Plays" value={count(insights.plays)}/>
            <Metric label="Different songs" value={count(insights.uniqueTracks)}/>
            {mode === "all"
              ? <Metric label="Plays with durations" value={count(insights.knownDurationPlays)}/>
              : <Metric label="First-time songs" value={count(insights.newTracks)}/> }
            <Metric label="Known listening time" value={listeningTime(insights.knownDurationMs)}/>
          </div>
          {insights.unknownDurationPlays > 0 ? <p className="mt-2 text-xs text-slate-500">
            {count(insights.unknownDurationPlays)} plays have unknown duration and are excluded from listening time.
          </p> : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-700">Most played songs</h4>
                <span className="text-xs text-slate-500">Plays</span>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-1 shadow-sm">
                {insights.topTracks.length ? <Tracks items={insights.topTracks} expanded={expandedTracks}/> : <p className="py-4 text-sm text-slate-500">Nothing played during this period.</p>}
                {insights.topTracks.length > 6 && <button type="button"
                  onClick={() => setExpandedTracks((value) => !value)}
                  className="min-h-11 w-full border-t border-slate-100 text-sm font-semibold text-slate-600">
                  {expandedTracks ? "Show fewer" : "Show all 15"}
                </button>}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-700">Top artists</h4>
                <span className="text-xs text-slate-500">Plays</span>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-1 shadow-sm">
                {insights.topArtists.length ? <Artists items={insights.topArtists} expanded={expandedArtists}/> : <p className="py-4 text-sm text-slate-500">No artists during this period.</p>}
                {insights.topArtists.length > 6 && <button type="button"
                  onClick={() => setExpandedArtists((value) => !value)}
                  className="min-h-11 w-full border-t border-slate-100 text-sm font-semibold text-slate-600">
                  {expandedArtists ? "Show fewer" : "Show all 12"}
                </button>}
              </div>
              <p className="mt-2 text-xs text-slate-500">Based on album artist credits in the historical export. Collaborations may be grouped.</p>
            </section>
          </div>

          {(mode === "year" || mode === "all") && insights.trend.length > 0 && (
            <section className="mt-5">
              <h4 className="text-sm font-semibold text-slate-700">{mode === "all" ? "Listening over the years" : "Listening through the year"}</h4>
              <div className="mt-3 grid grid-cols-6 gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12">
                {(mode === "all"
                  ? insights.trend
                  : Array.from({ length: 12 }, (_, index) => {
                    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
                    return { period: month, plays: insights.trend.find((item) => item.period === month)?.plays ?? 0 };
                  })).map((item) => {
                  const label = item.period;
                  const plays = item.plays;
                  return (
                    <button type="button" key={label} title={`${label}: ${count(plays)} plays`}
                      aria-label={`Show ${label} (${plays} plays)`}
                      onClick={() => {
                        if (mode === "all") {
                          selectPeriod(`${label}-${period.slice(5, 7)}`);
                          selectMode("year");
                        } else {
                          selectPeriod(label);
                          selectMode("month");
                        }
                      }}
                      className="group flex min-w-0 flex-col items-center gap-1 rounded-lg py-1 hover:bg-slate-100">
                      <span className="text-[10px] tabular-nums text-slate-500">{plays ? count(plays) : "–"}</span>
                      <span className="flex h-20 w-full items-end overflow-hidden rounded bg-slate-100">
                        <span className="block w-full rounded-t bg-slate-950" style={{height: `${plays ? Math.max(4, 100 * plays / maxMonth) : 0}%`}}/>
                      </span>
                      <span className="text-[10px] text-slate-500">{mode === "all" ? label : new Date(`${label}-01T12:00:00`).toLocaleString(undefined, { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-700">Genres</h4>
              <span className="text-xs text-slate-500">{tagCoverage}% of plays tagged</span>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {topGenres.length ? (
                <>
                  <div className="space-y-3">
                    {topGenres.slice(0, 6).map((genre) => (
                      <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm" key={genre.name}>
                        <span className="truncate font-medium">{genre.name}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-slate-950"
                            style={{ width: `${100 * genre.plays / maxGenre}%` }}/>
                        </span>
                        <span className="text-right text-xs tabular-nums text-slate-500">{count(genre.plays)}</span>
                      </div>
                    ))}
                  </div>
                  {tagCoverage < 90 && <p className="mt-3 text-xs text-slate-500">Only tagged songs appear here; this is not yet a complete genre breakdown.</p>}
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{insights.plays ? "No genre tags yet" : "No listening data in this period"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {insights.plays ? "Genre data needs the optional Last.fm enrichment. Your Spotify history is still available." : "Choose a month with listening records."}
                    </p>
                  </div>
                  {insights.plays > 0 && <button type="button" onClick={onOpenArchive}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold">
                    Genre setup
                  </button>}
                </div>
              )}
            </div>
          </section>

          {(rising.length > 0 || insights.rediscoveries.length > 0) && (
            <section className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700">Musical phases</h4>
              {rising.length > 0 && <p className="mt-2 text-sm text-slate-600">Artists on the rise: {rising.map((a) => a.name).join(" · ")}</p>}
              {insights.rediscoveries.length > 0 && <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <p className="py-3 text-xs text-slate-500">Back after at least 180 days</p>
                <div className="grid gap-x-5 sm:grid-cols-2">
                  {insights.rediscoveries.slice(0, 8).map((song) => (
                    <div key={song.trackId} className="flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 py-3">
                      <div className="min-w-0">
                        <a href={spotifyUrl(song.trackId)} target="_blank" rel="noopener noreferrer"
                          className="block truncate text-sm font-semibold hover:underline">{song.name}</a>
                        <p className="truncate text-xs text-slate-500">{song.artist}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{song.daysAway}d</span>
                    </div>
                  ))}
                </div>
              </div>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
