"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getNotes, noteContent, parseNoteContent } from "@/domain/notes";
import { type Item, usePersonalData } from "@/lib/personal-data";

export default function NotesPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const notes = useMemo(() => getNotes(items), [items]);
  const [creating, setCreating] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const openNote = notes.find((note) => note.id === openNoteId);

  function createNote(content: string) {
    const parsed = parseNoteContent(content);
    if (!parsed) return false;
    const created = addItem(parsed.title, {
      description: parsed.description,
      kind: "note",
      status: "active",
      area: "uncategorized",
    });
    if (!created) return false;
    setCreating(false);
    return true;
  }

  function saveNote(note: Item, content: string) {
    const parsed = parseNoteContent(content);
    if (!parsed) return false;
    updateItem(note.id, {
      title: parsed.title,
      description: parsed.description,
    });
    setOpenNoteId(null);
    return true;
  }

  function removeNote(note: Item) {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    deleteItem(note.id);
    setOpenNoteId(null);
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-500">Mutable reference space</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Notes</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            The first line is the title. Cards stay compact until you open the full note.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white active:scale-[0.99]"
        >
          New note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No notes yet.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create one here, or organise an Inbox item as a Note.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            Create first note
          </button>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setOpenNoteId(note.id)}
              className="min-h-28 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 active:scale-[0.99] sm:min-h-32 sm:p-5"
            >
              <span className="line-clamp-4 font-semibold leading-6 text-slate-900">{note.title}</span>
            </button>
          ))}
        </div>
      )}

      {creating ? (
        <NoteEditor
          key="new-note"
          heading="New note"
          initialContent=""
          onCancel={() => setCreating(false)}
          onSave={createNote}
        />
      ) : null}

      {openNote ? (
        <NoteEditor
          key={openNote.id}
          heading={openNote.title}
          initialContent={noteContent(openNote)}
          onCancel={() => setOpenNoteId(null)}
          onSave={(content) => saveNote(openNote, content)}
          onDelete={() => removeNote(openNote)}
        />
      ) : null}
    </section>
  );
}

function NoteEditor({
  heading,
  initialContent,
  onCancel,
  onSave,
  onDelete,
}: {
  heading: string;
  initialContent: string;
  onCancel: () => void;
  onSave: (content: string) => boolean;
  onDelete?: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", cancelOnEscape);
    };
  }, [onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onSave(content)) return;
    setError("Start the note with a title on the first line.");
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <form className="flex min-h-screen flex-col" onSubmit={submit}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{heading}</p>
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-6 sm:px-6">
          <label className="sr-only" htmlFor="note-content">Note content</label>
          <textarea
            id="note-content"
            autoFocus
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (error) setError("");
            }}
            className="min-h-[60vh] flex-1 resize-none bg-transparent text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg sm:leading-8"
            placeholder={"Title on the first line\n\nWrite anything below it…"}
          />
          {error ? <p className="mt-4 text-sm font-medium text-rose-700" aria-live="polite">{error}</p> : null}
          {onDelete ? (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={onDelete}
                className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700"
              >
                Delete note
              </button>
            </div>
          ) : null}
        </main>
      </form>
    </div>
  );
}
