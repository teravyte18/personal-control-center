import Image from "next/image";
import { formatReviewPeriod } from "@/domain/weekly-review";
import type { ReviewEntry } from "@/lib/personal-data";

const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ReviewHistory({ history, saved }: { history: ReviewEntry[]; saved: boolean }) {
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
      <div className="grid gap-4 lg:grid-cols-2">
        {history.map((entry) => {
          const durablePhoto = PHOTO_ID.test(entry.photoName);
          const period = entry.periodStart && entry.periodEnd
            ? formatReviewPeriod({ start: entry.periodStart, end: entry.periodEnd, openedOn: "" })
            : new Date(entry.completedAt).toLocaleDateString(undefined, { dateStyle: "long" });
          return (
            <article key={entry.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              {durablePhoto ? <Image src={`/api/review-photos/${entry.photoName}`} alt={entry.location ? `Weekly review at ${entry.location}` : "Weekly review location"} width={960} height={640} unoptimized className="max-h-72 w-full object-cover" /> : null}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{period}</p>
                    <h3 className="mt-2 text-lg font-semibold">{entry.location || "Location not recorded"}</h3>
                    <p className="mt-1 text-xs text-slate-400">Completed {new Date(entry.completedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
                  </div>
                  {!durablePhoto && entry.photoName ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">Legacy photo name</span> : null}
                </div>
                <Excerpt label="What happened" value={entry.happened} />
                <Excerpt label="Next focus" value={entry.nextWeek} />
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
