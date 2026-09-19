"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { buildHomeTodayEntries, type HomeTodayEntry } from "@/domain/home-today";
import { usePersonalData } from "@/lib/personal-data";
import { useOfflineCapture } from "@/providers/offline-capture-provider";

const HOME_GREETINGS = [
  "What's going on?",
  "What's next?",
  "Anything on your mind?",
  "What matters today?",
  "Ready when you are.",
  "Where are we?",
] as const;
const HOME_GREETING_KEY = "pcc-home-greeting";

type HomeGreeting = (typeof HOME_GREETINGS)[number];

let cachedHomeGreeting: HomeGreeting | null = null;

function subscribeToHomeGreeting() {
  return () => {};
}

function getServerHomeGreeting(): HomeGreeting {
  return HOME_GREETINGS[0];
}

function getBrowserHomeGreeting(): HomeGreeting {
  if (cachedHomeGreeting) return cachedHomeGreeting;

  try {
    const stored = window.sessionStorage.getItem(HOME_GREETING_KEY);
    if (stored && HOME_GREETINGS.includes(stored as HomeGreeting)) {
      cachedHomeGreeting = stored as HomeGreeting;
      return cachedHomeGreeting;
    }

    cachedHomeGreeting = HOME_GREETINGS[Math.floor(Math.random() * HOME_GREETINGS.length)];
    window.sessionStorage.setItem(HOME_GREETING_KEY, cachedHomeGreeting);
    return cachedHomeGreeting;
  } catch {
    cachedHomeGreeting = HOME_GREETINGS[0];
    return cachedHomeGreeting;
  }
}

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
  const greeting = useSyncExternalStore(
    subscribeToHomeGreeting,
    getBrowserHomeGreeting,
    getServerHomeGreeting,
  );

  const pendingNotInSnapshot = useMemo(
    () => pending.filter((record) => !items.some((item) => item.id === record.id)),
    [items, pending],
  );
  const inboxCount = useMemo(
    () => items.filter((item) => item.status === "inbox").length + pendingNotInSnapshot.length,
    [items, pendingNotInSnapshot.length],
  );
  const todayEntries = useMemo(() => buildHomeTodayEntries(items), [items]);

  async function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    try {
      const result = await saveCapture(capture);
      if (!result) return;
      setCapture("");
      setNotice(result.queued
        ? "Saved on this device. It will move to Inbox when the server is reachable."
        : "Saved to Inbox.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The capture could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl lg:flex lg:min-h-[72vh] lg:items-center">
      <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{greeting}</h1>
            {!online ? (
              <span className="mt-1 shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Offline
              </span>
            ) : null}
          </div>

          <form onSubmit={submitCapture} className="mt-5">
            <textarea
              value={capture}
              onChange={(event) => setCapture(event.target.value)}
              className="input min-h-36 resize-none text-base leading-7"
              placeholder="A task, project, question, observation…"
              aria-label="Capture a thought"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-semibold text-white active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Saving…" : online ? "Save to inbox" : "Save on this device"}
            </button>
          </form>

          {notice ? <p className="mt-3 text-sm font-medium text-slate-600" aria-live="polite">{notice}</p> : null}

          {pending.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-live="polite">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{pending.length} {pending.length === 1 ? "capture" : "captures"} waiting to sync</p>
                  {lastError ? <p className="mt-1 text-xs font-medium text-rose-700">Last retry: {lastError}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={!online || syncing}
                  className="min-h-10 shrink-0 rounded-xl bg-amber-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {syncing ? "Syncing…" : "Retry"}
                </button>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-amber-900">
                {pending.slice(0, 3).map((record) => (
                  <li key={record.id} className="truncate">{record.mutation.item.title}</li>
                ))}
                {pending.length > 3 ? <li className="text-xs font-medium text-amber-700">+{pending.length - 3} more</li> : null}
              </ul>
            </div>
          ) : !online ? (
            <p className="mt-5 text-sm leading-6 text-amber-800">
              Capture still works offline; other spaces need the server.
            </p>
          ) : null}

          <Link
            href="/inbox"
            className="mt-5 flex min-h-14 items-center justify-between rounded-2xl bg-slate-50 px-4 transition active:scale-[0.99]"
          >
            <span className="text-sm font-semibold text-slate-800">Inbox</span>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
              {inboxCount}
            </span>
          </Link>
        </div>

        <TodayPanel entries={todayEntries} />
      </div>
    </section>
  );
}

function TodayPanel({ entries }: { entries: HomeTodayEntry[] }) {
  const overdueCount = entries.filter((entry) => entry.state === "overdue").length;
  const dueCount = entries.length - overdueCount;
  const visible = entries.slice(0, 5);

  return (
    <aside className="self-start rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:self-stretch">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Near term</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Today</h2>
        </div>
        {entries.length ? (
          <p className="pt-1 text-right text-xs font-medium text-slate-500">
            {overdueCount ? `${overdueCount} overdue` : ""}
            {overdueCount && dueCount ? " · " : ""}
            {dueCount ? `${dueCount} today` : ""}
          </p>
        ) : null}
      </div>

      {visible.length ? (
        <div className="mt-5 divide-y divide-slate-100">
          {visible.map((entry) => <TodayRow key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Nothing dated needs attention today.
        </p>
      )}

      {entries.length > visible.length ? (
        <p className="mt-3 text-xs font-medium text-slate-500">+{entries.length - visible.length} more dated {entries.length - visible.length === 1 ? "item" : "items"}</p>
      ) : null}
    </aside>
  );
}

function TodayRow({ entry }: { entry: HomeTodayEntry }) {
  const overdue = entry.state === "overdue";
  const href = entry.kind === "task" ? "/tasks" : "/projects";

  return (
    <Link href={href} className="group flex gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${overdue ? "bg-rose-600" : "bg-amber-500"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 group-hover:underline">{entry.title}</span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {entry.kind === "task" ? "Task" : entry.context}
        </span>
      </span>
      <span className={`shrink-0 pt-0.5 text-xs font-semibold ${overdue ? "text-rose-700" : "text-amber-700"}`}>
        {overdue ? `Past ${formatDate(entry.date)}` : "Today"}
      </span>
    </Link>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
