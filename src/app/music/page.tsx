"use client";

import { useEffect, useState } from "react";
import { MusicInsightsPanel } from "@/components/music-insights-panel";

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
      <p className="text-sm text-slate-500">Tracking</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight">Music history</h2>
      <p className="mt-3 max-w-2xl text-sm text-slate-600">
        A private time capsule of the music you played over the years. Your history stays in your own PostgreSQL database.
      </p>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Recorded plays", value: status ? count(status.recordedPlays) : "—" },
          { label: "Unique songs", value: status ? count(status.recordedTracks) : "—" },
          { label: "Historical listening hours", value: status ? hours(status.historicalListeningMs) : "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Listening hours are from historical exported durations only. New Spotify API records do not include play duration.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Spotify connection</h3>
        <p className="mt-1 text-sm text-slate-600">
          {status?.connected ? "Connected — the Pi checks for new listening events every hour when the worker is configured."
            : "Connect a Spotify Premium account after configuring the Spotify developer application."}
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">First play stored</dt><dd>{when(status?.firstPlay ?? null)}</dd></div>
          <div><dt className="text-slate-500">Most recent play stored</dt><dd>{when(status?.latestPlay ?? null)}</dd></div>
          <div><dt className="text-slate-500">Last API check</dt><dd>{when(status?.lastPolledAt ?? null)}</dd></div>
          <div><dt className="text-slate-500">Connection</dt><dd>{status?.connected ? "Connected" : "Not connected"}</dd></div>
        </dl>
        {status?.lastError ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Last sync problem: {status.lastError}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {status?.connected ? (
            <>
              <button type="button" disabled={busy} onClick={() => void action("POST")}
                className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Working…" : "Sync now"}
              </button>
              <button type="button" disabled={busy} onClick={() => void action("DELETE")}
                className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">
                Disconnect
              </button>
            </>
          ) : (
            <a href="/api/integrations/spotify/connect" aria-disabled={!status?.configured}
              className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
              Connect Spotify
            </a>
          )}
        </div>
      </div>
      <MusicInsightsPanel />
    </section>
  );
}
