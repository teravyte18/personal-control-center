"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createRecipeDetails,
  getRecipes,
  normalizeRecipeDetails,
  recipeDurationLabel,
  recipeMatchesQuery,
  serializeRecipeDetails,
  sortRecipes,
  type RecipeDetails,
  type RecipeItem,
  type RecipeMakeAgain,
} from "@/domain/food";
import { usePersonalData } from "@/lib/personal-data";

const ratingValues = Array.from({ length: 21 }, (_, index) => index / 2);
const makeAgainLabels: Record<RecipeMakeAgain, string> = {
  unspecified: "Not decided",
  yes: "Yes",
  no: "No",
};

export default function FoodPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const recipes = useMemo(() => getRecipes(items), [items]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const openRecipe = recipes.find((recipe) => recipe.item.id === openRecipeId);

  const tags = useMemo(() => {
    const values = new Map<string, string>();
    for (const recipe of recipes) {
      for (const tag of recipe.details.tags) {
        const key = tag.toLocaleLowerCase();
        if (!values.has(key)) values.set(key, tag);
      }
    }
    return [...values.values()].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  }, [recipes]);

  const visibleRecipes = useMemo(() => sortRecipes(recipes).filter((recipe) => {
    if (!recipeMatchesQuery(recipe, query)) return false;
    if (tagFilter && !recipe.details.tags.some((tag) => tag.toLocaleLowerCase() === tagFilter.toLocaleLowerCase())) return false;
    return true;
  }), [recipes, query, tagFilter]);

  function saveRecipe(recipe: RecipeItem | undefined, title: string, details: RecipeDetails) {
    const description = serializeRecipeDetails(details);
    if (recipe) {
      updateItem(recipe.item.id, { title: title.trim(), description });
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
    setOpenRecipeId(null);
    return true;
  }

  async function removeRecipe(recipe: RecipeItem) {
    if (!window.confirm(`Delete “${recipe.item.title}”? This cannot be undone.`)) return;
    if (recipe.details.photoId) await deletePhoto(recipe.details.photoId);
    deleteItem(recipe.item.id);
    setOpenRecipeId(null);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Food</h2>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white active:scale-[0.99]">
          New recipe
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label>
          <span className="sr-only">Search recipes</span>
          <input
            type="search"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes or tags"
          />
        </label>
        <label>
          <span className="sr-only">Filter by tag</span>
          <select className="input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="">All tags</option>
            {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </label>
      </div>

      {recipes.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-2xl">🍳</div>
          <h3 className="mt-5 text-lg font-semibold">Your recipe book is empty.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Start with something you already cook or one recipe you want to try.</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Add first recipe</button>
        </div>
      ) : visibleRecipes.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-lg font-semibold">No recipes match.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Change the search or tag filter.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleRecipes.map((recipe) => (
            <RecipeCard key={recipe.item.id} recipe={recipe} onOpen={() => setOpenRecipeId(recipe.item.id)} />
          ))}
        </div>
      )}

      {creating ? (
        <RecipeEditor
          key="new-recipe"
          onCancel={() => setCreating(false)}
          onSave={(title, details) => saveRecipe(undefined, title, details)}
        />
      ) : null}
      {openRecipe ? (
        <RecipeEditor
          key={openRecipe.item.id}
          recipe={openRecipe}
          onCancel={() => setOpenRecipeId(null)}
          onSave={(title, details) => saveRecipe(openRecipe, title, details)}
          onDelete={() => removeRecipe(openRecipe)}
        />
      ) : null}
    </section>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: RecipeItem; onOpen: () => void }) {
  const duration = recipeDurationLabel(recipe.details);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-400">
      <button type="button" onClick={onOpen} className="block w-full text-left active:bg-slate-50">
        <RecipePhoto photoId={recipe.details.photoId} title={recipe.item.title} />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{recipe.item.title}</p>
            {recipe.details.rating !== undefined ? (
              <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[0.65rem] font-bold text-white">{recipe.details.rating.toFixed(1)}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {duration ? <span>{duration}</span> : null}
            {recipe.details.servings ? <span>{recipe.details.servings} servings</span> : null}
            {recipe.details.makeAgain === "yes" ? <span>Make again</span> : null}
          </div>
          {recipe.details.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.details.tags.slice(0, 3).map((tag) => <Badge key={tag}>{tag}</Badge>)}
              {recipe.details.tags.length > 3 ? <Badge>+{recipe.details.tags.length - 3}</Badge> : null}
            </div>
          ) : null}
        </div>
      </button>
    </article>
  );
}

function RecipePhoto({ photoId, title, previewUrl = "" }: { photoId: string; title: string; previewUrl?: string }) {
  const imageUrl = previewUrl || (photoId ? `/api/recipe-photos/${encodeURIComponent(photoId)}` : "");
  return imageUrl ? (
    <div
      role="img"
      aria-label={`Photo of ${title}`}
      className="aspect-[4/3] w-full bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
    />
  ) : (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-5 text-center">
      <span className="line-clamp-3 text-sm font-semibold leading-5 text-slate-500">{title || "Untitled recipe"}</span>
    </div>
  );
}

function RecipeEditor({
  recipe,
  onCancel,
  onSave,
  onDelete,
}: {
  recipe?: RecipeItem;
  onCancel: () => void;
  onSave: (title: string, details: RecipeDetails) => boolean | Promise<boolean>;
  onDelete?: () => Promise<void>;
}) {
  const initialDetails = recipe?.details ?? createRecipeDetails();
  const [title, setTitle] = useState(recipe?.item.title ?? "");
  const [details, setDetails] = useState<RecipeDetails>(initialDetails);
  const [tagsText, setTagsText] = useState(initialDetails.tags.join(", "));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const previewUrl = useMemo(() => photoFile ? URL.createObjectURL(photoFile) : "", [photoFile]);

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
      setError("Add a recipe name.");
      return;
    }

    setSaving(true);
    setError("");
    const previousPhotoId = initialDetails.photoId;
    let uploadedPhotoId = "";
    try {
      let photoId = removeExistingPhoto ? "" : details.photoId;
      if (photoFile) {
        uploadedPhotoId = await uploadPhoto(photoFile);
        photoId = uploadedPhotoId;
      }
      const normalized = normalizeRecipeDetails({
        ...details,
        tags: parseTags(tagsText),
        photoId,
      });
      const saved = await onSave(title, normalized);
      if (!saved) throw new Error("The recipe could not be saved.");
      if (previousPhotoId && previousPhotoId !== photoId) {
        void deletePhoto(previousPhotoId).catch((cause) => console.error("Could not remove replaced recipe photo.", cause));
      }
    } catch (cause) {
      if (uploadedPhotoId) {
        void deletePhoto(uploadedPhotoId).catch((cleanupCause) => console.error("Could not remove unused recipe photo.", cleanupCause));
      }
      setError(cause instanceof Error ? cause.message : "The recipe could not be saved.");
      setSaving(false);
    }
  }

  async function removeRecipe() {
    if (!onDelete) return;
    setSaving(true);
    setError("");
    try {
      await onDelete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The recipe could not be deleted.");
      setSaving(false);
    }
  }

  async function copyIngredients() {
    if (!details.ingredients) return;
    try {
      await navigator.clipboard.writeText(details.ingredients);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
    }
  }

  const shownPhotoId = removeExistingPhoto ? "" : details.photoId;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <form className="min-h-screen" onSubmit={submit}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
            <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{recipe ? recipe.item.title : "New recipe"}</p>
            <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-28 pt-6 sm:px-6 md:grid-cols-[18rem_1fr]">
          <aside>
            <div className="mx-auto max-w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <RecipePhoto photoId={shownPhotoId} title={title} previewUrl={previewUrl} />
            </div>
            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
              {shownPhotoId || photoFile ? "Replace photo" : "Add photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  setPhotoFile(event.target.files?.[0] ?? null);
                  setRemoveExistingPhoto(false);
                }}
              />
            </label>
            {shownPhotoId || photoFile ? (
              <button type="button" onClick={() => { setPhotoFile(null); setRemoveExistingPhoto(true); }} className="mt-2 min-h-10 w-full rounded-xl px-4 text-sm font-semibold text-rose-600">
                Remove photo
              </button>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-slate-500">Optional. A photo after you have made the dish is enough. JPEG, PNG, WebP, or GIF up to 10 MB.</p>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Recipe</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" wide><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus /></Field>
                <Field label="Source link" wide>
                  <div className="flex gap-2">
                    <input type="url" className="input min-w-0 flex-1" value={details.sourceUrl} onChange={(event) => setDetails((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="https://…" />
                    {isHttpUrl(details.sourceUrl) ? <a href={details.sourceUrl} target="_blank" rel="noreferrer" className="flex min-h-11 shrink-0 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700">Open</a> : null}
                  </div>
                </Field>
                <Field label="Tags" wide><input className="input" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="quick, chicken, rice, freezer-friendly" /></Field>
                <Field label="Servings"><input type="number" min="1" max="100" className="input" value={details.servings ?? ""} onChange={(event) => setDetails((current) => ({ ...current, servings: numberOrUndefined(event.target.value) }))} placeholder="Optional" /></Field>
                <Field label="Rating"><select className="input" value={details.rating ?? ""} onChange={(event) => setDetails((current) => ({ ...current, rating: event.target.value === "" ? undefined : Number(event.target.value) }))}><option value="">Unrated</option>{ratingValues.map((value) => <option key={value} value={value}>{value.toFixed(1)}</option>)}</select></Field>
                <Field label="Prep time (min)"><input type="number" min="1" max="1440" className="input" value={details.prepMinutes ?? ""} onChange={(event) => setDetails((current) => ({ ...current, prepMinutes: numberOrUndefined(event.target.value) }))} placeholder="Optional" /></Field>
                <Field label="Cook time (min)"><input type="number" min="1" max="1440" className="input" value={details.cookMinutes ?? ""} onChange={(event) => setDetails((current) => ({ ...current, cookMinutes: numberOrUndefined(event.target.value) }))} placeholder="Optional" /></Field>
                <Field label="Make again?"><select className="input" value={details.makeAgain} onChange={(event) => setDetails((current) => ({ ...current, makeAgain: event.target.value as RecipeMakeAgain }))}>{Object.entries(makeAgainLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Ingredients</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Write one item per line with <code>- </code> if you want it to paste directly as a Notes shopping list.</p>
                </div>
                <button type="button" onClick={() => void copyIngredients()} disabled={!details.ingredients} className="min-h-10 shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">
                  {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy ingredients"}
                </button>
              </div>
              <textarea
                className="input mt-4 min-h-52 resize-y font-mono text-sm leading-6"
                value={details.ingredients}
                onChange={(event) => { setDetails((current) => ({ ...current, ingredients: event.target.value })); setCopyState("idle"); }}
                placeholder={"- 500 g chicken\n- 2 cloves garlic\n- 1 onion"}
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Steps</h3>
              <textarea className="input mt-4 min-h-64 resize-y text-sm leading-6" value={details.steps} onChange={(event) => setDetails((current) => ({ ...current, steps: event.target.value }))} placeholder={"1. Prepare the ingredients.\n2. Cook…"} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Cooking notes</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Keep the adjustments that make the recipe yours: quantities, substitutions, heat, timing, or what to change next time.</p>
              <textarea className="input mt-4 min-h-40 resize-y text-sm leading-6" value={details.notes} onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes after cooking it…" />
            </section>

            {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" aria-live="polite">{error}</p> : null}
            {onDelete ? <section className="border-t border-slate-200 pt-6"><button type="button" onClick={() => void removeRecipe()} disabled={saving} className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">Delete recipe</button></section> : null}
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

function parseTags(value: string) {
  return value.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean);
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadPhoto(file: File) {
  const form = new FormData();
  form.set("photo", file);
  const response = await fetch("/api/recipe-photos", { method: "POST", body: form });
  const body = await response.json() as { photo?: { id?: string }; error?: string };
  if (!response.ok || !body.photo?.id) throw new Error(body.error || "The photo could not be uploaded.");
  return body.photo.id;
}

async function deletePhoto(photoId: string) {
  const response = await fetch(`/api/recipe-photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "The photo could not be removed.");
  }
}
