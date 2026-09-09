import type { Item } from "./personal-data";

export const RECIPE_DESCRIPTION_PREFIX = "__pcc_recipe_v1__\n";

export const recipeMakeAgainValues = ["unspecified", "yes", "no"] as const;
export type RecipeMakeAgain = (typeof recipeMakeAgainValues)[number];

export type RecipeDetails = {
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
    ingredients: "",
    steps: "",
    sourceUrl: "",
    photoId: "",
    tags: [],
    makeAgain: "unspecified",
    notes: "",
  };
}

export function normalizeRecipeDetails(value: unknown): RecipeDetails {
  const defaults = createRecipeDetails();
  if (!isRecord(value)) return defaults;

  return {
    ingredients: stringOrEmpty(value.ingredients).replace(/\r\n?/g, "\n"),
    steps: stringOrEmpty(value.steps).replace(/\r\n?/g, "\n"),
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
    || recipe.details.tags.some((tag) => tag.toLocaleLowerCase().includes(normalized));
}

export function sortRecipes(recipes: readonly RecipeItem[]) {
  return [...recipes].sort((left, right) => {
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
