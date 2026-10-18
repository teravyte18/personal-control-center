"use client";

import { useEffect, useState } from "react";
import { MusicInsightsPanel } from "@/components/music-insights-panel";
import { MusicArchivePanel } from "@/components/music-archive-panel";
import { MusicRandomSong } from "@/components/music-random-song";

type Status = {
  configured: boolean;
  connected: boolean;
  recordedPlays: number;
  recordedTracks: number;
  historicalListeningMs: number;
  firstPlay: string | null;
  latestPlay: string | null;
  lastPolledAt: string | null;
  lastError: string | null;
};

function when(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}
function count(value: number) { return value.toLocaleString(); }
function hours(milliseconds: number) { return Math.round(milliseconds / 3600000).toLocaleString(); }

async function fetchMusicStatus(): Promise<Status> {
  const response = await fetch("/api/integrations/spotify", { cache: "no-store" });
  const data = await response.json() as Status & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not load Music.");
  return data;
}

export default function MusicPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"timeline" | "archive">("timeline");

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("spotify");
    void fetchMusicStatus()
      .then((data) => {
        setStatus(data);
        if (result === "connected") setNotice("Spotify connected. Your listening history will sync hourly.");
        else if (result === "not-configured") setError("Spotify API credentials are not configured on the server.");
        else if (result && result !== "cancelled") setError("Spotify connection failed. Check the setup and try again.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load Music."));
  }, []);

  async function action(method: "POST" | "DELETE") {
    if (busy) return;
    if (method === "DELETE" && !window.confirm("Disconnect Spotify? Your imported music history will be kept.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/integrations/spotify", { method });
      const body = await response.json() as Status & { error?: string; inserted?: number };
      if (!response.ok) throw new Error(body.error ?? "Could not update Spotify connection.");
      setStatus(body);
      setNotice(method === "DELETE" ? "Spotify disconnected. Your listening history is preserved."
        : `Sync complete: ${body.inserted ?? 0} new plays recorded.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Music</h2>
        <p className="mt-1 text-sm text-slate-500">
          {status ? `${count(status.recordedPlays)} plays · ${count(status.recordedTracks)} songs recorded` : "Loading listening history…"}
        </p>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}

      <MusicRandomSong />

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Music view">
        <button type="button" onClick={() => setView("timeline")}
          aria-pressed={view === "timeline"}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${view === "timeline" ? "bg-slate-950 text-white" : "text-slate-500"}`}>
          Timeline
        </button>
        <button type="button" onClick={() => setView("archive")}
          aria-pressed={view === "archive"}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${view === "archive" ? "bg-slate-950 text-white" : "text-slate-500"}`}>
          Archive &amp; sync
        </button>
      </div>

      {view === "timeline" ? (
        <MusicInsightsPanel onOpenArchive={() => setView("archive")} />
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Spotify collection</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {status?.connected ? `Last checked: ${when(status.lastPolledAt)}` : "Not connected"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {status?.connected ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => void action("POST")}
                      className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
                      {busy ? "Syncing…" : "Sync now"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void action("DELETE")}
                      className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50">
                      Disconnect
                    </button>
                  </>
                ) : (
                  <a href="/api/integrations/spotify/connect" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
                    Connect Spotify
                  </a>
                )}
              </div>
            </div>
            {status?.lastError ? <p className="mt-3 text-xs text-amber-700">Last sync error: {status.lastError}</p> : null}
            <p className="mt-3 text-xs text-slate-500">Known listening time: {hours(status?.historicalListeningMs ?? 0)}h from historical records. Spotify API plays do not include duration.</p>
          </div>
          <MusicArchivePanel />
        </div>
      )}
    </section>
  );
}
