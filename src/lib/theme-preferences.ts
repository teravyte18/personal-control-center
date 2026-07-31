"use client";

import { useSyncExternalStore } from "react";
import { getThemeDefinition, normalizeTheme, type ThemeId } from "@/lib/theme";

export const THEME_STORAGE_KEY = "pcc-theme-v1";
const CHANGE_EVENT = "pcc-theme-change";

function readSnapshot(): ThemeId {
  if (typeof window === "undefined") return "default";

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "default";
  }
}

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  const themeColor = getThemeDefinition(theme).themeColor;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readSnapshot());
    onStoreChange();
  };
  const handleLocalChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

export function setThemePreference(value: ThemeId) {
  const theme = normalizeTheme(value);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies for the current page when storage is unavailable.
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useThemePreference() {
  const theme = useSyncExternalStore(subscribe, readSnapshot, () => "default" as const);
  return {
    theme,
    definition: getThemeDefinition(theme),
    setTheme: setThemePreference,
  };
}
