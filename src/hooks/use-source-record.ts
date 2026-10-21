"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

/** Resolve canonical source links without changing any persisted record. */
export function useSourceRecord(parameter: "project" | "task") {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return new URLSearchParams(search).get(parameter) ?? "";
}
