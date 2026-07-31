"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBookDetails, serializeBookDetails } from "@/domain/library";
import { useDebouncedField } from "@/hooks/use-debounced-field";
import {
  areaLabels,
  getCurrentProjectAction,
  type Item,
  type ItemKind,
  kindLabels,
  usePersonalData,
} from "@/lib/personal-data";

type InboxClassification = ItemKind | "book";

export default function InboxPage() {
  const { items } = usePersonalData();
  const inbox = items.filter((item) => item.status === "inbox");

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
        {inbox.map((item) => <InboxItem key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function InboxItem({ item }: { item: Item }) {
  const {
    updateItem,
    setItemStatus,
    deleteItem,
    addProjectAction,
    updateProjectAction,
  } = usePersonalData();
  const existingAction = getCurrentProjectAction(item);
  const [classification, setClassification] = useState<InboxClassification>(item.kind);
  const [actionTitle, setActionTitle] = useState(existingAction?.title ?? "");
  const [targetDate, setTargetDate] = useState(existingAction?.targetDate ?? "");
  const [taskDate, setTaskDate] = useState(item.checkInDate ?? "");
  const title = useDebouncedField(
    item.title,
    (value) => updateItem(item.id, { title: value }),
    { canCommit: (value) => Boolean(value.trim()) },
  );
  const description = useDebouncedField(
    item.description,
    (value) => updateItem(item.id, { description: value }),
  );

  function organiseItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.value.trim() || classification === "unclassified") return;
    title.flush();
    description.flush();

    if (classification === "book") {
      updateItem(item.id, {
        kind: "note",
        area: item.area === "uncategorized" ? "personal" : item.area,
        description: serializeBookDetails(createBookDetails(description.value)),
      });
      setItemStatus(item.id, "active");
      return;
    }

    if (classification === "project" && actionTitle.trim()) {
      if (existingAction) {
        updateProjectAction(item.id, existingAction.id, { title: actionTitle, targetDate });
      } else {
        addProjectAction(item.id, actionTitle, targetDate);
      }
    }

    if (classification === "task") updateItem(item.id, { checkInDate: taskDate });
    setItemStatus(item.id, "active");
  }

  function selectClassification(value: InboxClassification) {
    setClassification(value);
    if (value !== "book") updateItem(item.id, { kind: value });
  }

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{title.value || "Untitled item"}</p>
          <p className="mt-1 text-xs text-slate-400">Captured {new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
        <span className="text-xl text-slate-400 transition group-open:rotate-45">＋</span>
      </summary>

      <form onSubmit={organiseItem} className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input className="input mt-2" value={title.value} onChange={(event) => title.setValue(event.target.value)} onBlur={title.flush} required />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Extra context
          <textarea className="input mt-2 min-h-24 resize-y" value={description.value} onChange={(event) => description.setValue(event.target.value)} onBlur={description.flush} placeholder="Optional details, links, or why this matters…" />
          {classification === "note" ? <span className="mt-2 block text-xs font-normal text-slate-500">The title becomes the note&apos;s first line; this context becomes the editable body below it.</span> : null}
          {classification === "book" ? <span className="mt-2 block text-xs font-normal text-slate-500">This context becomes the book&apos;s initial Thoughts and takeaways. Author, shelves, cover, dates, and ratings can be added from Library.</span> : null}
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            What is it?
            <select className="input mt-2" value={classification === "unclassified" ? "" : classification} onChange={(event) => selectClassification(event.target.value as InboxClassification)} required>
              <option value="" disabled>Choose a type</option>
              {Object.entries(kindLabels).filter(([value]) => value !== "unclassified").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              <option value="book">Book</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Area
            <select className="input mt-2" value={item.area} onChange={(event) => updateItem(item.id, { area: event.target.value as keyof typeof areaLabels })}>
              {Object.entries(areaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>

        {classification === "project" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_11rem]">
            <label className="block text-sm font-medium text-slate-700">
              First action
              <input className="input mt-2" value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} placeholder="Optional concrete next step" />
              <span className="mt-2 block text-xs font-normal text-slate-500">Optional. Projects without an action start in Waiting and reactivate when you add one.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Check-in date
              <input type="date" className="input mt-2" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} disabled={!actionTitle.trim()} />
              <span className="mt-2 block text-xs font-normal text-slate-500">Optional when an action is provided.</span>
            </label>
          </div>
        ) : null}

        {classification === "task" ? (
          <label className="mt-4 block max-w-xs text-sm font-medium text-slate-700">
            Check-in date
            <input type="date" className="input mt-2" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
            <span className="mt-2 block text-xs font-normal text-slate-500">Optional. Undated tasks stay open without creating warnings.</span>
          </label>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => deleteItem(item.id)} className="min-h-11 rounded-xl px-4 text-sm font-medium text-rose-600 hover:bg-rose-50">Delete</button>
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">Organise item</button>
        </div>
      </form>
    </details>
  );
}
