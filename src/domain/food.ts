import type { Item } from "./personal-data";

export const RECIPE_DESCRIPTION_PREFIX = "__pcc_recipe_v1__\n";

export const recipeMakeAgainValues = ["unspecified", "yes", "no"] as const;
export type RecipeMakeAgain = (typeof recipeMakeAgainValues)[number];

export const recipeRoles = ["protein", "carbohydrate side", "vegetable side", "complete dish", "sauce and dressing", "breakfast", "snack", "dessert"] as const;
export type RecipeRole = typeof recipeRoles[number];
export const storageValues = ["unknown", "yes", "no"] as const;
export type StorageSuitability = typeof storageValues[number];
export const ingredientUnits = ["", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "clove", "piece", "pinch", "slice", "bunch", "can"] as const;
export type IngredientUnit = typeof ingredientUnits[number];
export type RecipeIngredient = { name: string; quantity?: number; unit: IngredientUnit; notes: string; optional: boolean; scalable: boolean };
export const nutritionKeys = ["calories", "protein", "carbohydrates", "fat", "saturatedFat", "fibre", "salt"] as const;
export type RecipeNutrition = Partial<Record<typeof nutritionKeys[number], number>>;
export type RecipeMealComponent = { recipeId: string; servings: number };

export type RecipeDetails = {
  description: string;
  roles: RecipeRole[];
  ingredientRows: RecipeIngredient[];
  cookingSteps: string[];
  difficulty: "unknown" | "easy" | "medium" | "hard";
  fridge: StorageSuitability;
  freezer: StorageSuitability;
  fridgeDays?: number;
  freezerDays?: number;
  freezing: string;
  defrosting: string;
  reheating: string;
  storageNotes: string;
  tested: boolean;
  lastCooked?: string;
  nutrition: RecipeNutrition;
  ingredients: string;
  steps: string;
  sourceUrl: string;
  photoId: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  tags: string[];
  rating?: number;
  makeAgain: RecipeMakeAgain;
  notes: string;
};

export type RecipeItem = {
  item: Item;
  details: RecipeDetails;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalInteger(value: unknown, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized > 0 && normalized <= maximum ? normalized : undefined;
}

function normalizeRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) return undefined;
  return Math.round(value * 2) / 2;
}

function normalizeSourceUrl(value: unknown) {
  const candidate = stringOrEmpty(value).trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const tag = candidate.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag || tags.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue;
    tags.push(tag);
    if (tags.length === 16) break;
  }
  return tags;
}

function isMakeAgain(value: unknown): value is RecipeMakeAgain {
  return typeof value === "string" && recipeMakeAgainValues.includes(value as RecipeMakeAgain);
}

export function createRecipeDetails(): RecipeDetails {
  return {
    description: "", roles: [], ingredientRows: [], cookingSteps: [],
    difficulty: "unknown", fridge: "unknown", freezer: "unknown",
    freezing: "", defrosting: "", reheating: "", storageNotes: "", tested: false, nutrition: {},
    ingredients: "",
    steps: "",
    sourceUrl: "",
    photoId: "",
    tags: [],
    makeAgain: "unspecified",
    notes: "",
  };
}

function nonnegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9 ? value : undefined;
}

function normalizeSuitability(value: unknown): StorageSuitability {
  return value === "yes" || value === "no" ? value : "unknown";
}

export function scaleRecipeIngredients(details: RecipeDetails, servings: number): RecipeIngredient[] {
  if (!details.servings || !Number.isFinite(servings) || servings <= 0 || servings > 100) throw new RangeError("A valid base and desired serving count are required.");
  const ratio = servings / details.servings;
  return details.ingredientRows.map(row => ({ ...row, quantity: row.quantity !== undefined && row.scalable
    ? Math.round(row.quantity * ratio * 1e6) / 1e6 : row.quantity }));
}

export function recipeSummary(recipe: RecipeItem) {
  const { item, details } = recipe;
  return {
    id: item.id, name: item.title, path: "/food?recipe=" + encodeURIComponent(item.id),
    roles: details.roles, tags: details.tags, servings: details.servings ?? null,
    prepMinutes: details.prepMinutes ?? null, cookMinutes: details.cookMinutes ?? null,
    tested: details.tested, difficulty: details.difficulty, rating: details.rating ?? null,
    fridge: details.fridge, freezer: details.freezer, fridgeDays: details.fridgeDays ?? null,
    freezerDays: details.freezerDays ?? null, hasPhoto: !!details.photoId,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
}

export function recipeDetail(recipe: RecipeItem, servings?: number) {
  const d = recipe.details;
  return { ...recipeSummary(recipe), description: d.description, ingredients: d.ingredientRows,
    steps: d.cookingSteps, sourceUrl: d.sourceUrl, freezing: d.freezing, defrosting: d.defrosting,
    reheating: d.reheating, storageNotes: d.storageNotes, notes: d.notes, makeAgain: d.makeAgain,
    lastCooked: d.lastCooked ?? null, nutrition: d.nutrition,
    ...(servings !== undefined ? { desiredServings: servings, scaledIngredients: scaleRecipeIngredients(d, servings) } : {}),
  };
}

export function ingredientLine(row: RecipeIngredient) {
  return [row.quantity, row.unit, row.name].filter(value => value !== undefined && value !== "").join(" ")
    + (row.notes ? " — " + row.notes : "") + (row.optional ? " (optional)" : "");
}

export type RecipeFilters = { query?: string; role?: RecipeRole; tested?: boolean; fridge?: StorageSuitability; freezer?: StorageSuitability; maxMinutes?: number; tag?: string };
export function filterRecipes(recipes: readonly RecipeItem[], filters: RecipeFilters) {
  return recipes.filter(({item, details}) => recipeMatchesQuery({item, details}, filters.query ?? "")
    && (!filters.role || details.roles.includes(filters.role))
    && (filters.tested === undefined || details.tested === filters.tested)
    && (!filters.fridge || details.fridge === filters.fridge)
    && (!filters.freezer || details.freezer === filters.freezer)
    && (!filters.tag || details.tags.some(tag => tag.toLowerCase() === filters.tag!.toLowerCase()))
    && (filters.maxMinutes === undefined || (details.prepMinutes !== undefined && details.cookMinutes !== undefined
      && details.prepMinutes + details.cookMinutes <= filters.maxMinutes)));
}

export function normalizeRecipeDetails(value: unknown): RecipeDetails {
  const defaults = createRecipeDetails();
  if (!isRecord(value)) return defaults;

  const rawIngredients = stringOrEmpty(value.ingredients).replace(/\r\n?/g, "\n");
  const rawSteps = stringOrEmpty(value.steps).replace(/\r\n?/g, "\n");
  const ingredientRows = Array.isArray(value.ingredientRows) && value.ingredientRows.length
    ? value.ingredientRows.flatMap((row): RecipeIngredient[] => {
      if (!isRecord(row) || !stringOrEmpty(row.name).trim()) return [];
      return [{ name: stringOrEmpty(row.name).trim(), quantity: nonnegative(row.quantity),
        unit: ingredientUnits.includes(row.unit as IngredientUnit) ? row.unit as IngredientUnit : "",
        notes: stringOrEmpty(row.notes), optional: row.optional === true, scalable: row.scalable !== false }];
    }) : rawIngredients.split("\n").filter(line => line.trim()).map(line => ({
      name: line.trim().replace(/^[-*]\s+/, ""), unit: "", notes: "", optional: false, scalable: false,
    }));
  const cookingSteps = Array.isArray(value.cookingSteps) && value.cookingSteps.length
    ? value.cookingSteps.filter((step): step is string => typeof step === "string" && !!step.trim())
    : rawSteps.split("\n").filter(line => line.trim()).map(line => line.trim().replace(/^\d+[.)]\s+/, ""));
  const nutrition: RecipeNutrition = {};
  const rawNutrition = value.nutrition;
  if (isRecord(rawNutrition)) for (const key of nutritionKeys) {
    const amount = nonnegative(rawNutrition[key]);
    if (amount !== undefined) nutrition[key] = amount;
  }
  const lastCooked = stringOrEmpty(value.lastCooked);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(lastCooked) && Number.isFinite(Date.parse(lastCooked)) && new Date(lastCooked).toISOString().slice(0, 10) === lastCooked;
  return {
    description: stringOrEmpty(value.description),
    roles: Array.isArray(value.roles) ? [...new Set(value.roles.filter((role): role is RecipeRole => recipeRoles.includes(role as RecipeRole)))] : [],
    ingredientRows, cookingSteps,
    difficulty: value.difficulty === "easy" || value.difficulty === "medium" || value.difficulty === "hard" ? value.difficulty : "unknown",
    fridge: normalizeSuitability(value.fridge), freezer: normalizeSuitability(value.freezer),
    fridgeDays: optionalInteger(value.fridgeDays, 365), freezerDays: optionalInteger(value.freezerDays, 3650),
    freezing: stringOrEmpty(value.freezing), defrosting: stringOrEmpty(value.defrosting),
    reheating: stringOrEmpty(value.reheating), storageNotes: stringOrEmpty(value.storageNotes),
    tested: value.tested === true, lastCooked: validDate ? lastCooked : undefined, nutrition,
    ingredients: rawIngredients || ingredientRows.map(row => "- " + ingredientLine(row)).join("\n"),
    steps: rawSteps || cookingSteps.map((step, index) => (index + 1) + ". " + step).join("\n"),
    sourceUrl: normalizeSourceUrl(value.sourceUrl),
    photoId: stringOrEmpty(value.photoId).trim(),
    servings: optionalInteger(value.servings, 100),
    prepMinutes: optionalInteger(value.prepMinutes, 24 * 60),
    cookMinutes: optionalInteger(value.cookMinutes, 24 * 60),
    tags: normalizeTags(value.tags),
    rating: normalizeRating(value.rating),
    makeAgain: isMakeAgain(value.makeAgain) ? value.makeAgain : defaults.makeAgain,
    notes: stringOrEmpty(value.notes).replace(/\r\n?/g, "\n"),
  };
}

export function serializeRecipeDetails(details: RecipeDetails) {
  return `${RECIPE_DESCRIPTION_PREFIX}${JSON.stringify(normalizeRecipeDetails(details))}`;
}

export function parseRecipeDetails(description: string): RecipeDetails | null {
  if (!description.startsWith(RECIPE_DESCRIPTION_PREFIX)) return null;
  try {
    return normalizeRecipeDetails(JSON.parse(description.slice(RECIPE_DESCRIPTION_PREFIX.length)) as unknown);
  } catch {
    return null;
  }
}

export function isRecipeItem(item: Pick<Item, "kind" | "description">) {
  return item.kind === "note" && parseRecipeDetails(item.description) !== null;
}

export function getRecipes(items: readonly Item[]): RecipeItem[] {
  return items.flatMap((item): RecipeItem[] => {
    if (item.status !== "active" || item.kind !== "note") return [];
    const details = parseRecipeDetails(item.description);
    return details ? [{ item, details }] : [];
  });
}

export function recipeMatchesQuery(recipe: RecipeItem, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return recipe.item.title.toLocaleLowerCase().includes(normalized)
    || recipe.details.tags.some((tag) => tag.toLocaleLowerCase().includes(normalized))
    || recipe.details.ingredientRows.some(row => row.name.toLocaleLowerCase().includes(normalized));
}

export type RecipeSort = "rating" | "name" | "time" | "created" | "updated";
export function sortRecipes(recipes: readonly RecipeItem[], sort: RecipeSort = "rating") {
  return [...recipes].sort((left, right) => {
    const titleOrder = left.item.title.localeCompare(right.item.title, undefined, { sensitivity: "base" });
    if (sort === "name") return titleOrder;
    if (sort === "created" || sort === "updated") {
      const key = sort === "created" ? "createdAt" : "updatedAt";
      return right.item[key].localeCompare(left.item[key]) || titleOrder;
    }
    if (sort === "time") {
      const duration = (r: RecipeItem) => r.details.prepMinutes === undefined || r.details.cookMinutes === undefined ? Infinity : r.details.prepMinutes + r.details.cookMinutes;
      return duration(left) - duration(right) || titleOrder;
    }
    const leftRating = left.details.rating;
    const rightRating = right.details.rating;
    if (leftRating !== undefined && rightRating !== undefined && leftRating !== rightRating) return rightRating - leftRating;
    if (leftRating !== undefined && rightRating === undefined) return -1;
    if (leftRating === undefined && rightRating !== undefined) return 1;
    return left.item.title.localeCompare(right.item.title, undefined, { sensitivity: "base" });
  });
}

export function recipeDurationLabel(details: Pick<RecipeDetails, "prepMinutes" | "cookMinutes">) {
  const minutes = (details.prepMinutes ?? 0) + (details.cookMinutes ?? 0);
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
