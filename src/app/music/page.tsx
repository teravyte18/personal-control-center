"use client";

import { useState } from "react";
import { MusicInsightsPanel } from "@/components/music-insights-panel";
import { MusicArchivePanel } from "@/components/music-archive-panel";
import { MusicRandomSong } from "@/components/music-random-song";

export default function MusicPage() {
  const [view, setView] = useState<"timeline" | "archive">("timeline");

  return (
    <section className="pcc-music">
      <h2 className="text-3xl font-semibold tracking-tight">Music</h2>


      <div className="pcc-view-controls" aria-label="Music view">
        <button type="button" onClick={() => setView("timeline")} aria-pressed={view === "timeline"}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${view === "timeline" ? "bg-slate-950 text-white" : "text-slate-500"}`}>
          Timeline
        </button>
        <button type="button" onClick={() => setView("archive")} aria-pressed={view === "archive"}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${view === "archive" ? "bg-slate-950 text-white" : "text-slate-500"}`}>
          Archive
        </button>
      </div>

      <div className="pcc-music-columns"><div>
      {view === "timeline" ? (
        <MusicInsightsPanel onOpenArchive={() => setView("archive")} />
      ) : (
        <MusicArchivePanel />
      )}
      </div><aside><MusicRandomSong /></aside></div>
    </section>
  );
}
