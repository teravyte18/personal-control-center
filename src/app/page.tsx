"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { isProjectPastCheckIn } from "@/domain/project-dates";
import { usePersonalData } from "@/lib/personal-data";

export default function CapturePage() {
  const { items, addItem } = usePersonalData();
  const [capture, setCapture] = useState("");
  const inboxCount = useMemo(() => items.filter((item) => item.status === "inbox").length, [items]);
  const overdueProjects = useMemo(() => items.filter((item) => isProjectPastCheckIn(item)), [items]);

  function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = addItem(capture);
    if (!item) return;
    setCapture("");
  }

  return (
    <section className="mx-auto flex min-h-[68vh] max-w-2xl flex-col justify-center">
      {overdueProjects.length > 0 ? (
        <Link
          href="/projects"
          className="mb-4 flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-rose-950 shadow-sm transition active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full bg-rose-600" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{overdueProjects.length} {overdueProjects.length === 1 ? "project needs" : "projects need"} attention</p>
              <p className="mt-1 text-xs text-rose-700">A current action is past its check-in date.</p>
            </div>
          </div>
          <span className="shrink-0 text-lg text-rose-500" aria-hidden="true">→</span>
        </Link>
      ) : null}

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
