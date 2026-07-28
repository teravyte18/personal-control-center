const CACHE_NAME = "pcc-offline-shell-v2";
const CAPTURE_URL = "/";
const MANIFEST_URL = "/manifest.webmanifest";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await warmOfflineCapture();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("pcc-offline-shell-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await warmOfflineCapture();
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PCC_WARM_OFFLINE_CAPTURE") return;
  event.waitUntil((async () => {
    await warmOfflineCapture();
    event.source?.postMessage?.({ type: "PCC_OFFLINE_CAPTURE_WARMED" });
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")
    || url.pathname === "/login"
    || url.pathname === "/activate") return;

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")
    || url.pathname === MANIFEST_URL
    || url.pathname === "/pcc-sw.js"
    || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/review";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if ("focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});

async function navigationResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (cacheablePage(response)) {
      await cache.put(request, response.clone());
      if (new URL(request.url).pathname === CAPTURE_URL) {
        await cache.put(CAPTURE_URL, response.clone());
      }
    }
    return response;
  } catch {
    return await cache.match(request, { ignoreSearch: true })
      || await cache.match(CAPTURE_URL, { ignoreSearch: true })
      || offlineFallback();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

function cacheablePage(response) {
  if (!response.ok || response.redirected) return false;
  const url = new URL(response.url);
  return url.origin === self.location.origin && url.pathname !== "/login" && url.pathname !== "/activate";
}

async function warmOfflineCapture() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(CAPTURE_URL, {
      credentials: "include",
      cache: "no-store",
      redirect: "follow",
    });
    if (!cacheablePage(response)) return false;

    const html = await response.clone().text();
    await cache.put(CAPTURE_URL, response.clone());

    const urls = new Set([MANIFEST_URL]);
    const attributePattern = /(?:src|href)=["']([^"']+)["']/g;
    for (const match of html.matchAll(attributePattern)) {
      try {
        const asset = new URL(match[1], self.location.origin);
        if (asset.origin !== self.location.origin) continue;
        if (asset.pathname.startsWith("/_next/static/")
          || asset.pathname.startsWith("/icons/")
          || asset.pathname === MANIFEST_URL) {
          urls.add(`${asset.pathname}${asset.search}`);
        }
      } catch {
        // Ignore malformed or unsupported URLs in the generated HTML.
      }
    }

    await Promise.all([...urls].map(async (url) => {
      try {
        const assetResponse = await fetch(url, { credentials: "include", cache: "no-store" });
        if (assetResponse.ok) await cache.put(url, assetResponse.clone());
      } catch {
        // A partial warm-up is still useful; runtime caching can fill missing assets later.
      }
    }));
    return true;
  } catch {
    // Warm-up is best effort and will run again on activation and later online app loads.
    return false;
  }
}

function offlineFallback() {
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personal Control Center</title></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;display:grid;min-height:100vh;place-items:center;padding:24px;box-sizing:border-box">
<main style="max-width:420px;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:24px;text-align:center">
<h1 style="font-size:20px;margin:0">Offline capture is not ready yet</h1>
<p style="color:#64748b;line-height:1.6">Reconnect once, open Personal Control Center, and reload it so this device can prepare the offline Capture screen.</p>
</main></body></html>`, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
