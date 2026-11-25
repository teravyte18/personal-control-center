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

const roleLabels: Record<RecipeRole, string> = {
  protein: "Protein", "carbohydrate side": "Carb side", "vegetable side": "Vegetable side",
  "complete dish": "Complete dish", "sauce and dressing": "Sauce / dressing",
  breakfast: "Breakfast", snack: "Snack", dessert: "Dessert",
};
const roleCategories: Array<{value: RecipeRole; label: string}> = [
  {value:"protein",label:"Proteins"}, {value:"carbohydrate side",label:"Carbs"},
  {value:"vegetable side",label:"Vegetables"}, {value:"complete dish",label:"Complete dishes"},
  {value:"sauce and dressing",label:"Sauces"}, {value:"breakfast",label:"Breakfast"},
  {value:"snack",label:"Snacks"}, {value:"dessert",label:"Desserts"},
];

export default function FoodPage() {
  const { items, addItem, updateItem, deleteItem } = usePersonalData();
  const recipes = useMemo(() => getRecipes(items), [items]);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState("");
  const [role, setRole] = useState<RecipeRole | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    query, tag: tagFilter, role: role || undefined,
    tested: tested ? tested === "yes" : undefined, fridge: fridge ? fridge as StorageSuitability : undefined,
    freezer: freezer ? freezer as StorageSuitability : undefined, maxMinutes: maxTime ? Number(maxTime) : undefined,
  }), sort), [recipes, query, tagFilter, role, tested, fridge, freezer, maxTime, sort]);
  const detail = recipes.find(recipe => recipe.item.id === detailId);
  const activeFilters = [tagFilter, tested, fridge, freezer, maxTime, sort !== "rating"].filter(Boolean).length;
  function clearAdvancedFilters() {
    setTagFilter(""); setTested(""); setFridge(""); setFreezer(""); setMaxTime(""); setSort("rating");
  }
  function clearSearch() {
    setQuery(""); setRole(""); clearAdvancedFilters();
  }
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
    <section className="pcc-cookbook">
      <header className="pcc-cookbook-header">
        <h2>Recipes</h2>
        <button type="button" onClick={() => setCreating(true)} className="pcc-control">
          <RecipeIcon name="plus" /> New recipe
        </button>
      </header>

      <label className="pcc-cookbook-search">
        <span className="sr-only">Search recipes</span>
        <RecipeIcon name="search" />
        <input type="search" className="input" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search recipes, ingredients, tags…" />
      </label>

      <div className="pcc-cookbook-categories" role="group" aria-label="Recipe categories">
        <button type="button" aria-pressed={!role} onClick={() => setRole("")}>All recipes</button>
        {roleCategories.map(category => (
          <button type="button" key={category.value} aria-pressed={role === category.value}
            onClick={() => setRole(category.value)}>{category.label}</button>
        ))}
      </div>

      <div className="pcc-cookbook-toolbar">
        <div className="min-w-0">
          <h3>{role ? roleCategories.find(category => category.value === role)?.label : "Your cookbook"}</h3>
          <p className="pcc-record-meta" aria-live="polite">{visibleRecipes.length}{visibleRecipes.length !== recipes.length ? " of " + recipes.length : ""} {recipes.length === 1 ? "recipe" : "recipes"}</p>
        </div>
        <div className="pcc-cookbook-actions">
          <button type="button" className="pcc-control pcc-cookbook-icon-button" aria-expanded={filtersOpen}
            aria-controls="cookbook-advanced-filters" aria-label={activeFilters ? "Filters, " + activeFilters + " active" : "Filters"}
            onClick={() => setFiltersOpen(open => !open)} title="Filters">
            <RecipeIcon name="filter" />{activeFilters > 0 && <span className="pcc-cookbook-filter-count">{activeFilters}</span>}
          </button>
          <button type="button" className="pcc-control pcc-cookbook-icon-button" aria-label={view === "grid" ? "Switch to list view" : "Switch to grid view"}
            onClick={() => setView(current => current === "grid" ? "list" : "grid")} title={view === "grid" ? "List view" : "Grid view"}>
            <RecipeIcon name={view === "grid" ? "list" : "grid"} />
          </button>
        </div>
      </div>

      <div id="cookbook-advanced-filters" hidden={!filtersOpen} className="pcc-cookbook-filters">
        <div className="pcc-cookbook-filter-grid">
          <Field label="Tag"><select className="input" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
            <option value="">All tags</option>{tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select></Field>
          <Field label="Tested status"><select className="input" value={tested} onChange={e => setTested(e.target.value)}>
            <option value="">All recipes</option><option value="yes">Tested</option><option value="no">To try</option>
          </select></Field>
          <Field label="Fridge"><StorageFilter label="Fridge" value={fridge} onChange={setFridge} /></Field>
          <Field label="Freezer"><StorageFilter label="Freezer" value={freezer} onChange={setFreezer} /></Field>
          <Field label="Total time"><select className="input" value={maxTime} onChange={e => setMaxTime(e.target.value)}>
            <option value="">Any time</option>{[15,30,45,60,120].map(n => <option key={n} value={n}>Up to {n} min</option>)}
          </select></Field>
          <Field label="Sort by"><select className="input" value={sort} onChange={e => setSort(e.target.value as RecipeSort)}>
            {[["rating","Rating"],["name","Name"],["time","Total time"],["created","Recently added"],["updated","Recently modified"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select></Field>
        </div>
        <div className="pcc-cookbook-filter-footer">
          <button type="button" className="pcc-control" disabled={!activeFilters} onClick={clearAdvancedFilters}>Reset filters</button>
          <button type="button" className="pcc-control" onClick={() => setFiltersOpen(false)}>Done</button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="pcc-cookbook-empty">
          <RecipeIcon name="book" />
          <h3>Your cookbook is empty</h3>
          <p>Save a protein, a side, a sauce or a complete dish.</p>
          <button type="button" className="pcc-control" onClick={() => setCreating(true)}>Add first recipe</button>
        </div>
      ) : visibleRecipes.length === 0 ? (
        <div className="pcc-cookbook-empty">
          <h3>No recipes match</h3>
          <p>Try a different category or clear your search and filters.</p>
          <button type="button" className="pcc-control" onClick={clearSearch}>Clear search &amp; filters</button>
        </div>
      ) : (
        <div className={view === "grid" ? "pcc-cookbook-grid" : "pcc-cookbook-list"}>
          {visibleRecipes.map(recipe => <RecipeCard key={recipe.item.id} recipe={recipe} grid={view === "grid"} onOpen={() => openDetail(recipe.item.id)} />)}
        </div>
      )}

      {detail && !openRecipe && !creating ? <RecipeDetail key={detail.item.id} recipe={detail} onClose={() => openDetail("")} onEdit={() => setOpenRecipeId(detail.item.id)} /> : null}
      {creating ? (
        <RecipeEditor
          key="new-recipe"
          initialRole={role || undefined}
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

function RecipeIcon({name}: {name: "plus" | "search" | "filter" | "grid" | "list" | "check" | "try" | "snow" | "star" | "book"}) {
  const paths: Record<typeof name, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z"/>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.1M4 12h.1M4 18h.1"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    try: <><path d="M9 3h6M10 3v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/></>,
    snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3"/>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>,
    book: <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/></>,
  };
  return <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function RecipeCard({ recipe, onOpen, grid }: { recipe: RecipeItem; onOpen: () => void; grid: boolean }) {
  const d = recipe.details;
  const duration = recipeDurationLabel(d);
  const roleText = d.roles.length ? d.roles.map(role => roleLabels[role]).join(" · ") : "Uncategorised";
  return (
    <article className="pcc-recipe-card">
      <button type="button" onClick={onOpen} className="pcc-recipe-card-button">
        <div className="pcc-recipe-card-art"><RecipePhoto photoId={d.photoId} title={recipe.item.title} /></div>
        <div className="pcc-recipe-card-content">
          <p className="pcc-recipe-card-title">{recipe.item.title}</p>
          <p className="pcc-recipe-card-meta">{roleText}{duration ? " · " + duration : ""}</p>
          <div className="pcc-recipe-card-status">
            <span className={d.tested ? "pcc-recipe-tested" : ""}><RecipeIcon name={d.tested ? "check" : "try"}/>{d.tested ? "Tested" : "To try"}</span>
            {d.freezer === "yes" && <span><RecipeIcon name="snow"/>Freezer friendly</span>}
          </div>
          {d.rating !== undefined && <p className="pcc-recipe-card-rating" aria-label={"Rating " + d.rating + " out of 10"}><RecipeIcon name="star" />{d.rating.toFixed(1)}/10</p>}
          {!grid && d.tags.length > 0 && <p className="pcc-recipe-card-meta">{d.tags.join(" · ")}</p>}
          {!grid && d.servings && <p className="pcc-recipe-card-meta">{d.servings} servings{d.makeAgain === "yes" ? " · Make again" : ""}</p>}
        </div>
      </button>
    </article>
  );
}

function StorageFilter({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  return <select aria-label={label + " suitability"} className="input" value={value} onChange={e => onChange(e.target.value)}><option value="">Any</option>{storageValues.map(v => <option key={v} value={v}>{v === "yes" ? "Suitable" : v === "no" ? "Not suitable" : "Unknown"}</option>)}</select>;
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
      <div className="pcc-recipe-hero">
        <div className="pcc-recipe-hero-copy">
          <p className="pcc-record-meta">{d.roles.length ? d.roles.map(role => roleLabels[role]).join(" · ") : "Uncategorised"}</p>
          <h2>{item.title}</h2>
          {d.description && <p className="whitespace-pre-wrap">{d.description}</p>}
          <div className="pcc-recipe-card-status">
            <span className={d.tested ? "pcc-recipe-tested" : ""}><RecipeIcon name={d.tested ? "check" : "try"}/>{d.tested ? "Tested" : "To try"}</span>
            {d.freezer === "yes" && <span><RecipeIcon name="snow"/>Freezer friendly</span>}
            {d.rating !== undefined && <span><RecipeIcon name="star"/>{d.rating.toFixed(1)}/10</span>}
          </div>
          <p className="pcc-recipe-card-meta">{[d.prepMinutes !== undefined ? "Prep " + d.prepMinutes + " min" : "", d.cookMinutes !== undefined ? "Cook " + d.cookMinutes + " min" : "", d.difficulty !== "unknown" ? d.difficulty : "", d.servings ? d.servings + " servings" : "", d.makeAgain === "yes" ? "Make again" : ""].filter(Boolean).join(" · ")}</p>
          {d.tags.length > 0 && <p className="pcc-recipe-card-meta">{d.tags.join(" · ")}</p>}
        </div>
        {d.photoId && <div className="pcc-recipe-hero-art"><RecipePhoto photoId={d.photoId} title={item.title} /></div>}
      </div>
      <div className="pcc-recipe-cooking-grid">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"><h3 className="text-lg font-semibold">Ingredients</h3>
        {d.servings ? <label className="flex items-center gap-3">Servings <input aria-label="Desired servings" className="input max-w-28" type="number" min="0.25" max="100" step="any" value={servings} onChange={e => {setServings(e.target.value);setCopyState("");}} /></label> : <p className="text-sm text-slate-500">Set base servings in Edit to enable scaling.</p>}
        <button className="pcc-control" onClick={async () => {try {await navigator.clipboard.writeText((!valid || Number(servings) === d.servings) && d.ingredients ? d.ingredients : rows.map(row => "- " + ingredientLine(row)).join("\n")); setCopyState("Copied");} catch {setCopyState("Copy failed");}}}>{copyState || "Copy ingredients"}</button>
        {rows.map((row,i) => <label key={i} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked(c => c.includes(i) ? c.filter(n => n !== i) : [...c,i])}/><span className={checked.includes(i) ? "line-through" : ""}>{ingredientLine(row)}</span></label>)}
        {!rows.length && <p>No ingredients added.</p>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-semibold">Instructions</h3><ol className="mt-3 list-decimal space-y-4 pl-6">{d.cookingSteps.map((step,i) => <li key={i} className="whitespace-pre-wrap">{step}</li>)}</ol>{!d.cookingSteps.length && <p>No steps added.</p>}</section>
      </div>
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
  initialRole,
  onCancel,
  onSave,
  onDelete,
}: {
  recipe?: RecipeItem;
  initialRole?: RecipeRole;
  onCancel: () => void;
  onSave: (title: string, details: RecipeDetails) => boolean | Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}) {
  const initialDetails = recipe?.details ?? { ...createRecipeDetails(), roles: initialRole ? [initialRole] : [] };
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
                <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Recipe roles (optional)</legend><div className="pcc-cookbook-role-picker">{recipeRoles.map(role => <label key={role}><input type="checkbox" checked={details.roles.includes(role)} onChange={() => setDetails(c => ({...c, roles:c.roles.includes(role) ? c.roles.filter(r => r !== role) : [...c.roles,role]}))}/>{roleLabels[role]}</label>)}</div></fieldset>
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
