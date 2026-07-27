"use client";

import { useEffect } from "react";
import { loadActiveBrowserUser } from "@/lib/personal-storage";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    let cancelled = false;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/pcc-sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        if (cancelled || !loadActiveBrowserUser(window.localStorage)) return;
        registration.active?.postMessage({ type: "PCC_WARM_OFFLINE_CAPTURE" });
      } catch {
        // The app remains usable online even when service-worker registration is unavailable.
      }
    }

    const warmWhenOnline = () => void register();
    void register();
    window.addEventListener("online", warmWhenOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", warmWhenOnline);
    };
  }, []);

  return null;
}
