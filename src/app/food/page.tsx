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
  filterRecipes, recipeRoles, storageValues, ingredientUnits, ingredientLine, nutritionKeys, scaleRecipeIngredients,
  type RecipeRole, type StorageSuitability, type RecipeSort, type RecipeIngredient, type IngredientUnit,
  serializeRecipeDetails,
  sortRecipes,
  type RecipeDetails,
  type RecipeItem,
  type RecipeMakeAgain,
} from "@/domain/food";
import { usePersonalData } from "@/lib/personal-data";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { PrivateArtwork } from "@/components/private-artwork";

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
  const [detailId, setDetailId] = useState("");
  const [role, setRole] = useState("");
  const [tested, setTested] = useState("");
  const [fridge, setFridge] = useState("");
  const [freezer, setFreezer] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [sort, setSort] = useState<RecipeSort>("rating");
  const [view, setView] = useState<"grid" | "list">("grid");
  useEffect(() => {
    const sync = () => setDetailId(new URLSearchParams(window.location.search).get("recipe") ?? "");
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {window.cancelAnimationFrame(frame);window.removeEventListener("popstate",sync);};
  }, []);
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

  const visibleRecipes = useMemo(() => sortRecipes(filterRecipes(recipes, {
    query, tag: tagFilter, role: role ? role as RecipeRole : undefined,
    tested: tested ? tested === "yes" : undefined, fridge: fridge ? fridge as StorageSuitability : undefined,
    freezer: freezer ? freezer as StorageSuitability : undefined, maxMinutes: maxTime ? Number(maxTime) : undefined,
  }), sort), [recipes, query, tagFilter, role, tested, fridge, freezer, maxTime, sort]);
  const detail = recipes.find(recipe => recipe.item.id === detailId);
  function openDetail(id: string) {
    setDetailId(id);
    window.history.pushState(null, "", id ? "/food?recipe=" + encodeURIComponent(id) : "/food");
  }

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
    if (!window.confirm(`Delete “${recipe.item.title}”? This cannot be undone.`)) return false;
    if (recipe.details.photoId) await deletePhoto(recipe.details.photoId);
    deleteItem(recipe.item.id);
    setOpenRecipeId(null);
    openDetail("");
    return true;
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
            placeholder="Search recipes, ingredients or tags"
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

      <div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Role" className="input max-w-full w-auto" value={role} onChange={e => setRole(e.target.value)}><option value="">All roles</option>{recipeRoles.map(r => <option key={r}>{r}</option>)}</select>
        <select aria-label="Tested status" className="input w-auto" value={tested} onChange={e => setTested(e.target.value)}><option value="">All tested states</option><option value="yes">Tested</option><option value="no">Untested</option></select>
        <StorageFilter label="Fridge" value={fridge} onChange={setFridge} />
        <StorageFilter label="Freezer" value={freezer} onChange={setFreezer} />
        <select aria-label="Maximum total time" className="input w-auto" value={maxTime} onChange={e => setMaxTime(e.target.value)}><option value="">Any time</option>{[15,30,45,60,120].map(n => <option key={n} value={n}>Up to {n} min</option>)}</select>
        <select aria-label="Sort recipes" className="input w-auto" value={sort} onChange={e => setSort(e.target.value as RecipeSort)}>{[["rating","Rating"],["name","Name"],["time","Total time"],["created","Recently added"],["updated","Recently modified"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="button" className="pcc-control" onClick={() => setView(v => v === "grid" ? "list" : "grid")}>{view === "grid" ? "List view" : "Grid view"}</button>
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
        <div className={view === "grid" ? "mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" : "mt-5 grid gap-2"}>
          {visibleRecipes.map(recipe => <RecipeCard key={recipe.item.id} recipe={recipe} grid={view === "grid"} onOpen={() => openDetail(recipe.item.id)} />)}
        </div>
      )}

      {detail && !openRecipe && !creating ? <RecipeDetail key={detail.item.id} recipe={detail} onClose={() => openDetail("")} onEdit={() => setOpenRecipeId(detail.item.id)} /> : null}
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

function RecipeCard({ recipe, onOpen, grid }: { recipe: RecipeItem; onOpen: () => void; grid: boolean }) {
  const duration = recipeDurationLabel(recipe.details);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={onOpen} className="block w-full text-left active:bg-slate-50">
        {grid && recipe.details.photoId ? <RecipePhoto photoId={recipe.details.photoId} title={recipe.item.title} /> : null}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{recipe.item.title}</p>
            {recipe.details.rating !== undefined ? (
              <span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[0.65rem] font-bold text-white">{recipe.details.rating.toFixed(1)}</span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {duration ? <span>{duration}</span> : null}
            <span>{recipe.details.tested ? "Tested" : "Untested"}</span>
            <span>Freezer: {recipe.details.freezer}</span>
            {recipe.details.roles.map(role => <span key={role}>{role}</span>)}
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

function StorageFilter({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  return <select aria-label={label + " suitability"} className="input w-auto" value={value} onChange={e => onChange(e.target.value)}><option value="">Any {label.toLowerCase()}</option>{storageValues.map(v => <option key={v} value={v}>{label}: {v}</option>)}</select>;
}

function RecipeDetail({recipe, onClose, onEdit}: {recipe: RecipeItem; onClose: () => void; onEdit: () => void}) {
  const {details: d, item} = recipe;
  const [servings, setServings] = useState(String(d.servings ?? ""));
  const [checked, setChecked] = useState<number[]>([]);
  const [copyState, setCopyState] = useState("");
  const ref = useDialogFocus<HTMLDivElement>();
  const valid = !!d.servings && Number(servings) > 0 && Number(servings) <= 100;
  const rows = valid ? scaleRecipeIngredients(d, Number(servings)) : d.ingredientRows;
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={item.title} tabIndex={-1} className="pcc-editor fixed inset-0 z-[100] overflow-y-auto bg-slate-50" onKeyDown={e => {if(e.key === "Escape") onClose();}}>
    <header className="sticky top-0 z-20 flex justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3"><button className="pcc-control" onClick={onClose}>Back to recipes</button><button className="pcc-control" onClick={onEdit}>Edit recipe</button></header>
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-28">
      <h2 className="text-3xl font-semibold">{item.title}</h2>
      {d.photoId && <RecipePhoto photoId={d.photoId} title={item.title} />}
      <p className="whitespace-pre-wrap">{d.description}</p><p className="text-sm text-slate-600">{d.roles.join(" · ")} · {d.tested ? "Tested" : "Untested"}{d.rating !== undefined ? " · Rating " + d.rating + "/10" : ""}</p>
      <p className="text-sm">Prep: {d.prepMinutes ?? "Unknown"} min · Cook: {d.cookMinutes ?? "Unknown"} min · Difficulty: {d.difficulty}</p>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"><h3 className="text-lg font-semibold">Ingredients</h3>
        {d.servings ? <label className="flex items-center gap-3">Servings <input aria-label="Desired servings" className="input max-w-28" type="number" min="0.25" max="100" step="any" value={servings} onChange={e => {setServings(e.target.value);setCopyState("");}} /></label> : <p className="text-sm text-slate-500">Set base servings in Edit to enable scaling.</p>}
        <button className="pcc-control" onClick={async () => {try {await navigator.clipboard.writeText((!valid || Number(servings) === d.servings) && d.ingredients ? d.ingredients : rows.map(row => "- " + ingredientLine(row)).join("\n")); setCopyState("Copied");} catch {setCopyState("Copy failed");}}}>{copyState || "Copy ingredients"}</button>
        {rows.map((row,i) => <label key={i} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked(c => c.includes(i) ? c.filter(n => n !== i) : [...c,i])}/><span className={checked.includes(i) ? "line-through" : ""}>{ingredientLine(row)}</span></label>)}
        {!rows.length && <p>No ingredients added.</p>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-semibold">Instructions</h3><ol className="mt-3 list-decimal space-y-4 pl-6">{d.cookingSteps.map((step,i) => <li key={i} className="whitespace-pre-wrap">{step}</li>)}</ol>{!d.cookingSteps.length && <p>No steps added.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"><h3 className="text-lg font-semibold">Storage &amp; meal prep</h3><p>Fridge: {d.fridge}{d.fridgeDays !== undefined ? " · " + d.fridgeDays + " days" : ""}</p><p>Freezer: {d.freezer}{d.freezerDays !== undefined ? " · " + d.freezerDays + " days" : ""}</p>{([["Freezing",d.freezing],["Defrosting",d.defrosting],["Reheating",d.reheating],["Notes",d.storageNotes]]).map(([label,value]) => value && <div key={label}><h4 className="font-semibold">{label}</h4><p className="whitespace-pre-wrap">{value}</p></div>)}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2"><h3 className="text-lg font-semibold">Personal notes</h3><p>Last cooked: {d.lastCooked || "Unknown"}</p><p className="whitespace-pre-wrap">{d.notes || "No notes yet."}</p>{d.sourceUrl && <a className="underline" href={d.sourceUrl} target="_blank" rel="noreferrer">Original recipe</a>}</section>
      {Object.keys(d.nutrition).length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-semibold">Nutrition per serving</h3>{nutritionKeys.map(key => d.nutrition[key] !== undefined && <p key={key}>{key}: {d.nutrition[key]} {key === "calories" ? "kcal" : "g"}</p>)}</section>}
    </main>
  </div>;
}

function RecipePhoto({ photoId, title, previewUrl = "" }: { photoId: string; title: string; previewUrl?: string }) {
  const imageUrl = previewUrl || (photoId ? `/api/recipe-photos/${encodeURIComponent(photoId)}` : "");
  return <PrivateArtwork src={imageUrl} alt={`Photo of ${title}`} fallback="No photo added" landscape />;
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
  onDelete?: () => Promise<boolean>;
}) {
  const initialDetails = recipe?.details ?? createRecipeDetails();
  const dialogRef = useDialogFocus<HTMLDivElement>();
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
      if (!(await onDelete())) setSaving(false);
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

  function changeSteps(steps: string[]) {
    setDetails(c => ({...c, cookingSteps: steps, steps:steps.map((step,i) => (i+1) + ". " + step).join("\n")}));
  }
  const shownPhotoId = removeExistingPhoto ? "" : details.photoId;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={recipe ? `Edit ${recipe.item.title}` : "New recipe"} tabIndex={-1} className="pcc-editor pcc-recipe-editor fixed inset-0 z-[100] overflow-y-auto bg-slate-50">
      <form className="min-h-screen" onSubmit={submit}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
            <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{recipe ? recipe.item.title : "New recipe"}</p>
            <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-28 pt-6 sm:px-6 md:grid-cols-[18rem_1fr]">
          <h2>{recipe ? recipe.item.title : "New recipe"}</h2>
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
                <Field label="Description" wide><textarea className="input" value={details.description} onChange={e => setDetails(c => ({...c, description:e.target.value}))}/></Field>
                <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Recipe roles (optional)</legend><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{recipeRoles.map(role => <label key={role} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={details.roles.includes(role)} onChange={() => setDetails(c => ({...c, roles:c.roles.includes(role) ? c.roles.filter(r => r !== role) : [...c.roles,role]}))}/>{role}</label>)}</div></fieldset>
                <Field label="Difficulty"><select className="input" value={details.difficulty} onChange={e => setDetails(c => ({...c, difficulty:e.target.value as RecipeDetails["difficulty"]}))}>{["unknown","easy","medium","hard"].map(v => <option key={v}>{v}</option>)}</select></Field>
                <Field label="Tested"><select className="input" value={details.tested ? "yes" : "no"} onChange={e => setDetails(c => ({...c,tested:e.target.value === "yes"}))}><option value="no">Untested</option><option value="yes">Tested</option></select></Field>
                <Field label="Last cooked"><input className="input" type="date" value={details.lastCooked ?? ""} onChange={e => setDetails(c => ({...c,lastCooked:e.target.value || undefined}))}/></Field>
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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex justify-between gap-2"><h3 className="font-semibold">Ingredients</h3><button type="button" className="pcc-control" onClick={() => void copyIngredients()} disabled={!details.ingredients}>{copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy ingredients"}</button></div>
              <p className="text-xs text-slate-500">Existing free-text lines remain unscaled until you separate the quantity and unit.</p>
              <IngredientEditor rows={details.ingredientRows} onChange={rows => setDetails(c => ({...c, ingredientRows: rows, ingredients:rows.map(row => "- " + ingredientLine(row)).join("\n")}))} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-semibold">Cooking steps</h3>
              {details.cookingSteps.map((step,i) => <div key={i} className="space-y-2"><label className="block text-sm">Step {i+1}<textarea className="input mt-1" value={step} onChange={e => changeSteps(details.cookingSteps.map((v,j) => i === j ? e.target.value : v))}/></label><RowActions index={i} length={details.cookingSteps.length} onMove={offset => changeSteps(moveRow(details.cookingSteps,i,offset))} onRemove={() => changeSteps(details.cookingSteps.filter((_,j) => i !== j))}/></div>)}
              <button type="button" className="pcc-control" onClick={() => changeSteps([...details.cookingSteps,""])}>Add step</button>
            </section>
            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold">Storage &amp; meal prep (optional)</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["fridge","freezer"] as const).map(key => <div key={key} className="space-y-2"><Field label={key + " suitability"}><select className="input" value={details[key]} onChange={e => setDetails(c => ({...c,[key]:e.target.value as StorageSuitability}))}>{storageValues.map(v => <option key={v}>{v}</option>)}</select></Field><Field label={key + " storage days"}><input className="input" type="number" min="1" max={key === "fridge" ? 365 : 3650} value={details[key === "fridge" ? "fridgeDays" : "freezerDays"] ?? ""} onChange={e => setDetails(c => ({...c,[key === "fridge" ? "fridgeDays" : "freezerDays"]:numberOrUndefined(e.target.value)}))}/></Field></div>)}
              {(["freezing","defrosting","reheating","storageNotes"] as const).map(key => <Field key={key} label={key} wide><textarea className="input" value={details[key]} onChange={e => setDetails(c => ({...c,[key]:e.target.value}))}/></Field>)}
            </div></details>
            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold">Nutrition per serving (optional)</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{nutritionKeys.map(key => <Field key={key} label={key + (key === "calories" ? " (kcal)" : " (g)")}><input type="number" min="0" step="any" max="1000000000" className="input" value={details.nutrition[key] ?? ""} onChange={e => setDetails(c => ({...c,nutrition:{...c.nutrition,[key]:numberOrUndefined(e.target.value)}}))}/></Field>)}</div></details>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Cooking notes</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Keep the adjustments that make the recipe yours: quantities, substitutions, heat, timing, or what to change next time.</p>
              <textarea aria-label="Cooking notes" className="input mt-4 min-h-40 resize-y text-sm leading-6" value={details.notes} onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes after cooking it…" />
            </section>

            {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" aria-live="polite">{error}</p> : null}
            {onDelete ? <section className="border-t border-slate-200 pt-6"><button type="button" onClick={() => void removeRecipe()} disabled={saving} className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">Delete recipe</button></section> : null}
          </div>
        </main>
      </form>
    </div>
  );
}

function moveRow<T,>(rows: T[], index: number, offset: number) {
  const next = [...rows], target = index + offset;
  if (target >= 0 && target < next.length) [next[index],next[target]] = [next[target],next[index]];
  return next;
}
function RowActions({index,length,onMove,onRemove}: {index:number;length:number;onMove:(offset:number)=>void;onRemove:()=>void}) {
  return <div className="flex flex-wrap gap-2"><button type="button" className="pcc-control" disabled={index === 0} onClick={() => onMove(-1)}>Move up</button><button type="button" className="pcc-control" disabled={index === length-1} onClick={() => onMove(1)}>Move down</button><button type="button" className="pcc-control text-rose-700" onClick={onRemove}>Remove</button></div>;
}
function IngredientEditor({rows,onChange}: {rows:RecipeIngredient[];onChange:(rows:RecipeIngredient[])=>void}) {
  function update(index:number, patch:Partial<RecipeIngredient>) {onChange(rows.map((row,i) => i === index ? {...row,...patch} : row));}
  return <div className="space-y-4">{rows.map((row,i) => <fieldset key={i} className="rounded-xl border border-slate-200 p-3 space-y-2"><legend className="text-sm">Ingredient {i+1}</legend>
    <Field label="Name"><input className="input" value={row.name} required onChange={e => update(i,{name:e.target.value})}/></Field>
    <div className="grid grid-cols-2 gap-2"><Field label="Quantity"><input className="input" type="number" min="0" max="1000000000" step="any" value={row.quantity ?? ""} onChange={e => update(i,{quantity:numberOrUndefined(e.target.value)})}/></Field><Field label="Unit"><select className="input" value={row.unit} onChange={e => update(i,{unit:e.target.value as IngredientUnit})}>{ingredientUnits.map(v => <option key={v} value={v}>{v || "None"}</option>)}</select></Field></div>
    <Field label="Preparation notes"><input className="input" value={row.notes} onChange={e => update(i,{notes:e.target.value})}/></Field>
    <div className="flex flex-wrap gap-4"><label><input type="checkbox" checked={row.optional} onChange={e => update(i,{optional:e.target.checked})}/> Optional</label><label><input type="checkbox" checked={row.scalable} onChange={e => update(i,{scalable:e.target.checked})}/> Scale quantity</label></div>
    <RowActions index={i} length={rows.length} onMove={offset => onChange(moveRow(rows,i,offset))} onRemove={() => onChange(rows.filter((_,j) => j !== i))}/>
  </fieldset>)}<button type="button" className="pcc-control" onClick={() => onChange([...rows,{name:"",unit:"",notes:"",optional:false,scalable:true}])}>Add ingredient</button></div>;
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
