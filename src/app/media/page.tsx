"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createMediaDetails,
  getMediaItems,
  mediaMatchesQuery,
  mediaProgressLabel,
  normalizeMediaDetails,
  serializeMediaDetails,
  sortMediaItems,
  type MediaDetails,
  type MediaItem,
  type MediaStatus,
  type MediaType,
} from "@/domain/media";
import { usePersonalData } from "@/lib/personal-data";

const ratingValues = Array.from({ length: 21 }, (_, index) => index / 2);
const statusLabels: Record<MediaStatus, string> = {
  wishlist: "Wishlist",
  watching: "Watching",
  completed: "Completed",
  dropped: "Dropped",
};
const typeLabels: Record<MediaType, string> = {
  film: "Film",
  series: "Series",
};
type MediaView = "library" | MediaStatus | MediaType;

const viewLabels: Record<MediaView, string> = {
  library: "My media",
  watching: "Watching",
  completed: "Completed",
  wishlist: "Wishlist",
  dropped: "Dropped",
  film: "Films",
  series: "Series",
};

export default function MediaPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const media = useMemo(() => getMediaItems(items), [items]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<MediaView>("library");
  const [creating, setCreating] = useState(false);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const openMedia = media.find((entry) => entry.item.id === openMediaId);

  const visibleMedia = useMemo(() => sortMediaItems(media).filter((entry) => {
    if (!mediaMatchesQuery(entry, query)) return false;
    if (view === "library") return entry.details.status !== "wishlist";
    if (view === "film" || view === "series") return entry.details.type === view;
    return entry.details.status === view;
  }), [media, query, view]);

  function saveMedia(existing: MediaItem | undefined, title: string, details: MediaDetails) {
    const description = serializeMediaDetails(details);
    if (existing) {
      updateItem(existing.item.id, { title: title.trim(), description });
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
    setOpenMediaId(null);
    return true;
  }

  async function removeMedia(entry: MediaItem) {
    if (!window.confirm(`Delete “${entry.item.title}”? This cannot be undone.`)) return;
    if (entry.details.posterId) await deletePoster(entry.details.posterId);
    deleteItem(entry.item.id);
    setOpenMediaId(null);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{media.length} {media.length === 1 ? "title" : "titles"}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Media</h2>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white active:scale-[0.99]">
          New media
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label>
          <span className="sr-only">Search media</span>
          <input
            type="search"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search films and series"
          />
        </label>
        <label>
          <span className="sr-only">Media view</span>
          <select className="input" value={view} onChange={(event) => setView(event.target.value as MediaView)}>
            {(Object.entries(viewLabels) as [MediaView, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {media.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-2xl">🎬</div>
          <h3 className="mt-5 text-lg font-semibold">Your media library is empty.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Add a film or series you are watching, finished, dropped, or want to remember.</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Add first title</button>
        </div>
      ) : visibleMedia.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No media match.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Change the search or selected view.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visibleMedia.map((entry) => (
            <MediaCard key={entry.item.id} media={entry} onOpen={() => setOpenMediaId(entry.item.id)} />
          ))}
        </div>
      )}

      {creating ? (
        <MediaEditor
          key="new-media"
          onCancel={() => setCreating(false)}
          onSave={(title, details) => saveMedia(undefined, title, details)}
        />
      ) : null}
      {openMedia ? (
        <MediaEditor
          key={openMedia.item.id}
          media={openMedia}
          onCancel={() => setOpenMediaId(null)}
          onSave={(title, details) => saveMedia(openMedia, title, details)}
          onDelete={() => removeMedia(openMedia)}
        />
      ) : null}
    </section>
  );
}

function MediaCard({ media, onOpen }: { media: MediaItem; onOpen: () => void }) {
  const progress = mediaProgressLabel(media.details);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-400">
      <button type="button" onClick={onOpen} className="block w-full text-left active:bg-slate-50">
        <MediaPoster posterId={media.details.posterId} title={media.item.title} />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{media.item.title}</p>
            {media.details.rating !== undefined ? (
              <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[0.65rem] font-bold text-white">{media.details.rating.toFixed(1)}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{typeLabels[media.details.type]}</Badge>
            <Badge>{statusLabels[media.details.status]}</Badge>
          </div>
          {progress ? <p className="mt-2 text-xs font-medium text-slate-500">{progress}</p> : null}
        </div>
      </button>
    </article>
  );
}

function MediaPoster({ posterId, title, previewUrl = "" }: { posterId: string; title: string; previewUrl?: string }) {
  const imageUrl = previewUrl || (posterId ? `/api/media-posters/${encodeURIComponent(posterId)}` : "");
  return imageUrl ? (
    <div
      role="img"
      aria-label={`Poster for ${title}`}
      className="aspect-[2/3] w-full bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
    />
  ) : (
    <div className="flex aspect-[2/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-5 text-center">
      <span className="line-clamp-4 text-sm font-semibold leading-5 text-slate-500">{title || "Untitled media"}</span>
    </div>
  );
}

function MediaEditor({
  media,
  onCancel,
  onSave,
  onDelete,
}: {
  media?: MediaItem;
  onCancel: () => void;
  onSave: (title: string, details: MediaDetails) => boolean | Promise<boolean>;
  onDelete?: () => Promise<void>;
}) {
  const initialDetails = media?.details ?? createMediaDetails();
  const [title, setTitle] = useState(media?.item.title ?? "");
  const [details, setDetails] = useState<MediaDetails>(initialDetails);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [removeExistingPoster, setRemoveExistingPoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = useMemo(() => posterFile ? URL.createObjectURL(posterFile) : "", [posterFile]);

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
      setError("Add a title.");
      return;
    }

    setSaving(true);
    setError("");
    const previousPosterId = initialDetails.posterId;
    let uploadedPosterId = "";
    try {
      let posterId = removeExistingPoster ? "" : details.posterId;
      if (posterFile) {
        uploadedPosterId = await uploadPoster(posterFile);
        posterId = uploadedPosterId;
      }
      const normalized = normalizeMediaDetails({ ...details, posterId });
      const saved = await onSave(title, normalized);
      if (!saved) throw new Error("The media record could not be saved.");
      if (previousPosterId && previousPosterId !== posterId) {
        void deletePoster(previousPosterId).catch((cause) => console.error("Could not remove replaced media poster.", cause));
      }
    } catch (cause) {
      if (uploadedPosterId) {
        void deletePoster(uploadedPosterId).catch((cleanupCause) => console.error("Could not remove unused media poster.", cleanupCause));
      }
      setError(cause instanceof Error ? cause.message : "The media record could not be saved.");
      setSaving(false);
    }
  }

  async function removeMedia() {
    if (!onDelete) return;
    setSaving(true);
    setError("");
    try {
      await onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The media record could not be deleted.");
      setSaving(false);
    }
  }

  const shownPosterId = removeExistingPoster ? "" : details.posterId;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <form className="min-h-screen" onSubmit={submit}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
            <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{media ? media.item.title : "New media"}</p>
            <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-28 pt-6 sm:px-6 md:grid-cols-[16rem_1fr]">
          <aside>
            <div className="mx-auto max-w-[16rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <MediaPoster posterId={shownPosterId} title={title} previewUrl={previewUrl} />
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              {shownPosterId || posterFile ? "Replace poster" : "Add poster"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  setPosterFile(event.target.files?.[0] ?? null);
                  setRemoveExistingPoster(false);
                }}
              />
            </label>
            {shownPosterId || posterFile ? (
              <button type="button" onClick={() => { setPosterFile(null); setRemoveExistingPoster(true); }} className="mt-2 min-h-10 w-full rounded-xl px-4 text-sm font-semibold text-rose-600">
                Remove poster
              </button>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">Optional. JPEG, PNG, WebP, or GIF up to 10 MB.</p>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Title and status</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Title" wide><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus /></Field>
                <Field label="Type">
                  <select className="input" value={details.type} onChange={(event) => setDetails((current) => ({ ...current, type: event.target.value as MediaType }))}>
                    <option value="film">Film</option>
                    <option value="series">Series</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className="input" value={details.status} onChange={(event) => setDetails((current) => ({ ...current, status: event.target.value as MediaStatus }))}>
                    <option value="wishlist">Wishlist</option>
                    <option value="watching">Watching</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </Field>
                <Field label="Rating">
                  <select className="input" value={details.rating ?? ""} onChange={(event) => setDetails((current) => ({ ...current, rating: event.target.value === "" ? undefined : Number(event.target.value) }))}>
                    <option value="">Unrated</option>
                    {ratingValues.map((value) => <option key={value} value={value}>{value.toFixed(1)}</option>)}
                  </select>
                </Field>
                <div aria-hidden="true" className="hidden sm:block" />
                <Field label="Start date"><input type="date" className="input" value={details.startDate} onChange={(event) => setDetails((current) => ({ ...current, startDate: event.target.value }))} /></Field>
                <Field label="Finish date"><input type="date" className="input" value={details.finishDate} onChange={(event) => setDetails((current) => ({ ...current, finishDate: event.target.value }))} /></Field>
              </div>
            </section>

            {details.type === "series" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Series progress</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Keep only the lightweight position you want to resume from.</p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Current season"><input type="number" min="1" max="9999" className="input" value={details.currentSeason ?? ""} onChange={(event) => setDetails((current) => ({ ...current, currentSeason: numberOrUndefined(event.target.value) }))} placeholder="Optional" /></Field>
                  <Field label="Current episode"><input type="number" min="1" max="9999" className="input" value={details.currentEpisode ?? ""} onChange={(event) => setDetails((current) => ({ ...current, currentEpisode: numberOrUndefined(event.target.value) }))} placeholder="Optional" /></Field>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Thoughts</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Optional. Keep what you liked, disliked, or would want a future recommendation to understand.</p>
              <textarea className="input mt-4 min-h-52 resize-y text-sm leading-6" value={details.thoughts} onChange={(event) => setDetails((current) => ({ ...current, thoughts: event.target.value }))} placeholder="What stood out, and why?" />
            </section>

            {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" aria-live="polite">{error}</p> : null}
            {onDelete ? <section className="border-t border-slate-200 pt-6"><button type="button" onClick={() => void removeMedia()} disabled={saving} className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">Delete media</button></section> : null}
          </div>
        </main>
      </form>
    </div>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-medium text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}<span className="mt-2 block">{children}</span></label>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-semibold text-slate-600">{children}</span>;
}

function numberOrUndefined(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function uploadPoster(file: File) {
  const form = new FormData();
  form.set("poster", file);
  const response = await fetch("/api/media-posters", { method: "POST", body: form });
  const body = await response.json() as { poster?: { id?: string }; error?: string };
  if (!response.ok || !body.poster?.id) throw new Error(body.error || "The poster could not be uploaded.");
  return body.poster.id;
}

async function deletePoster(posterId: string) {
  const response = await fetch(`/api/media-posters/${encodeURIComponent(posterId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "The poster could not be removed.");
  }
}
