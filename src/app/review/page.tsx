"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import {
  getCurrentProjectAction,
  isCreatedThisWeek,
  isProjectActionCompletedThisWeek,
  isProjectActionOpenedThisWeek,
  isProjectActionTargetReached,
  projectRequiresNextAction,
  type Item,
  usePersonalData,
  useReviewData,
} from "@/lib/personal-data";

type Tab = "current" | "history";

type ReviewLine = {
  id: string;
  text: string;
  detail?: string;
};

export default function ReviewPage() {
  const { items, closedThisWeek } = usePersonalData();
  const { draft, history, updateDraft, completeReview } = useReviewData();
  const [tab, setTab] = useState<Tab>("current");
  const [saved, setSaved] = useState(false);

  const thoughtsThisWeek = useMemo(() => items.filter((item) =>
    ["thought", "note"].includes(item.kind)
    && item.status !== "archived"
    && isCreatedThisWeek(item)), [items]);

  const projectActionContext = useMemo(() => {
    const opened: ReviewLine[] = [];
    const completed: ReviewLine[] = [];
    const attention: ReviewLine[] = [];

    for (const project of items.filter((item) => item.kind === "project" && item.status !== "archived")) {
      const currentAction = getCurrentProjectAction(project);
      if (projectRequiresNextAction(project) && !currentAction) {
        attention.push({ id: `${project.id}-missing`, text: project.title, detail: "Needs a current action point" });
      } else if (currentAction && !currentAction.targetDate) {
        attention.push({ id: `${project.id}-date`, text: `${project.title}: ${currentAction.title}`, detail: "Needs a check-in date" });
      } else if (currentAction && isProjectActionTargetReached(currentAction)) {
        attention.push({ id: currentAction.id, text: `${project.title}: ${currentAction.title}`, detail: `Check-in reached ${formatDateOnly(currentAction.targetDate)}` });
      }

      for (const action of project.actions) {
        if (isProjectActionOpenedThisWeek(action)) {
          opened.push({ id: `${action.id}-opened`, text: `${project.title}: ${action.title}`, detail: action.targetDate ? `Check in ${formatDateOnly(action.targetDate)}` : undefined });
        }
        if (isProjectActionCompletedThisWeek(action)) {
          completed.push({ id: `${action.id}-completed`, text: `${project.title}: ${action.title}`, detail: action.completionNote || undefined });
        }
      }
    }

    return { opened, completed, attention };
  }, [items]);

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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <TextPanel title={`Needs attention (${projectActionContext.attention.length})`} entries={projectActionContext.attention} />
            <TextPanel title={`Actions opened (${projectActionContext.opened.length})`} entries={projectActionContext.opened} />
            <TextPanel title={`Actions completed (${projectActionContext.completed.length})`} entries={projectActionContext.completed} />
            <StatusPanel title={`Projects completed (${closedThisWeek.length})`} items={closedThisWeek.filter((item) => item.kind === "project")} />
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

function TextPanel({ title, entries }: { title: string; entries: ReviewLine[] }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      {entries.length ? (
        <ul className="mt-4 space-y-2">
          {entries.slice(0, 20).map((entry) => (
            <li key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <p>{entry.text}</p>
              {entry.detail ? <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{entry.detail}</p> : null}
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-slate-500">Nothing to show.</p>}
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

function formatDateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}
