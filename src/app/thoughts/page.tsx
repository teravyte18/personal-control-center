"use client";

import { FormEvent, useMemo, useState } from "react";
import { areaLabels, usePersonalData } from "@/lib/personal-data";

export default function ThoughtsPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const [thought, setThought] = useState("");
  const thoughts = useMemo(() => items.filter((item) => ["thought", "note"].includes(item.kind) && item.status !== "archived"), [items]);

  function submitThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = addItem(thought, { kind: "thought", status: "active" });
    if (item) setThought("");
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">Ideas and observations without forced action</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Some things only need to be remembered.</h2>
      </div>

      <form onSubmit={submitThought} className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <textarea className="input min-h-24 resize-none" value={thought} onChange={(event) => setThought(event.target.value)} placeholder="Write a thought directly here…" required />
        <div className="mt-3 flex justify-end">
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">Save thought</button>
        </div>
      </form>

      {thoughts.length === 0 ? <p className="mt-8 text-sm text-slate-500">No saved thoughts yet.</p> : null}

      <div className="mt-6 columns-1 gap-4 sm:columns-2">
        {thoughts.map((item) => (
          <article key={item.id} className="mb-4 break-inside-avoid rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <textarea value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="w-full resize-none border-0 bg-transparent text-base font-medium leading-7 outline-none" rows={Math.max(2, Math.ceil(item.title.length / 40))} aria-label="Thought text" />
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>{areaLabels[item.area]}</span>
              <button type="button" onClick={() => deleteItem(item.id)} className="min-h-9 rounded-lg px-3 text-rose-500 hover:bg-rose-50">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
