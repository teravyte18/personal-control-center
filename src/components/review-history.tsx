"use client";

import Image from "next/image";
import { useState } from "react";
import { formatReviewPeriod } from "@/domain/weekly-review";
import type { ReviewEntry } from "@/lib/personal-data";

const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ReviewHistory({ history, saved }: { history: ReviewEntry[]; saved: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold">No completed reviews yet.</h3>
        <p className="mt-2 text-sm text-slate-500">Your weekly reviews, places, and reflections will collect here.</p>
      </div>
    );
  }

  return (
    <div>
      {saved ? <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Review saved to history.</div> : null}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {history.map((entry) => {
          const durablePhoto = PHOTO_ID.test(entry.photoName);
          const expanded = expandedId === entry.id;
          const detailsId = `review-history-${entry.id}`;
          const period = entry.periodStart && entry.periodEnd
            ? formatReviewPeriod({ start: entry.periodStart, end: entry.periodEnd, openedOn: "" })
            : new Date(entry.completedAt).toLocaleDateString(undefined, { dateStyle: "long" });
          return (
            <article key={entry.id} className={`overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm ${expanded ? "lg:col-span-2" : ""}`}>
              {durablePhoto ? (
                <Image
                  src={`/api/review-photos/${entry.photoName}`}
                  alt={entry.location ? `Weekly review at ${entry.location}` : "Weekly review location"}
                  width={1280}
                  height={960}
                  sizes={expanded ? "(min-width: 1024px) 896px, 100vw" : "(min-width: 1024px) 440px, 100vw"}
                  unoptimized
                  className={`${expanded ? "max-h-[32rem]" : "max-h-72"} w-full object-cover`}
                />
              ) : null}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{period}</p>
                    <h3 className="mt-2 text-lg font-semibold">{entry.location || "Location not recorded"}</h3>
                    <p className="mt-1 text-xs text-slate-400">Completed {new Date(entry.completedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                  </div>
                  {!durablePhoto && entry.photoName ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">Legacy photo name</span> : null}
                </div>

                {expanded ? (
                  <div id={detailsId} className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-2">
                    <Reflection label="What happened this week?" value={entry.happened} wide />
                    <Reflection label="What went well?" value={entry.wentWell} />
                    <Reflection label="What felt difficult?" value={entry.difficult} />
                    <Reflection label="What did you learn or notice?" value={entry.learned} wide />
                    <Reflection label="What deserved attention next week?" value={entry.nextWeek} wide />
                  </div>
                ) : (
                  <>
                    <Excerpt label="What happened" value={entry.happened} />
                    <Excerpt label="Next focus" value={entry.nextWeek} />
                  </>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 active:bg-slate-50"
                  >
                    {expanded ? "Collapse review" : "Read full review"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Excerpt({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">{value}</p></div>;
}

function Reflection({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <section className={wide ? "md:col-span-2" : ""}>
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value.trim() || "Nothing recorded."}</p>
    </section>
  );
}
