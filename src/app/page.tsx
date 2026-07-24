"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { isProjectPastCheckIn } from "@/domain/project-dates";
import { isTaskDueToday, isTaskOverdue, usePersonalData } from "@/lib/personal-data";

export default function CapturePage() {
  const { items, addItem } = usePersonalData();
  const [capture, setCapture] = useState("");
  const inboxCount = useMemo(() => items.filter((item) => item.status === "inbox").length, [items]);
  const overdueProjects = useMemo(() => items.filter((item) => isProjectPastCheckIn(item)), [items]);
  const overdueTasks = useMemo(() => items.filter((item) => isTaskOverdue(item)), [items]);
  const dueTasks = useMemo(() => items.filter((item) => isTaskDueToday(item)), [items]);

  function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = addItem(capture);
    if (!item) return;
    setCapture("");
  }

  return (
    <section className="mx-auto flex min-h-[68vh] max-w-2xl flex-col justify-center">
      <div className="mb-4 space-y-3">
        {overdueProjects.length > 0 ? (
          <AttentionLink
            href="/projects"
            count={overdueProjects.length}
            singular="project needs"
            plural="projects need"
            detail="A current action is past its check-in date."
            tone="red"
          />
        ) : null}
        {overdueTasks.length > 0 ? (
          <AttentionLink
            href="/tasks"
            count={overdueTasks.length}
            singular="task is overdue"
            plural="tasks are overdue"
            detail="Reschedule them or complete them from Tasks."
            tone="red"
          />
        ) : null}
        {dueTasks.length > 0 ? (
          <AttentionLink
            href="/tasks"
            count={dueTasks.length}
            singular="task is due today"
            plural="tasks are due today"
            detail="These check-ins have reached their date."
            tone="amber"
          />
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-slate-500">Quick capture</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">What is on your mind?</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Write it down now. You can decide what it means later.</p>

        <form onSubmit={submitCapture} className="mt-7">
          <textarea
            value={capture}
            onChange={(event) => setCapture(event.target.value)}
            className="input min-h-36 resize-none text-base leading-7"
            placeholder="A task, project, question, observation…"
            aria-label="Capture a thought"
            required
          />
          <button type="submit" className="mt-3 min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-semibold text-white active:scale-[0.99]">
            Save to inbox
          </button>
        </form>

        <Link href="/inbox" className="mt-5 flex min-h-16 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 transition active:scale-[0.99]">
          <div>
            <p className="text-sm font-semibold text-slate-800">Inbox</p>
            <p className="mt-1 text-xs text-slate-500">Items waiting to be resolved</p>
          </div>
          <span className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">{inboxCount}</span>
        </Link>
      </div>
    </section>
  );
}

function AttentionLink({
  href,
  count,
  singular,
  plural,
  detail,
  tone,
}: {
  href: string;
  count: number;
  singular: string;
  plural: string;
  detail: string;
  tone: "red" | "amber";
}) {
  const classes = tone === "red"
    ? "border-rose-200 bg-rose-50 text-rose-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
  const secondary = tone === "red" ? "text-rose-700" : "text-amber-700";
  const dot = tone === "red" ? "bg-rose-600" : "bg-amber-500";

  return (
    <Link href={href} className={`flex min-h-16 items-center justify-between gap-4 rounded-2xl border px-4 shadow-sm transition active:scale-[0.99] ${classes}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{count} {count === 1 ? singular : plural}</p>
          <p className={`mt-1 text-xs ${secondary}`}>{detail}</p>
        </div>
      </div>
      <span className={`shrink-0 text-lg ${secondary}`} aria-hidden="true">→</span>
    </Link>
  );
}
