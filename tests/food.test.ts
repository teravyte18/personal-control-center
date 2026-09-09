import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecipeDetails,
  getRecipes,
  isRecipeItem,
  normalizeRecipeDetails,
  parseRecipeDetails,
  recipeDurationLabel,
  recipeMatchesQuery,
  serializeRecipeDetails,
  sortRecipes,
} from "../src/domain/food.ts";
import { getNotes } from "../src/domain/notes.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(id: string, description: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    title: `Recipe ${id}`,
    description,
    actions: [],
    kind: "note",
    status: "active",
    area: "personal",
    createdAt: "2026-09-07T10:00:00.000Z",
    updatedAt: "2026-09-07T10:00:00.000Z",
    ...overrides,
  };
}

test("serializes recipe details while preserving ingredient and step line breaks", () => {
  const details = {
    ...createRecipeDetails(),
    ingredients: "- 500 g chicken\r\n- garlic\r\n- rice",
    steps: "1. Prep\r\n2. Cook",
    notes: "Less salt\r\nMore garlic",
    sourceUrl: "https://example.com/recipe",
  };
  const description = serializeRecipeDetails(details);
  const parsed = parseRecipeDetails(description);
  assert.ok(parsed);
  assert.equal(parsed.ingredients, "- 500 g chicken\n- garlic\n- rice");
  assert.equal(parsed.steps, "1. Prep\n2. Cook");
  assert.equal(parsed.notes, "Less salt\nMore garlic");
  assert.equal(parsed.sourceUrl, "https://example.com/recipe");
  assert.equal(parseRecipeDetails("Normal note body"), null);
  assert.equal(isRecipeItem(item("one", description)), true);
});

test("normalizes optional recipe metadata without turning it into a nutrition model", () => {
  const normalized = normalizeRecipeDetails({
    servings: 4.9,
    prepMinutes: 20,
    cookMinutes: 45,
    rating: 8.26,
    makeAgain: "yes",
    tags: [" Quick ", "chicken", "quick", "  rice   bowl  ", ""],
    sourceUrl: "javascript:alert(1)",
  });
  assert.equal(normalized.servings, 4);
  assert.equal(normalized.prepMinutes, 20);
  assert.equal(normalized.cookMinutes, 45);
  assert.equal(normalized.rating, 8.5);
  assert.equal(normalized.makeAgain, "yes");
  assert.deepEqual(normalized.tags, ["Quick", "chicken", "rice bowl"]);
  assert.equal(normalized.sourceUrl, "");
  assert.equal("calories" in normalized, false);
});

test("recipe list ignores normal notes and inactive recipe records", () => {
  const description = serializeRecipeDetails({ ...createRecipeDetails(), tags: ["Dinner"] });
  const recipes = getRecipes([
    item("active", description),
    item("normal-note", "ordinary note"),
    item("archived", description, { status: "archived" }),
  ]);
  assert.deepEqual(recipes.map((recipe) => recipe.item.id), ["active"]);
  assert.equal(recipeMatchesQuery(recipes[0], "dinner"), true);
  assert.equal(recipeMatchesQuery(recipes[0], "active"), true);
  assert.equal(recipeMatchesQuery(recipes[0], "breakfast"), false);
});

test("normal Notes excludes recipe metadata records", () => {
  const recipe = item("recipe", serializeRecipeDetails(createRecipeDetails()));
  const note = item("note", "Normal note text", { title: "Normal note" });
  assert.deepEqual(getNotes([recipe, note]).map((candidate) => candidate.id), ["note"]);
});

test("recipe browsing puts rated recipes first and keeps unrated titles stable", () => {
  const recipes = getRecipes([
    item("unrated-z", serializeRecipeDetails(createRecipeDetails()), { title: "Zeta" }),
    item("rated-low", serializeRecipeDetails({ ...createRecipeDetails(), rating: 6.5 }), { title: "Beta" }),
    item("unrated-a", serializeRecipeDetails(createRecipeDetails()), { title: "Alpha" }),
    item("rated-high", serializeRecipeDetails({ ...createRecipeDetails(), rating: 9 }), { title: "Gamma" }),
  ]);
  assert.deepEqual(sortRecipes(recipes).map((recipe) => recipe.item.id), [
    "rated-high",
    "rated-low",
    "unrated-a",
    "unrated-z",
  ]);
});

test("formats practical total recipe time", () => {
  assert.equal(recipeDurationLabel({ prepMinutes: undefined, cookMinutes: undefined }), "");
  assert.equal(recipeDurationLabel({ prepMinutes: 10, cookMinutes: 25 }), "35 min");
  assert.equal(recipeDurationLabel({ prepMinutes: 20, cookMinutes: 60 }), "1h 20m");
  assert.equal(recipeDurationLabel({ prepMinutes: 60, cookMinutes: 60 }), "2h");
});
