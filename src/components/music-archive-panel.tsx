"use client";

import { useEffect, useState, type FormEvent } from "react";

type ArchiveStatus = {
  connected: boolean;
  playlistPermission: boolean;
  genresConfigured: boolean;
  tracksWithTagCache: number;
  totalTracks: number;
  playlistId: string | null;
  playlistUrl: string | null;
  threshold: number;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  pendingCount: number;
};
async function fetchArchive() {
  const response = await fetch("/api/music/archive", { cache: "no-store" });
  const data = await response.json() as ArchiveStatus & { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not load archive settings.");
  return data;
}
function date(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not yet";
}
export function MusicArchivePanel() {
  const [status, setStatus] = useState<ArchiveStatus | null>(null);
  const [playlist, setPlaylist] = useState("");
  const [threshold, setThreshold] = useState(5);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchArchive().then((value) => {
      if (!active) return;
      setStatus(value);
      setPlaylist(value.playlistUrl ?? "");
      setThreshold(value.threshold);
      setEnabled(value.enabled);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load archive."); });
    return () => { active = false; };
  }, []);

  async function action(body: Record<string, unknown>) {
    setBusy(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/music/archive", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const value = await response.json() as ArchiveStatus & { error?: string; added?: number; processed?: number };
      if (!response.ok) throw new Error(value.error || "Music operation failed.");
      setStatus(value);
      if (body.action === "configure") setNotice("Archive preferences saved. Nothing is added until synchronization.");
      if (body.action === "sync") setNotice(`Archive checked: ${value.added ?? 0} new songs added.`);
      if (body.action === "enrich") setNotice(`Genre cache updated for ${value.processed ?? 0} songs.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Music operation failed.");
    } finally { setBusy(false); }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (enabled && !window.confirm("Enable automatic additions to this Spotify playlist? Existing songs will never be removed.")) return;
    void action({ action: "configure", playlist, threshold, enabled });
  }
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Permanent Spotify archive</h3>
      <p className="mt-1 text-sm text-slate-600">
        Songs enter once they reach the threshold. Keep your existing playlist; tracks are only appended, never deleted or reordered.
      </p>
      {status && !status.playlistPermission ? (
        <div className="mt-4">
          <p className="text-sm text-slate-600">Playlist editing is disabled until you explicitly approve the extra Spotify permissions.</p>
          <a href="/api/integrations/spotify/connect?playlist=1"
            className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold">
            Reconnect Spotify with playlist access
          </a>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
      <form onSubmit={save} className="mt-4 space-y-3">
        <label className="block text-sm font-medium">
          Existing Spotify playlist URL
          <input type="url" required value={playlist} onChange={(e) => setPlaylist(e.target.value)}
            placeholder="https://open.spotify.com/playlist/..."
            className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"/>
        </label>
        <label className="block text-sm font-medium">
          Plays required (1–100)
          <input type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-1 block min-h-11 w-28 rounded-xl border border-slate-200 bg-white px-3 text-sm"/>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4"/>
          Automatically add qualifying songs
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy}
            className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
            Save archive settings
          </button>
          {status?.enabled ? <button type="button" disabled={busy} onClick={() => void action({ action: "sync" })}
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50">
            Check playlist now
          </button> : null}
        </div>
      </form>
      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p>Last playlist check: {date(status?.lastSyncedAt ?? null)}</p>
        {status?.pendingCount ? <p>{status.pendingCount} songs waiting to be added in later bounded syncs.</p> : null}
        <p>Historical plays count only if they lasted at least 30 seconds. Spotify API plays count approximately because duration is unavailable.</p>
        {status?.lastError ? <p className="mt-2 text-amber-800">Archive error: {status.lastError}</p> : null}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold">Music genre tags</h4>
        <p className="mt-1 text-sm text-slate-600">Optional cached community genre labels from Last.fm; not a claim about your personal mood.</p>
        <p className="mt-2 text-xs text-slate-500">
          Cached for {status?.tracksWithTagCache ?? 0} of {status?.totalTracks ?? 0} tracks.
        </p>
        {status?.genresConfigured ? (
          <button type="button" disabled={busy} onClick={() => void action({ action: "enrich" })}
            className="mt-3 min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50">
            Enrich next 25 songs
          </button>
        ) : <p className="mt-2 text-xs text-slate-500">To enable this, configure PCC_LASTFM_API_KEY on the Pi. The playlist automation works without it.</p>}
      </div>
    </section>
  );
}
