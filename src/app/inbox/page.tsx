"use client";

import Link from "next/link";
import { FormEvent } from "react";
import { areaLabels, Item, ItemKind, kindLabels, usePersonalData } from "@/lib/personal-data";

export default function InboxPage() {
  const { items, updateItem, setItemStatus, deleteItem } = usePersonalData();
  const inbox = items.filter((item) => item.status === "inbox");

  function organiseItem(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault();
    if (item.kind === "unclassified") return;
    setItemStatus(item.id, "active");
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Unprocessed captures</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Decide what each item is.</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">{inbox.length}</span>
      </div>

      {inbox.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">Inbox clear.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">New captures will wait here until you organise them.</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Capture something</Link>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {inbox.map((item) => (
          <details key={item.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">Captured {new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xl text-slate-400 transition group-open:rotate-45">＋</span>
            </summary>

            <form onSubmit={(event) => organiseItem(event, item)} className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
              <label className="block text-sm font-medium text-slate-700">
                Title
                <input className="input mt-2" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} required />
              </label>

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Extra context
                <textarea className="input mt-2 min-h-24 resize-y" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="Optional details, links, or why this matters…" />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  What is it?
                  <select className="input mt-2" value={item.kind === "unclassified" ? "" : item.kind} onChange={(event) => updateItem(item.id, { kind: event.target.value as ItemKind })} required>
                    <option value="" disabled>Choose a type</option>
                    {Object.entries(kindLabels).filter(([value]) => value !== "unclassified").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Area
                  <select className="input mt-2" value={item.area} onChange={(event) => updateItem(item.id, { area: event.target.value as keyof typeof areaLabels })}>
                    {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => deleteItem(item.id)} className="min-h-11 rounded-xl px-4 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">
                  Organise item
                </button>
              </div>
            </form>
          </details>
        ))}
      </div>
    </section>
  );
}
