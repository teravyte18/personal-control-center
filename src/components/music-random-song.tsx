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
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Random archived song">
      <h3 className="text-lg font-semibold">Rediscover a song</h3>
      <p className="mt-1 text-sm text-slate-600">
        A random starting point from songs you played at least 5 times. Every eligible song has an equal chance.
      </p>
      <div className="mt-4">
        <button type="button" onClick={() => void pick()} disabled={loading}
          className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Choosing…" : song ? "Another song ↻" : "Surprise me"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {hasPicked && !song && !error ? <p role="status" className="mt-3 text-sm text-slate-500">
        No songs have reached five qualifying plays yet. Import your Spotify history or keep listening.
      </p> : null}
      {song ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4" aria-live="polite">
          <p className="text-xs font-medium text-slate-500">Your random pick</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{song.title}</p>
          <p className="text-sm text-slate-600">{song.artist}</p>
          {song.album ? <p className="mt-1 text-xs text-slate-500">{song.album}</p> : null}
          <p className="mt-2 text-xs text-slate-500">{song.qualifiedPlays.toLocaleString()} qualifying plays in your history</p>
          <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900">
            Open in Spotify ↗
          </a>
        </div>
      ) : null}
    </section>
  );
}
