"use client";

import { useEffect } from "react";
import { loadActiveBrowserUser } from "@/lib/personal-storage";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    let cancelled = false;

    async function registerAndWarm() {
      try {
        const registration = await navigator.serviceWorker.register("/pcc-sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        if (cancelled || !loadActiveBrowserUser(window.localStorage)) return;
        registration.active?.postMessage({ type: "PCC_WARM_OFFLINE_CAPTURE" });
      } catch {
        // The app remains usable online even when service-worker registration is unavailable.
      }
    }

    const warmWhenOnline = () => void registerAndWarm();
    const warmWhenVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void registerAndWarm();
    };
    const delayedWarm = window.setTimeout(() => void registerAndWarm(), 2_000);

    void registerAndWarm();
    window.addEventListener("online", warmWhenOnline);
    window.addEventListener("focus", warmWhenOnline);
    document.addEventListener("visibilitychange", warmWhenVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(delayedWarm);
      window.removeEventListener("online", warmWhenOnline);
      window.removeEventListener("focus", warmWhenOnline);
      document.removeEventListener("visibilitychange", warmWhenVisible);
    };
  }, []);

  return null;
}
