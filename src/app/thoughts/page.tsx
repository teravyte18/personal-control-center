"use client";

import { FormEvent, useMemo, useState } from "react";
import { getThoughts } from "@/domain/thoughts";
import { Item, usePersonalData } from "@/lib/personal-data";

export default function ThoughtsPage() {
  const { items, addItem, updateItem } = usePersonalData();
  const [thought, setThought] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const thoughts = useMemo(() => getThoughts(items), [items]);

  function submitThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = addItem(thought, { kind: "thought", status: "active" });
    if (item) setThought("");
  }

  function beginEditing(item: Item) {
    setEditingId(item.id);
    setEditText(item.title);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault();
    const title = editText.trim();
    if (!title) return;
    updateItem(item.id, { title });
    setEditingId(null);
    setEditText("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h2 className="text-3xl font-semibold tracking-tight">Thoughts</h2>

      <form onSubmit={submitThought} className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <textarea className="input min-h-24 resize-none" value={thought} onChange={(event) => setThought(event.target.value)} placeholder="Write a thought directly here…" required />
        <div className="mt-3 flex justify-end">
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white active:scale-[0.99]">Save thought</button>
        </div>
      </form>

      {thoughts.length === 0 ? <p className="mt-8 text-sm text-slate-500">No saved thoughts yet.</p> : null}

      <div className="mt-6 columns-1 gap-4 sm:columns-2">
        {thoughts.map((item) => (
          <article key={item.id} className="mb-4 break-inside-avoid rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            {editingId === item.id ? (
              <form onSubmit={(event) => saveEdit(event, item)}>
                <textarea value={editText} onChange={(event) => setEditText(event.target.value)} className="input min-h-28 resize-y text-base leading-7" aria-label="Edit thought" autoFocus required />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={cancelEdit} className="min-h-10 rounded-xl px-4 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">Save</button>
                </div>
              </form>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-base font-medium leading-7 text-slate-800">{item.title}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <time dateTime={item.createdAt} className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </time>
                  <button type="button" onClick={() => beginEditing(item)} className="min-h-9 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">Edit</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
