"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { isProjectPastCheckIn } from "@/domain/project-dates";
import { isTaskDueToday, isTaskOverdue, usePersonalData } from "@/lib/personal-data";
import { useOfflineCapture } from "@/providers/offline-capture-provider";

export default function CapturePage() {
  const { items } = usePersonalData();
  const {
    online,
    pending,
    syncing,
    lastError,
    capture: saveCapture,
    retry,
  } = useOfflineCapture();
  const [capture, setCapture] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingNotInSnapshot = useMemo(
    () => pending.filter((record) => !items.some((item) => item.id === record.id)),
    [items, pending],
  );
  const inboxCount = useMemo(
    () => items.filter((item) => item.status === "inbox").length + pendingNotInSnapshot.length,
    [items, pendingNotInSnapshot.length],
  );
  const overdueProjects = useMemo(() => items.filter((item) => isProjectPastCheckIn(item)), [items]);
  const overdueTasks = useMemo(() => items.filter((item) => isTaskOverdue(item)), [items]);
  const dueTasks = useMemo(() => items.filter((item) => isTaskDueToday(item)), [items]);

  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    try {
      const result = await saveCapture(capture);
      if (!result) return;
      setCapture("");
      setNotice(result.queued
        ? "Saved on this device. It will move to your Inbox when the server is reachable."
        : "Saved to Inbox.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The capture could not be saved.");
    } finally {
      setSubmitting(false);
    }
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Quick capture</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">What is on your mind?</h2>
          </div>
          <span className={`mt-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
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
          <button type="submit" disabled={submitting} className="mt-3 min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-semibold text-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Saving…" : online ? "Save to inbox" : "Save on this device"}
          </button>
        </form>

        {notice ? <p className="mt-3 text-sm font-medium text-slate-600" aria-live="polite">{notice}</p> : null}

        {pending.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-live="polite">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{pending.length} {pending.length === 1 ? "capture is" : "captures are"} waiting to sync</p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  They are stored on this device and will retry automatically when the app can reach the server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void retry()}
                disabled={!online || syncing}
                className="min-h-10 shrink-0 rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "Retry now"}
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-amber-900">
              {pending.slice(0, 3).map((record) => (
                <li key={record.id} className="truncate rounded-xl bg-white/70 px-3 py-2">{record.mutation.item.title}</li>
              ))}
              {pending.length > 3 ? <li className="px-3 text-xs font-medium text-amber-700">And {pending.length - 3} more…</li> : null}
            </ul>
            {lastError ? <p className="mt-3 text-xs font-medium text-rose-700">Last retry: {lastError}</p> : null}
          </div>
        ) : !online ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Quick Capture remains available offline. Other parts of the app are read-only in practice until the connection returns.
          </p>
        ) : null}

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
