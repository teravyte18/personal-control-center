"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  defaultDesktopPinnedDestinationIds,
  defaultPinnedDestinationIds,
  normalizeDesktopPinnedDestinationIds,
  normalizeMobilePinnedDestinationIds,
  resolveDestinations,
} from "@/lib/navigation";

const MOBILE_STORAGE_KEY = "pcc-mobile-quick-access-v1";
const MOBILE_CHANGE_EVENT = "pcc-mobile-quick-access-change";
const MOBILE_DEFAULT_SNAPSHOT = JSON.stringify(defaultPinnedDestinationIds);

const DESKTOP_STORAGE_KEY = "pcc-desktop-quick-access-v1";
const DESKTOP_CHANGE_EVENT = "pcc-desktop-quick-access-change";
const DESKTOP_DEFAULT_SNAPSHOT = JSON.stringify(defaultDesktopPinnedDestinationIds);

function readSnapshot(
  storageKey: string,
  fallback: string,
  normalize: (value: unknown) => string[],
) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return JSON.stringify(normalize(raw ? JSON.parse(raw) : null));
  } catch {
    return fallback;
  }
}

function subscribeToPreference(storageKey: string, changeEvent: string, onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onStoreChange();
  };
  const handleLocalChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(changeEvent, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(changeEvent, handleLocalChange);
  };
}

function savePreference(
  storageKey: string,
  changeEvent: string,
  ids: readonly string[],
  normalize: (value: unknown) => string[],
) {
  const normalized = normalize(ids);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    // Defaults remain available when local storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function setMobileQuickAccess(ids: readonly string[]) {
  savePreference(MOBILE_STORAGE_KEY, MOBILE_CHANGE_EVENT, ids, normalizeMobilePinnedDestinationIds);
}

export function resetMobileQuickAccess() {
  setMobileQuickAccess(defaultPinnedDestinationIds);
}

export function useMobileQuickAccess() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => subscribeToPreference(MOBILE_STORAGE_KEY, MOBILE_CHANGE_EVENT, onStoreChange),
    () => readSnapshot(MOBILE_STORAGE_KEY, MOBILE_DEFAULT_SNAPSHOT, normalizeMobilePinnedDestinationIds),
    () => MOBILE_DEFAULT_SNAPSHOT,
  );
  const ids = useMemo(() => normalizeMobilePinnedDestinationIds(JSON.parse(snapshot)), [snapshot]);
  const destinations = useMemo(() => resolveDestinations(ids), [ids]);
  return { ids, destinations };
}

export function setDesktopQuickAccess(ids: readonly string[]) {
  savePreference(DESKTOP_STORAGE_KEY, DESKTOP_CHANGE_EVENT, ids, normalizeDesktopPinnedDestinationIds);
}

export function resetDesktopQuickAccess() {
  setDesktopQuickAccess(defaultDesktopPinnedDestinationIds);
}

export function useDesktopQuickAccess() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => subscribeToPreference(DESKTOP_STORAGE_KEY, DESKTOP_CHANGE_EVENT, onStoreChange),
    () => readSnapshot(DESKTOP_STORAGE_KEY, DESKTOP_DEFAULT_SNAPSHOT, normalizeDesktopPinnedDestinationIds),
    () => DESKTOP_DEFAULT_SNAPSHOT,
  );
  const ids = useMemo(() => normalizeDesktopPinnedDestinationIds(JSON.parse(snapshot)), [snapshot]);
  const destinations = useMemo(() => resolveDestinations(ids), [ids]);
  return { ids, destinations };
}
