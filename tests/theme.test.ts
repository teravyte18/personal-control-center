import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTheme, themeIds, themes } from "../src/lib/theme.ts";

test("theme definitions cover every supported theme exactly once", () => {
  assert.equal(new Set(themeIds).size, themeIds.length);
  assert.deepEqual(themes.map((theme) => theme.id), [...themeIds]);
});

test("theme names keep the requested game titles", () => {
  assert.deepEqual(
    themes.map((theme) => theme.label),
    [
      "Default",
      "Pokémon",
      "Hades",
      "Hades II",
      "Hollow Knight",
      "Silksong",
      "Elden Ring",
      "Cyberpunk 2077",
      "The Witcher 3",
      "Stardew Valley",
    ],
  );
});

test("invalid stored themes fall back to Default", () => {
  assert.equal(normalizeTheme("hades"), "hades");
  assert.equal(normalizeTheme("unknown"), "default");
  assert.equal(normalizeTheme(null), "default");
});
