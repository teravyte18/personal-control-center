"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  getNoteOrderMetadata,
  getNotes,
  NOTE_ORDER_METADATA_TITLE,
  noteContent,
  parseNoteContent,
  reorderNotes,
  serializeNoteOrder,
} from "@/domain/notes";
import { type Item, usePersonalData } from "@/lib/personal-data";

const LONG_PRESS_MS = 350;
const PRESS_MOVE_TOLERANCE_PX = 10;

type PendingPress = {
  noteId: string;
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLButtonElement;
};

export default function NotesPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const notes = useMemo(() => getNotes(items), [items]);
  const [dragOrder, setDragOrder] = useState<Item[] | null>(null);
  const orderedNotes = dragOrder ?? notes;
  const orderedNotesRef = useRef(notes);
  const [creating, setCreating] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const pressRef = useRef<PendingPress | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openNote = notes.find((note) => note.id === openNoteId);

  useEffect(() => {
    if (!draggingId) return;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previousUserSelect;
    };
  }, [draggingId]);

  useEffect(() => () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  }, []);

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

  function clearPressTimer() {
    if (!pressTimerRef.current) return;
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }

  function startPress(noteId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearPressTimer();
    pressRef.current = {
      noteId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      element: event.currentTarget,
    };

    pressTimerRef.current = setTimeout(() => {
      const press = pressRef.current;
      if (!press || press.noteId !== noteId) return;
      orderedNotesRef.current = notes;
      draggingIdRef.current = noteId;
      setDragOrder(notes);
      setDraggingId(noteId);
      press.element.setPointerCapture(press.pointerId);
      if (typeof navigator.vibrate === "function") navigator.vibrate(15);
    }, LONG_PRESS_MS);
  }

  function movePress(event: ReactPointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    const activeDraggingId = draggingIdRef.current;

    if (!activeDraggingId) {
      const distance = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
      if (distance > PRESS_MOVE_TOLERANCE_PX) {
        clearPressTimer();
        pressRef.current = null;
      }
      return;
    }

    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-note-card-id]");
    const targetId = target?.dataset.noteCardId;

    if (targetId && targetId !== activeDraggingId) {
      setDragOrder((current) => {
        const next = reorderNotes(current ?? notes, activeDraggingId, targetId);
        orderedNotesRef.current = next;
        return next;
      });
    }

    if (event.clientY < 90) window.scrollBy({ top: -14, behavior: "auto" });
    if (event.clientY > window.innerHeight - 110) window.scrollBy({ top: 14, behavior: "auto" });
  }

  function persistCurrentOrder() {
    const description = serializeNoteOrder(orderedNotesRef.current);
    const metadata = getNoteOrderMetadata(items);
    if (metadata) {
      updateItem(metadata.id, { description });
      return;
    }

    addItem(NOTE_ORDER_METADATA_TITLE, {
      description,
      kind: "unclassified",
      status: "archived",
      area: "uncategorized",
    });
  }

  function finishPress(event: ReactPointerEvent<HTMLButtonElement>) {
    clearPressTimer();
    const press = pressRef.current;
    const activeDraggingId = draggingIdRef.current;
    pressRef.current = null;

    if (!activeDraggingId || !press || press.pointerId !== event.pointerId) return;

    try {
      press.element.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser after cancellation.
    }

    persistCurrentOrder();
    draggingIdRef.current = null;
    setDragOrder(null);
    setDraggingId(null);
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-500">Mutable reference space</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Notes</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            The first line is the title. Long-press the grip and drag to reorder the grid.
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
          {orderedNotes.map((note) => {
            const dragging = draggingId === note.id;
            return (
              <article
                key={note.id}
                data-note-card-id={note.id}
                aria-grabbed={dragging}
                className={`flex min-h-16 overflow-hidden rounded-2xl border bg-white shadow-sm transition sm:min-h-20 ${
                  dragging
                    ? "z-10 scale-[1.03] border-slate-500 opacity-80 shadow-lg"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenNoteId(note.id)}
                  className="min-w-0 flex-1 p-3 text-left active:bg-slate-50 sm:p-4"
                >
                  <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 sm:text-base sm:leading-6">
                    {note.title}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Hold and drag to reorder ${note.title}`}
                  title="Hold and drag to reorder"
                  onPointerDown={(event) => startPress(note.id, event)}
                  onPointerMove={movePress}
                  onPointerUp={finishPress}
                  onPointerCancel={finishPress}
                  onContextMenu={(event) => event.preventDefault()}
                  style={{ touchAction: "none" }}
                  className={`flex w-11 shrink-0 cursor-grab items-center justify-center border-l border-slate-100 text-slate-400 active:bg-slate-50 ${
                    dragging ? "cursor-grabbing text-slate-700" : ""
                  }`}
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <circle cx="7" cy="5" r="1.25" />
                    <circle cx="13" cy="5" r="1.25" />
                    <circle cx="7" cy="10" r="1.25" />
                    <circle cx="13" cy="10" r="1.25" />
                    <circle cx="7" cy="15" r="1.25" />
                    <circle cx="13" cy="15" r="1.25" />
                  </svg>
                </button>
              </article>
            );
          })}
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
