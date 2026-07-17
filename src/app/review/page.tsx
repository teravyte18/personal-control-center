"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { isCreatedThisWeek, Item, usePersonalData, useReviewData } from "@/lib/personal-data";

type Tab = "current" | "history";

export default function ReviewPage() {
  const { items, openItems, closedThisWeek } = usePersonalData();
  const { draft, history, updateDraft, completeReview } = useReviewData();
  const [tab, setTab] = useState<Tab>("current");
  const [saved, setSaved] = useState(false);
  const thoughtsThisWeek = useMemo(() => items.filter((item) =>
    ["thought", "note"].includes(item.kind)
    && item.status !== "archived"
    && isCreatedThisWeek(item)), [items]);

  function saveReview() {
    completeReview();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
    setTab("history");
  }

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-500">Saturday reflection ritual</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">See the week before writing about it.</h2>
        </div>
        <div className="flex rounded-2xl bg-slate-200 p-1">
          <button type="button" onClick={() => setTab("current")} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${tab === "current" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>This week</button>
          <button type="button" onClick={() => setTab("history")} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${tab === "history" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>History</button>
        </div>
      </div>

      {tab === "current" ? (
        <div className="mt-7">
          <div className="grid gap-4 lg:grid-cols-3">
            <StatusPanel title={`Still open (${openItems.length})`} items={openItems} />
            <StatusPanel title={`Closed this week (${closedThisWeek.length})`} items={closedThisWeek} />
            <StatusPanel title={`Thoughts added (${thoughtsThisWeek.length})`} items={thoughtsThisWeek} />
          </div>

          <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Where are you doing this review?">
                <input className="input" value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder="Café, park, library, home…" />
              </Field>
              <Field label="Photo of the place">
                <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-600">
                  <span className="truncate">{draft.photoName || "Choose a photo"}</span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("photoName", event.target.files?.[0]?.name ?? "")} />
                </label>
              </Field>
            </div>

            <div className="mt-7 grid gap-6">
              <Prompt label="What happened this week?" value={draft.happened} onChange={(value) => updateDraft("happened", value)} />
              <div className="grid gap-6 md:grid-cols-2">
                <Prompt label="What went well?" value={draft.wentWell} onChange={(value) => updateDraft("wentWell", value)} />
                <Prompt label="What felt difficult?" value={draft.difficult} onChange={(value) => updateDraft("difficult", value)} />
              </div>
              <Prompt label="What did you learn or notice?" value={draft.learned} onChange={(value) => updateDraft("learned", value)} />
              <Prompt label="What deserves attention next week?" value={draft.nextWeek} onChange={(value) => updateDraft("nextWeek", value)} />
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Your unfinished review is saved automatically in this browser.</p>
              <button type="button" onClick={saveReview} className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">Complete review</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-7">
          {saved ? <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">Review saved to history.</div> : null}
          {history.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold">No completed reviews yet.</h3>
              <p className="mt-2 text-sm text-slate-500">Your weekly reviews, places, and reflections will collect here.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {history.map((entry) => (
                <article key={entry.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{new Date(entry.completedAt).toLocaleDateString(undefined, { dateStyle: "long" })}</p><h3 className="mt-2 text-lg font-semibold">{entry.location || "Location not recorded"}</h3></div>
                    {entry.photoName ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Photo</span> : null}
                  </div>
                  <ReviewExcerpt label="What happened" value={entry.happened} />
                  <ReviewExcerpt label="Next focus" value={entry.nextWeek} />
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusPanel({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      {items.length ? <ul className="mt-4 space-y-2">{items.slice(0, 20).map((item) => <li key={item.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{item.title}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">Nothing to show.</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>{children}</label>;
}

function Prompt({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-800">{label}</span><textarea className="input min-h-32 resize-y" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ReviewExcerpt({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{value}</p></div>;
}
