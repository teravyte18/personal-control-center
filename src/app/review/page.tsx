"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { ReviewHistory } from "@/components/review-history";
import { ReviewNotificationControl } from "@/components/review-reminder";
import { ReviewPhotoField } from "@/components/review-photo-field";
import { buildReviewContext, formatDate, type ReviewLine } from "@/domain/review-context";
import { formatReviewPeriod, getCurrentReviewPeriod, isReviewCompletedForPeriod, isReviewDraftForPeriod } from "@/domain/weekly-review";
import { useDebouncedField } from "@/hooks/use-debounced-field";
import type { Item } from "@/lib/personal-data";
import { usePersonalData, useReviewData } from "@/lib/personal-data";

type Tab = "current" | "history";

export default function ReviewPage() {
  const { items } = usePersonalData();
  const { draft, history, loaded, updateDraft, completeReview } = useReviewData();
  const [tab, setTab] = useState<Tab>("current");
  const [saved, setSaved] = useState(false);
  const period = getCurrentReviewPeriod();
  const ready = isReviewDraftForPeriod(draft, period);
  const completed = isReviewCompletedForPeriod(history, period);
  const completedEntry = history.find((entry) => entry.periodStart === period.start && entry.periodEnd === period.end);
  const context = buildReviewContext(items, period);
  const location = useDebouncedField(draft.location, (value) => updateDraft("location", value));
  const happened = useDebouncedField(draft.happened, (value) => updateDraft("happened", value));
  const wentWell = useDebouncedField(draft.wentWell, (value) => updateDraft("wentWell", value));
  const difficult = useDebouncedField(draft.difficult, (value) => updateDraft("difficult", value));
  const learned = useDebouncedField(draft.learned, (value) => updateDraft("learned", value));
  const nextWeek = useDebouncedField(draft.nextWeek, (value) => updateDraft("nextWeek", value));

  function finishReview() {
    if (!ready || completed) return;
    flushSync(() => {
      location.flush();
      happened.flush();
      wentWell.flush();
      difficult.flush();
      learned.flush();
      nextWeek.flush();
    });
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
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Review one fixed week at a time.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Current period: {formatReviewPeriod(period)}. An unfinished draft remains open through Friday and is replaced next Saturday.</p>
        </div>
        <div className="flex rounded-2xl bg-slate-200 p-1">
          <TabButton active={tab === "current"} onClick={() => setTab("current")}>Current</TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>History</TabButton>
        </div>
      </div>

      {tab === "history" ? (
        <div className="mt-7"><ReviewHistory history={history} saved={saved} /></div>
      ) : (
        <div className="mt-7 space-y-5">
          {!loaded || (!ready && !completed) ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Preparing this review period…</div>
          ) : completed ? (
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 text-emerald-950 shadow-sm">
              <p className="text-sm font-semibold">Review complete</p>
              <h3 className="mt-2 text-2xl font-semibold">This period is closed until next Saturday.</h3>
              <p className="mt-3 text-sm leading-6 text-emerald-800">{completedEntry ? `Completed ${new Date(completedEntry.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.` : "The completed review is available in History."}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <TextPanel title={`Needs attention (${context.attention.length})`} entries={context.attention} />
                <TextPanel title={`Actions opened (${context.openedActions.length})`} entries={context.openedActions} />
                <TextPanel title={`Actions completed (${context.completedActions.length})`} entries={context.completedActions} />
                <ItemPanel title={`Projects completed (${context.completedProjects.length})`} items={context.completedProjects} />
                <ItemPanel title={`Open tasks (${context.openTasks.length})`} items={context.openTasks} />
                <ItemPanel title={`Tasks completed (${context.completedTasks.length})`} items={context.completedTasks} />
                <ItemPanel title={`Thoughts added (${context.thoughts.length})`} items={context.thoughts} />
                <TextPanel title={`Books started (${context.startedBooks.length})`} entries={context.startedBooks} />
                <TextPanel title={`Books finished (${context.finishedBooks.length})`} entries={context.finishedBooks} />
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Where are you doing this review?">
                    <input className="input" value={location.value} onChange={(event) => location.setValue(event.target.value)} onBlur={location.flush} placeholder="Café, park, library, home…" />
                  </Field>
                  <Field label="Photo of the place"><ReviewPhotoField photoName={draft.photoName} onChange={(value) => updateDraft("photoName", value)} /></Field>
                </div>
                <div className="mt-7 grid gap-6">
                  <Prompt label="What happened this week?" value={happened.value} onChange={happened.setValue} onBlur={happened.flush} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <Prompt label="What went well?" value={wentWell.value} onChange={wentWell.setValue} onBlur={wentWell.flush} />
                    <Prompt label="What felt difficult?" value={difficult.value} onChange={difficult.setValue} onBlur={difficult.flush} />
                  </div>
                  <Prompt label="What did you learn or notice?" value={learned.value} onChange={learned.setValue} onBlur={learned.flush} />
                  <Prompt label="What deserves attention next week?" value={nextWeek.value} onChange={nextWeek.setValue} onBlur={nextWeek.flush} />
                </div>
                <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Text saves after you pause typing or leave a field. Your unfinished review stays anchored to {formatReviewPeriod(period)}.</p>
                  <button type="button" onClick={finishReview} className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">Complete review</button>
                </div>
              </div>
            </>
          )}
          <ReviewNotificationControl />
        </div>
      )}
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{children}</button>;
}

function TextPanel({ title, entries }: { title: string; entries: ReviewLine[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-800">{title}</h3>{entries.length === 0 ? <Empty /> : <ul className="mt-3 space-y-3">{entries.slice(0, 6).map((entry) => <li key={entry.id} className="text-sm leading-5 text-slate-700"><p className="font-medium">{entry.text}</p>{entry.detail ? <p className="mt-1 text-xs text-slate-500">{entry.detail}</p> : null}</li>)}</ul>}</section>;
}

function ItemPanel({ title, items }: { title: string; items: Item[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-sm font-semibold text-slate-800">{title}</h3>{items.length === 0 ? <Empty /> : <ul className="mt-3 space-y-2">{items.slice(0, 8).map((item) => <li key={item.id} className="text-sm leading-5 text-slate-700"><p className="font-medium">{item.title}</p>{item.kind === "task" && item.checkInDate ? <p className="mt-1 text-xs text-slate-500">Check in {formatDate(item.checkInDate)}</p> : null}</li>)}</ul>}</section>;
}

function Empty() { return <p className="mt-3 text-xs leading-5 text-slate-400">Nothing recorded.</p>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="text-sm font-medium text-slate-700"><span className="mb-2 block">{label}</span>{children}</div>; }
function Prompt({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (value: string) => void; onBlur: () => void }) { return <label className="block text-sm font-medium text-slate-700">{label}<textarea className="input mt-2 min-h-28 resize-y" value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} /></label>; }
