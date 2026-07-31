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
  { id: "pokemon", label: "Pokémon", preview: ["#f6efed", "#fffaf7", "#a95d62"], themeColor: "#f6efed" },
  { id: "hades", label: "Hades", preview: ["#211718", "#302122", "#a65343"], themeColor: "#211718" },
  { id: "hades-ii", label: "Hades II", preview: ["#14201f", "#1d2d2b", "#4f9f91"], themeColor: "#14201f" },
  { id: "hollow-knight", label: "Hollow Knight", preview: ["#161e27", "#202c38", "#6f879c"], themeColor: "#161e27" },
  { id: "silksong", label: "Silksong", preview: ["#f5ece9", "#fff8f4", "#a75561"], themeColor: "#f5ece9" },
  { id: "elden-ring", label: "Elden Ring", preview: ["#211c17", "#2d261f", "#94733b"], themeColor: "#211c17" },
  { id: "cyberpunk-2077", label: "Cyberpunk 2077", preview: ["#0e0f12", "#191a1f", "#df3f45"], themeColor: "#0e0f12" },
  { id: "the-witcher-3", label: "The Witcher 3", preview: ["#151a18", "#202823", "#78494a"], themeColor: "#151a18" },
  { id: "stardew-valley", label: "Stardew Valley", preview: ["#e5eed9", "#f8f3df", "#a85e35"], themeColor: "#e5eed9" },
] as const;

const themeIdSet = new Set<string>(themeIds);

export function normalizeTheme(value: unknown): ThemeId {
  return typeof value === "string" && themeIdSet.has(value) ? value as ThemeId : "default";
}

export function getThemeDefinition(theme: ThemeId) {
  return themes.find((candidate) => candidate.id === theme) ?? themes[0];
}
