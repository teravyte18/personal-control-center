"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  bookOwnershipStates,
  bookPriorities,
  bookReadingStates,
  createBookDetails,
  formatBookScore,
  getBooks,
  getBookScore,
  reorderUpNext,
  serializeBookDetails,
  sortBooksForShelf,
  type BookDetails,
  type BookItem,
  type BookOwnershipState,
  type BookPriority,
  type BookRatings,
  type BookReadingState,
  type BookShelfId,
} from "@/domain/library";
import { usePersonalData } from "@/lib/personal-data";

const readingLabels: Record<BookReadingState, string> = {
  unread: "Unread",
  reading: "Reading",
  finished: "Finished",
  paused: "Paused",
  abandoned: "Abandoned",
};

const ownershipLabels: Record<BookOwnershipState, string> = {
  unspecified: "Unspecified",
  owned: "Owned",
  borrowed: "Borrowed",
  wishlist: "Wishlist",
};

const priorityLabels: Record<BookPriority, string> = {
  none: "None",
  "up-next": "Up next",
  soon: "Soon",
  later: "Later",
};

const shelves: { id: BookShelfId; label: string }[] = [
  { id: "all", label: "All books" },
  { id: "reading", label: "Reading" },
  { id: "up-next", label: "Up next" },
  { id: "owned-unread", label: "Owned unread" },
  { id: "wishlist", label: "Wishlist" },
  { id: "finished", label: "Finished" },
  { id: "paused", label: "Paused / abandoned" },
];

const ratingValues = Array.from({ length: 11 }, (_, index) => index / 2);

export default function LibraryPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const books = useMemo(() => getBooks(items), [items]);
  const [shelf, setShelf] = useState<BookShelfId>("all");
  const [query, setQuery] = useState("");
  const [readingFilter, setReadingFilter] = useState<BookReadingState | "">("");
  const [ownershipFilter, setOwnershipFilter] = useState<BookOwnershipState | "">("");
  const [priorityFilter, setPriorityFilter] = useState<BookPriority | "">("");
  const [minimumRating, setMinimumRating] = useState("");
  const [creating, setCreating] = useState(false);
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const openBook = books.find((book) => book.item.id === openBookId);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const minimum = minimumRating === "" ? undefined : Number(minimumRating);
    return sortBooksForShelf(books, shelf).filter((book) => {
      const score = getBookScore(book.details);
      if (normalizedQuery
        && !book.item.title.toLocaleLowerCase().includes(normalizedQuery)
        && !book.details.author.toLocaleLowerCase().includes(normalizedQuery)) return false;
      if (readingFilter && book.details.readingState !== readingFilter) return false;
      if (ownershipFilter && book.details.ownership !== ownershipFilter) return false;
      if (priorityFilter && book.details.priority !== priorityFilter) return false;
      if (minimum !== undefined && (score === undefined || score < minimum)) return false;
      return true;
    });
  }, [books, shelf, query, readingFilter, ownershipFilter, priorityFilter, minimumRating]);

  function nextQueueOrder() {
    return books.reduce((maximum, book) => Math.max(maximum, book.details.upNextOrder), 0) + 1;
  }

  function saveBook(book: BookItem | undefined, title: string, details: BookDetails) {
    const queuedDetails = details.priority === "up-next" && details.upNextOrder === 0
      ? { ...details, upNextOrder: nextQueueOrder() }
      : details;
    const description = serializeBookDetails(queuedDetails);

    if (book) {
      updateItem(book.item.id, { title: title.trim(), description });
    } else {
      const created = addItem(title, {
        description,
        kind: "note",
        status: "active",
        area: "personal",
      });
      if (!created) return false;
    }

    setCreating(false);
    setOpenBookId(null);
    return true;
  }

  async function removeBook(book: BookItem) {
    if (!window.confirm(`Delete “${book.item.title}”? This cannot be undone.`)) return;
    if (book.details.coverId) await deleteCover(book.details.coverId);
    deleteItem(book.item.id);
    setOpenBookId(null);
  }

  function moveBook(bookId: string, direction: -1 | 1) {
    const reordered = reorderUpNext(books, bookId, direction);
    for (const book of reordered) {
      const current = books.find((candidate) => candidate.item.id === book.item.id);
      if (!current || current.details.upNextOrder === book.details.upNextOrder) continue;
      updateItem(book.item.id, { description: serializeBookDetails(book.details) });
    }
  }

  const filterCount = [readingFilter, ownershipFilter, priorityFilter, minimumRating].filter(Boolean).length;

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{books.length} {books.length === 1 ? "book" : "books"}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Library</h2>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white active:scale-[0.99]">
          New book
        </button>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2">
          {shelves.map((candidate) => {
            const count = sortBooksForShelf(books, candidate.id).length;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setShelf(candidate.id)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${shelf === candidate.id ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              >
                {candidate.label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_repeat(4,minmax(8.5rem,auto))]">
          <label className="text-sm font-medium text-slate-700">
            <span className="sr-only">Search books</span>
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or author" />
          </label>
          <FilterSelect label="Reading state" value={readingFilter} onChange={(value) => setReadingFilter(value as BookReadingState | "")}>
            {bookReadingStates.map((value) => <option key={value} value={value}>{readingLabels[value]}</option>)}
          </FilterSelect>
          <FilterSelect label="Ownership" value={ownershipFilter} onChange={(value) => setOwnershipFilter(value as BookOwnershipState | "")}>
            {bookOwnershipStates.map((value) => <option key={value} value={value}>{ownershipLabels[value]}</option>)}
          </FilterSelect>
          <FilterSelect label="Priority" value={priorityFilter} onChange={(value) => setPriorityFilter(value as BookPriority | "")}>
            {bookPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}
          </FilterSelect>
          <FilterSelect label="Minimum score" value={minimumRating} onChange={setMinimumRating}>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}+</option>)}
          </FilterSelect>
        </div>
        {filterCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setReadingFilter("");
              setOwnershipFilter("");
              setPriorityFilter("");
              setMinimumRating("");
            }}
            className="mt-3 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4"
          >
            Clear {filterCount} {filterCount === 1 ? "filter" : "filters"}
          </button>
        ) : null}
      </div>

      {books.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-12 items-center justify-center rounded-r-xl border border-slate-300 bg-slate-50 text-2xl">⌁</div>
          <h3 className="mt-5 text-lg font-semibold">Your shelves are empty.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Add a book here, or organise an Inbox capture as a Book.</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Add first book</button>
        </div>
      ) : visibleBooks.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No books match this view.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Change the shelf, search, or filters.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleBooks.map((book, index) => (
            <BookCard
              key={book.item.id}
              book={book}
              showQueueControls={shelf === "up-next"}
              canMoveUp={index > 0}
              canMoveDown={index < visibleBooks.length - 1}
              onOpen={() => setOpenBookId(book.item.id)}
              onMove={(direction) => moveBook(book.item.id, direction)}
            />
          ))}
        </div>
      )}

      {creating ? <BookEditor key="new-book" onCancel={() => setCreating(false)} onSave={(title, details) => saveBook(undefined, title, details)} /> : null}
      {openBook ? (
        <BookEditor
          key={openBook.item.id}
          book={openBook}
          onCancel={() => setOpenBookId(null)}
          onSave={(title, details) => saveBook(openBook, title, details)}
          onDelete={() => removeBook(openBook)}
        />
      ) : null}
    </section>
  );
}

function BookCard({
  book,
  showQueueControls,
  canMoveUp,
  canMoveDown,
  onOpen,
  onMove,
}: {
  book: BookItem;
  showQueueControls: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const score = formatBookScore(book.details);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-400">
      <button type="button" onClick={onOpen} className="block w-full text-left active:bg-slate-50">
        <Cover coverId={book.details.coverId} title={book.item.title} />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{book.item.title}</p>
            {score ? <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[0.65rem] font-bold text-white">{score}</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{book.details.author || "Unknown author"}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>{readingLabels[book.details.readingState]}</Badge>
            {book.details.priority !== "none" ? <Badge>{priorityLabels[book.details.priority]}</Badge> : null}
          </div>
        </div>
      </button>
      {showQueueControls ? (
        <div className="grid grid-cols-2 border-t border-slate-100">
          <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)} className="min-h-10 border-r border-slate-100 text-sm font-semibold text-slate-500 disabled:opacity-25" aria-label={`Move ${book.item.title} earlier`}>↑</button>
          <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)} className="min-h-10 text-sm font-semibold text-slate-500 disabled:opacity-25" aria-label={`Move ${book.item.title} later`}>↓</button>
        </div>
      ) : null}
    </article>
  );
}

function Cover({ coverId, title, previewUrl = "" }: { coverId: string; title: string; previewUrl?: string }) {
  const imageUrl = previewUrl || (coverId ? `/api/book-covers/${encodeURIComponent(coverId)}` : "");
  return imageUrl ? (
    <div
      role="img"
      aria-label={`Cover of ${title}`}
      className="aspect-[2/3] w-full bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
    />
  ) : (
    <div className="flex aspect-[2/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-5 text-center">
      <span className="line-clamp-4 text-sm font-semibold leading-5 text-slate-500">{title || "Untitled book"}</span>
    </div>
  );
}

function BookEditor({
  book,
  onCancel,
  onSave,
  onDelete,
}: {
  book?: BookItem;
  onCancel: () => void;
  onSave: (title: string, details: BookDetails) => boolean | Promise<boolean>;
  onDelete?: () => Promise<void>;
}) {
  const initialDetails = book?.details ?? createBookDetails();
  const [title, setTitle] = useState(book?.item.title ?? "");
  const [details, setDetails] = useState<BookDetails>(initialDetails);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : "", [coverFile]);

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

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Add a book title.");
      return;
    }

    setSaving(true);
    setError("");
    const previousCoverId = initialDetails.coverId;
    let uploadedCoverId = "";
    try {
      let coverId = removeExistingCover ? "" : details.coverId;
      if (coverFile) {
        uploadedCoverId = await uploadCover(coverFile);
        coverId = uploadedCoverId;
      }
      const saved = await onSave(title, { ...details, coverId });
      if (!saved) throw new Error("The book could not be saved.");
      if (previousCoverId && previousCoverId !== coverId) {
        void deleteCover(previousCoverId).catch((cause) => console.error("Could not remove replaced book cover.", cause));
      }
    } catch (cause) {
      if (uploadedCoverId) {
        void deleteCover(uploadedCoverId).catch((cleanupCause) => console.error("Could not remove unused book cover.", cleanupCause));
      }
      setError(cause instanceof Error ? cause.message : "The book could not be saved.");
      setSaving(false);
    }
  }

  async function removeBook() {
    if (!onDelete) return;
    setSaving(true);
    setError("");
    try {
      await onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The book could not be deleted.");
      setSaving(false);
    }
  }

  const aggregate = getBookScore({ ...details, ratings: { ...details.ratings, overallOverride: undefined } });
  const displayed = getBookScore(details);
  const shownCoverId = removeExistingCover ? "" : details.coverId;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <form className="min-h-screen" onSubmit={submit}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
            <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{book ? book.item.title : "New book"}</p>
            <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 pb-28 pt-6 sm:px-6 md:grid-cols-[15rem_1fr]">
          <aside>
            <div className="mx-auto max-w-[15rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Cover coverId={shownCoverId} title={title} previewUrl={previewUrl} />
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              {shownCoverId || coverFile ? "Replace cover" : "Add cover"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  setCoverFile(event.target.files?.[0] ?? null);
                  setRemoveExistingCover(false);
                }}
              />
            </label>
            {shownCoverId || coverFile ? (
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setRemoveExistingCover(true);
                }}
                className="mt-2 min-h-10 w-full rounded-xl px-4 text-sm font-semibold text-rose-600"
              >
                Remove cover
              </button>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">JPEG, PNG, WebP, or GIF. Covers stay private and follow the existing upload backup path.</p>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Book</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Title" wide><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus /></Field>
                <Field label="Author"><input className="input" value={details.author} onChange={(event) => setDetails((current) => ({ ...current, author: event.target.value }))} placeholder="Optional" /></Field>
                <Field label="Subtitle or edition note" wide><input className="input" value={details.editionNote} onChange={(event) => setDetails((current) => ({ ...current, editionNote: event.target.value }))} placeholder="Optional edition, translation, or subtitle" /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Shelf placement</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Reading state">
                  <select
                    className="input"
                    value={details.readingState}
                    onChange={(event) => {
                      const readingState = event.target.value as BookReadingState;
                      setDetails((current) => ({
                        ...current,
                        readingState,
                        finishDate: readingState === "finished" && !current.finishDate ? localDateToday() : current.finishDate,
                      }));
                    }}
                  >
                    {bookReadingStates.map((value) => <option key={value} value={value}>{readingLabels[value]}</option>)}
                  </select>
                </Field>
                <Field label="Ownership"><select className="input" value={details.ownership} onChange={(event) => setDetails((current) => ({ ...current, ownership: event.target.value as BookOwnershipState }))}>{bookOwnershipStates.map((value) => <option key={value} value={value}>{ownershipLabels[value]}</option>)}</select></Field>
                <Field label="Reading priority"><select className="input" value={details.priority} onChange={(event) => setDetails((current) => ({ ...current, priority: event.target.value as BookPriority }))}>{bookPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}</select></Field>
                <Field label="Start date"><input type="date" className="input" value={details.startDate} onChange={(event) => setDetails((current) => ({ ...current, startDate: event.target.value }))} /></Field>
                <Field label="Finish date"><input type="date" className="input" value={details.finishDate} onChange={(event) => setDetails((current) => ({ ...current, finishDate: event.target.value }))} /></Field>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">Dates are optional. Marking a book Finished defaults the finish date to today, but it can be changed or cleared.</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Rating</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">A genuine zero is different from leaving a field unrated.</p>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-2 text-right text-white">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-300">Overall</p>
                  <p className="text-xl font-bold">{displayed === undefined ? "—" : displayed.toFixed(1)}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <RatingField label="Enjoyment" value={details.ratings.enjoyment} onChange={(value) => setRating(setDetails, "enjoyment", value)} />
                <RatingField label="Impact" value={details.ratings.impact} onChange={(value) => setRating(setDetails, "impact", value)} />
                <RatingField label="Execution" value={details.ratings.execution} onChange={(value) => setRating(setDetails, "execution", value)} />
                <RatingField label="Overall override" value={details.ratings.overallOverride} onChange={(value) => setRating(setDetails, "overallOverride", value)} />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">Dimension aggregate: {aggregate === undefined ? "unrated" : aggregate.toFixed(1)}. The optional override changes the displayed result without deleting the dimensions.</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block text-sm font-semibold text-slate-900">
                Thoughts and takeaways
                <textarea className="input mt-3 min-h-48 resize-y text-sm leading-6" value={details.thoughts} onChange={(event) => setDetails((current) => ({ ...current, thoughts: event.target.value }))} placeholder="What stayed with you, what worked, what did not, or why you would recommend it…" />
              </label>
            </section>

            {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" aria-live="polite">{error}</p> : null}
            {onDelete ? <section className="border-t border-slate-200 pt-6"><button type="button" onClick={() => void removeBook()} disabled={saving} className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">Delete book</button></section> : null}
          </div>
        </main>
      </form>
    </div>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-medium text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}<span className="mt-2 block">{children}</span></label>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="text-sm font-medium text-slate-700"><span className="sr-only">{label}</span><select className="input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{label}</option>{children}</select></label>;
}

function RatingField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (value: number | undefined) => void }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<select className="input mt-2" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}><option value="">Unrated</option>{ratingValues.map((rating) => <option key={rating} value={rating}>{rating.toFixed(1)}</option>)}</select></label>;
}

function setRating(setter: Dispatch<SetStateAction<BookDetails>>, field: keyof BookRatings, value: number | undefined) {
  setter((current) => ({ ...current, ratings: { ...current.ratings, [field]: value } }));
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-semibold text-slate-600">{children}</span>;
}

function localDateToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function uploadCover(file: File) {
  const form = new FormData();
  form.set("cover", file);
  const response = await fetch("/api/book-covers", { method: "POST", body: form });
  const body = await response.json() as { cover?: { id?: string }; error?: string };
  if (!response.ok || !body.cover?.id) throw new Error(body.error || "The cover could not be uploaded.");
  return body.cover.id;
}

async function deleteCover(coverId: string) {
  const response = await fetch(`/api/book-covers/${encodeURIComponent(coverId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "The cover could not be removed.");
  }
}
