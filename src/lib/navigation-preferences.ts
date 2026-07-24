"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  defaultPinnedDestinationIds,
  normalizeMobilePinnedDestinationIds,
  resolveDestinations,
} from "@/lib/navigation";

const STORAGE_KEY = "pcc-mobile-quick-access-v1";
const CHANGE_EVENT = "pcc-mobile-quick-access-change";
const DEFAULT_SNAPSHOT = JSON.stringify(defaultPinnedDestinationIds);

function readSnapshot() {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return JSON.stringify(normalizeMobilePinnedDestinationIds(raw ? JSON.parse(raw) : null));
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  const handleLocalChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleLocalChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
  };
}

export function setMobileQuickAccess(ids: readonly string[]) {
  const normalized = normalizeMobilePinnedDestinationIds(ids);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // The current browser still keeps the defaults when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetMobileQuickAccess() {
  setMobileQuickAccess(defaultPinnedDestinationIds);
}

export function useMobileQuickAccess() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => DEFAULT_SNAPSHOT);
  const ids = useMemo(() => normalizeMobilePinnedDestinationIds(JSON.parse(snapshot)), [snapshot]);
  const destinations = useMemo(() => resolveDestinations(ids), [ids]);
  return { ids, destinations };
}
