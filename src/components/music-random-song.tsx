"use client";

import { useState } from "react";

type Song = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  qualifiedPlays: number;
  spotifyUrl: string;
};

export function MusicRandomSong() {
  const [song, setSong] = useState<Song | null>(null);
  const [hasPicked, setHasPicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pick() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const params = song ? `?exclude=${encodeURIComponent(song.trackId)}` : "";
      const response = await fetch(`/api/music/random${params}`, { cache: "no-store" });
      const result = await response.json() as { song?: Song | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not pick a song.");
      setSong(result.song ?? null);
      setHasPicked(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not pick a song.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" aria-label="Random archived song">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Rediscover something</h3>
          <p className="mt-0.5 text-xs text-slate-500">A random song from your 5+ plays archive</p>
        </div>
        <button type="button" onClick={() => void pick()} disabled={loading}
          className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Choosing…" : song ? "Another song ↻" : "Surprise me"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {hasPicked && !song && !error ? <p role="status" className="mt-3 text-sm text-slate-500">
        No songs have five qualifying plays yet.
      </p> : null}
      {song ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3" aria-live="polite">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{song.title}</p>
            <p className="truncate text-xs text-slate-500">{song.artist} · {song.qualifiedPlays.toLocaleString()} plays</p>
          </div>
          <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold">
            Open in Spotify ↗
          </a>
        </div>
      ) : null}
    </section>
  );
}
