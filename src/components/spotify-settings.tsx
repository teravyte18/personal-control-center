"use client";

import { useEffect, useState } from "react";

type SpotifyStatus = {
  configured: boolean;
  connected: boolean;
  playlistPermission: boolean;
  recordedPlays: number;
  recordedTracks: number;
  historicalListeningMs: number;
  firstPlay: string | null;
  latestPlay: string | null;
  lastPolledAt: string | null;
  lastError: string | null;
};

function date(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}

async function getSpotifyStatus(): Promise<SpotifyStatus> {
  const response = await fetch("/api/integrations/spotify", { cache: "no-store" });
  const data = await response.json() as SpotifyStatus & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not load Spotify connection.");
  return data;
}

function oauthNotice(value: string | null) {
  if (value === "connected") return { notice: "Spotify connected.", error: "" };
  if (value === "cancelled") return { notice: "Spotify connection cancelled.", error: "" };
  if (value === "not-configured") return { notice: "", error: "Spotify API credentials are not configured on the server." };
  if (value && ["error", "invalid-state"].includes(value)) {
    return { notice: "", error: "Spotify authorization failed. Check the server logs and try again." };
  }
  return { notice: "", error: "" };
}

export function SpotifySettings() {
  const [status, setStatus] = useState<SpotifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const message = oauthNotice(new URLSearchParams(window.location.search).get("spotify"));
    void getSpotifyStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        if (message.error) setError(message.error);
        if (message.notice) setNotice(message.notice);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Spotify status unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function change(method: "POST" | "DELETE") {
    if (busy) return;
    if (method === "DELETE" && !window.confirm("Disconnect Spotify? Your music history and archived songs will be kept.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/integrations/spotify", { method });
      const data = await response.json() as SpotifyStatus & { error?: string; inserted?: number };
      if (!response.ok) throw new Error(data.error ?? "Spotify request failed.");
      setStatus(data);
      setNotice(method === "DELETE"
        ? "Spotify disconnected. Your listening history was preserved."
        : `Spotify checked. ${data.inserted ?? 0} new plays recorded.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spotify request failed.");
      const refreshed = await getSpotifyStatus().catch(() => null);
      if (refreshed) setStatus(refreshed);
    } finally { setBusy(false); }
  }

  return (
    <section id="spotify" className="mt-6 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Spotify</h3>
          <p className="mt-2 text-sm text-slate-500">Collect listening history for your private Music space.</p>
        </div>
        {status?.connected ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Connected</span> : null}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading Spotify status…</p> : null}
      {!loading && status && !status.configured ? <p className="mt-4 text-sm text-amber-700">
        Spotify is not configured. Add the OAuth credentials and encryption key in your Pi&apos;s private environment.
      </p> : null}
      {!loading && status?.configured && !status.connected ? (
        <a href="/api/integrations/spotify/connect" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
          Connect Spotify
        </a>
      ) : null}
      {!loading && status?.connected ? (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Recorded plays</dt>
              <dd className="mt-1 text-sm font-semibold">{status.recordedPlays.toLocaleString()}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Unique tracks</dt>
              <dd className="mt-1 text-sm font-semibold">{status.recordedTracks.toLocaleString()}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Last collection</dt>
              <dd className="mt-1 text-sm font-semibold">{date(status.lastPolledAt)}</dd>
            </div>
          </dl>
          {status.lastError ? <p className="mt-3 text-sm text-amber-700">Last collection error: {status.lastError}</p> : null}
          <p className="mt-3 text-xs text-slate-500">
            Playlist editing: {status.playlistPermission ? "Authorized" : "Not authorized"}.
            {status.playlistPermission ? " You can configure automatic additions in Music → Archive." : " Additional consent is required to update your archive playlist."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void change("POST")}
              className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Working…" : "Sync now"}
            </button>
            {!status.playlistPermission ? (
              <a href="/api/integrations/spotify/connect?playlist=1"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold">
                Allow playlist updates
              </a>
            ) : null}
            <button type="button" disabled={busy} onClick={() => void change("DELETE")}
              className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50">
              Disconnect
            </button>
          </div>
          <a href="/music" className="mt-4 inline-flex text-sm font-semibold underline underline-offset-2">Open Music →</a>
        </>
      ) : null}
    </section>
  );
}
