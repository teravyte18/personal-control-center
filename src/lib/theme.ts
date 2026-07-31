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
  iconBackground: string;
  iconBorder: string;
};

export const themes: readonly ThemeDefinition[] = [
  {
    id: "default",
    label: "Default",
    preview: ["#f8fafc", "#ffffff", "#0f172a"],
    themeColor: "#f8fafc",
    iconBackground: "#0f172a",
    iconBorder: "#0f172a",
  },
  {
    id: "pokemon",
    label: "Pokémon",
    preview: ["#f7f4f1", "#fffdf9", "#f21f25"],
    themeColor: "#f7f4f1",
    iconBackground: "#f8f8f7",
    iconBorder: "#242629",
  },
  {
    id: "hades",
    label: "Hades",
    preview: ["#1c1215", "#291a1e", "#c69a52"],
    themeColor: "#1c1215",
    iconBackground: "#5e2b2b",
    iconBorder: "#d2ad67",
  },
  {
    id: "hades-ii",
    label: "Hades II",
    preview: ["#121a1c", "#1a2729", "#aeb8c7"],
    themeColor: "#121a1c",
    iconBackground: "#244742",
    iconBorder: "#bdc5d1",
  },
  {
    id: "hollow-knight",
    label: "Hollow Knight",
    preview: ["#101726", "#182337", "#6d87a8"],
    themeColor: "#101726",
    iconBackground: "#364f70",
    iconBorder: "#91a8c2",
  },
  {
    id: "silksong",
    label: "Silksong",
    preview: ["#f7eeea", "#fff9f5", "#d1141e"],
    themeColor: "#f7eeea",
    iconBackground: "#c9131d",
    iconBorder: "#d1a14a",
  },
  {
    id: "elden-ring",
    label: "Elden Ring",
    preview: ["#0d1b1b", "#152727", "#d1b35c"],
    themeColor: "#0d1b1b",
    iconBackground: "#0f2424",
    iconBorder: "#d6ba63",
  },
  {
    id: "cyberpunk-2077",
    label: "Cyberpunk 2077",
    preview: ["#090a0d", "#15161b", "#f3df24"],
    themeColor: "#090a0d",
    iconBackground: "#e83d43",
    iconBorder: "#f3df24",
  },
  {
    id: "the-witcher-3",
    label: "The Witcher 3",
    preview: ["#e8f0f3", "#faf8f1", "#795a40"],
    themeColor: "#e8f0f3",
    iconBackground: "#f1f4ef",
    iconBorder: "#6f9275",
  },
  {
    id: "stardew-valley",
    label: "Stardew Valley",
    preview: ["#dbeec5", "#fff2d2", "#c77730"],
    themeColor: "#dbeec5",
    iconBackground: "#efb55c",
    iconBorder: "#79aa50",
  },
] as const;

const themeIdSet = new Set<string>(themeIds);

export function normalizeTheme(value: unknown): ThemeId {
  return typeof value === "string" && themeIdSet.has(value) ? value as ThemeId : "default";
}

export function getThemeDefinition(theme: ThemeId) {
  return themes.find((candidate) => candidate.id === theme) ?? themes[0];
}
