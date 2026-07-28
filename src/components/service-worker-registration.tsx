"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    let cancelled = false;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/pcc-sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await registration.update();
        if (!cancelled) await navigator.serviceWorker.ready;
      } catch {
        // The app remains usable online even when service-worker registration is unavailable.
      }
    }

    const updateWhenOnline = () => void register();
    void register();
    window.addEventListener("online", updateWhenOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", updateWhenOnline);
    };
  }, []);

  return null;
}
