"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { NoteMarkdown } from "@/components/note-markdown";
import {
  getNoteOrderMetadata,
  getNotes,
  NOTE_ORDER_METADATA_TITLE,
  noteContent,
  parseNoteContent,
  reorderNotes,
  serializeNoteOrder,
} from "@/domain/notes";
import { type Item, useDataConnection, usePersonalData } from "@/lib/personal-data";

const LONG_PRESS_MS = 350;
const PRESS_MOVE_TOLERANCE_PX = 10;
const AUTOSAVE_DELAY_MS = 800;

type PendingPress = {
  noteId: string;
  pointerId: number;
  startX: number;
  startY: number;
  element: HTMLButtonElement;
};

type SaveState = "clean" | "dirty" | "saved" | "needs-title";
type EditorMode = "edit" | "preview";

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

  const createNote = useCallback((content: string) => {
    const parsed = parseNoteContent(content);
    if (!parsed) return null;
    return addItem(parsed.title, {
      description: parsed.description,
      kind: "note",
      status: "active",
      area: "uncategorized",
    });
  }, [addItem]);

  const updateNote = useCallback((noteId: string, content: string) => {
    const parsed = parseNoteContent(content);
    if (!parsed) return false;
    updateItem(noteId, {
      title: parsed.title,
      description: parsed.description,
    });
    return true;
  }, [updateItem]);

  const removeNote = useCallback((noteId: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return false;
    deleteItem(noteId);
    setCreating(false);
    setOpenNoteId(null);
    return true;
  }, [deleteItem]);

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
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">Notes</h2>
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
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
          onCreate={createNote}
          onUpdate={updateNote}
          onDelete={removeNote}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {openNote ? (
        <NoteEditor
          key={openNote.id}
          initialNote={openNote}
          onCreate={createNote}
          onUpdate={updateNote}
          onDelete={removeNote}
          onClose={() => setOpenNoteId(null)}
        />
      ) : null}
    </section>
  );
}

function NoteEditor({
  initialNote,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: {
  initialNote?: Item;
  onCreate: (content: string) => Item | null;
  onUpdate: (noteId: string, content: string) => boolean;
  onDelete: (noteId: string, title: string) => boolean;
  onClose: () => void;
}) {
  const initialContent = initialNote ? noteContent(initialNote) : "";
  const [content, setContentState] = useState(initialContent);
  const [mode, setMode] = useState<EditorMode>(initialNote ? "preview" : "edit");
  const [saveState, setSaveState] = useState<SaveState>(initialNote ? "clean" : "needs-title");
  const [error, setError] = useState("");
  const [persistedId, setPersistedId] = useState(initialNote?.id ?? "");
  const contentRef = useRef(initialContent);
  const lastSavedContentRef = useRef(initialContent);
  const persistedIdRef = useRef(initialNote?.id ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { dataMode, syncing, syncError } = useDataConnection();

  const clearSaveTimer = useCallback(() => {
    if (!saveTimerRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const commitContent = useCallback((value: string) => {
    const parsed = parseNoteContent(value);
    if (!parsed) {
      setSaveState(value.trim() ? "needs-title" : "clean");
      return !value.trim();
    }

    const noteId = persistedIdRef.current;
    if (noteId) {
      if (!onUpdate(noteId, value)) return false;
    } else {
      const created = onCreate(value);
      if (!created) return false;
      persistedIdRef.current = created.id;
      setPersistedId(created.id);
    }

    lastSavedContentRef.current = value;
    setSaveState("saved");
    setError("");
    return true;
  }, [onCreate, onUpdate]);

  const flush = useCallback(() => {
    clearSaveTimer();
    const value = contentRef.current;
    if (value === lastSavedContentRef.current) return true;
    return commitContent(value);
  }, [clearSaveTimer, commitContent]);

  const flushRef = useRef(flush);
  const closeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const closeEditor = useCallback(() => {
    if (!flush()) {
      setMode("edit");
      setError("Start the note with a title on the first line before leaving.");
      return;
    }
    onClose();
  }, [flush, onClose]);

  useEffect(() => {
    closeRef.current = closeEditor;
  }, [closeEditor]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeRef.current();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    const flushOnPageHide = () => flushRef.current();
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushOnPageHide);
      flushRef.current();
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit") return;
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [mode]);

  const setContent = useCallback((next: string) => {
    setContentState(next);
    contentRef.current = next;
    setError("");
    clearSaveTimer();

    if (next === lastSavedContentRef.current) {
      setSaveState("clean");
      return;
    }
    if (!parseNoteContent(next)) {
      setSaveState(next.trim() ? "needs-title" : "clean");
      return;
    }

    setSaveState("dirty");
    saveTimerRef.current = setTimeout(() => {
      commitContent(contentRef.current);
    }, AUTOSAVE_DELAY_MS);
  }, [clearSaveTimer, commitContent]);

  function replaceSelection(before: string, after: string, fallback: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const next = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;
    setContent(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixSelectedLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = content.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? content.length : nextBreak;
    const selected = content.slice(lineStart, lineEnd) || "Text";
    const replacement = selected.split("\n").map((line) => `${prefix}${line}`).join("\n");
    const next = `${content.slice(0, lineStart)}${replacement}${content.slice(lineEnd)}`;
    setContent(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    });
  }

  function insertTable() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const leadingBreak = cursor > 0 && content[cursor - 1] !== "\n" ? "\n\n" : "";
    const table = "| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |";
    const insertion = `${leadingBreak}${table}`;
    const next = `${content.slice(0, cursor)}${insertion}${content.slice(textarea.selectionEnd)}`;
    setContent(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor + insertion.length, cursor + insertion.length);
    });
  }

  function deleteCurrentNote() {
    const noteId = persistedIdRef.current;
    if (!noteId) return;
    const title = parseNoteContent(contentRef.current)?.title || initialNote?.title || "Untitled note";
    if (onDelete(noteId, title)) onClose();
  }

  const parsed = parseNoteContent(content);
  const displayTitle = parsed?.title || initialNote?.title || "New note";
  const statusText = syncError || dataMode === "local-fallback"
    ? "Saved on this device"
    : saveState === "needs-title"
      ? "Needs a title"
      : saveState === "dirty" || syncing
        ? "Saving…"
        : saveState === "saved"
          ? "Saved"
          : "";

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-700 active:bg-slate-100"
              >
                Done
              </button>
              <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-800">{displayTitle}</p>
              <p className={`w-28 text-right text-xs font-medium ${syncError ? "text-rose-700" : "text-slate-500"}`} aria-live="polite">
                {statusText}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              <div className="flex shrink-0 rounded-xl bg-slate-200 p-1">
                <button type="button" onClick={() => setMode("edit")} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${mode === "edit" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Edit</button>
                <button type="button" onClick={() => setMode("preview")} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${mode === "preview" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Preview</button>
              </div>
              {mode === "edit" ? (
                <div className="flex shrink-0 gap-1">
                  <FormatButton label="Bold" onClick={() => replaceSelection("**", "**", "bold text")} />
                  <FormatButton label="Heading" onClick={() => prefixSelectedLines("## ")} />
                  <FormatButton label="List" onClick={() => prefixSelectedLines("- ")} />
                  <FormatButton label="Checklist" onClick={() => prefixSelectedLines("- [ ] ")} />
                  <FormatButton label="Link" onClick={() => replaceSelection("[", "](https://)", "link text")} />
                  <FormatButton label="Table" onClick={insertTable} />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-6 sm:px-6">
          {mode === "edit" ? (
            <>
              <label className="sr-only" htmlFor="note-content">Note content</label>
              <textarea
                ref={textareaRef}
                id="note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onBlur={flush}
                className="min-h-[60vh] flex-1 resize-none bg-transparent text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400 sm:text-lg sm:leading-8"
                placeholder={"Plain title on the first line\n\nWrite below it. Use the toolbar for bold text, lists, links, and tables."}
              />
              <p className="mt-4 text-xs leading-5 text-slate-500">
                The first line remains the note title. The rest supports lightweight Markdown and saves after you pause typing.
              </p>
            </>
          ) : parsed ? (
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{parsed.title}</h1>
              <div className="mt-6 border-t border-slate-200 pt-6">
                <NoteMarkdown value={parsed.description} />
              </div>
            </article>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold">Add a title to preview this note.</h2>
              <p className="mt-2 text-sm text-slate-500">The first non-empty line becomes the title.</p>
            </div>
          )}

          {error ? <p className="mt-4 text-sm font-medium text-rose-700" aria-live="polite">{error}</p> : null}
          {persistedId ? (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={deleteCurrentNote}
                className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700"
              >
                Delete note
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function FormatButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 active:bg-slate-100"
    >
      {label}
    </button>
  );
}
