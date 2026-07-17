"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { usePersonalData } from "@/lib/personal-data";

export default function CapturePage() {
  const { addItem } = usePersonalData();
  const [capture, setCapture] = useState("");
  const [saved, setSaved] = useState(false);

  function submitCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = addItem(capture);
    if (!item) return;
    setCapture("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <section className="mx-auto flex min-h-[68vh] max-w-2xl flex-col justify-center">
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
            autoFocus
          />
          <button type="submit" className="mt-3 min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!capture.trim()}>
            Save to inbox
          </button>
        </form>

        <div className="mt-4 min-h-6 text-center text-sm">
          {saved ? <span className="font-medium text-emerald-700">Saved. You can let it go for now.</span> : <Link href="/inbox" className="text-slate-500 underline decoration-slate-300 underline-offset-4">Open inbox</Link>}
        </div>
      </div>
    </section>
  );
}
