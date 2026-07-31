export const themeIds = [
  "default",
  "pokemon",
  "hades",
  "hades-ii",
  "hollow-knight",
  "silksong",
  "elden-ring",
  "cyberpunk-2077",
  "the-witcher-3",
  "stardew-valley",
] as const;

export type ThemeId = (typeof themeIds)[number];

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  preview: readonly [string, string, string];
  themeColor: string;
};

export const themes: readonly ThemeDefinition[] = [
  { id: "default", label: "Default", preview: ["#f8fafc", "#ffffff", "#0f172a"], themeColor: "#f8fafc" },
  { id: "pokemon", label: "Pokémon", preview: ["#f7f2f1", "#fffaf8", "#9f5b60"], themeColor: "#f7f2f1" },
  { id: "hades", label: "Hades", preview: ["#171416", "#211b1d", "#a56a5c"], themeColor: "#171416" },
  { id: "hades-ii", label: "Hades II", preview: ["#151821", "#1d2230", "#817b9f"], themeColor: "#151821" },
  { id: "hollow-knight", label: "Hollow Knight", preview: ["#151a20", "#1e252d", "#7d91a4"], themeColor: "#151a20" },
  { id: "silksong", label: "Silksong", preview: ["#f6f0ed", "#fff9f6", "#a45d66"], themeColor: "#f6f0ed" },
  { id: "elden-ring", label: "Elden Ring", preview: ["#1b1b18", "#25251f", "#99845d"], themeColor: "#1b1b18" },
  { id: "cyberpunk-2077", label: "Cyberpunk 2077", preview: ["#1b1c20", "#25262b", "#b1a15e"], themeColor: "#1b1c20" },
  { id: "the-witcher-3", label: "The Witcher 3", preview: ["#181b1b", "#232727", "#805a57"], themeColor: "#181b1b" },
  { id: "stardew-valley", label: "Stardew Valley", preview: ["#f4f0df", "#fffaf0", "#6f8b6c"], themeColor: "#f4f0df" },
] as const;

const themeIdSet = new Set<string>(themeIds);

export function normalizeTheme(value: unknown): ThemeId {
  return typeof value === "string" && themeIdSet.has(value) ? value as ThemeId : "default";
}

export function getThemeDefinition(theme: ThemeId) {
  return themes.find((candidate) => candidate.id === theme) ?? themes[0];
}
