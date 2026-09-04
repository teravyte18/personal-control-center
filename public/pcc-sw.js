const CACHE_NAME = "pcc-offline-capture-v5";
const OFFLINE_PAGE = "/offline-capture.html";
const OFFLINE_ASSETS = [
  OFFLINE_PAGE,
  "/offline-capture.js",
];
const OFFLINE_GATEWAY_STATUSES = new Set([502, 503, 504]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(OFFLINE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => (name.startsWith("pcc-offline-shell-") || name.startsWith("pcc-offline-capture-")) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")
    || url.pathname === "/keychain"
    || url.pathname.startsWith("/keychain/")
    || url.pathname === "/login"
    || url.pathname === "/activate") return;

  if (request.mode === "navigate") {
    event.respondWith(networkNavigationOrOffline(request));
    return;
  }

  if (OFFLINE_ASSETS.includes(url.pathname)
    || url.pathname === "/manifest.webmanifest"
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

async function networkNavigationOrOffline(request) {
  try {
    const response = await fetch(request);
    if (!OFFLINE_GATEWAY_STATUSES.has(response.status)) return response;
  } catch {
    // A network failure uses the same dedicated fallback as a Funnel gateway failure.
  }

  const cache = await caches.open(CACHE_NAME);
  return await cache.match(OFFLINE_PAGE) || offlineFallback();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    if (new URL(request.url).pathname === "/offline-capture.js") {
      return new Response("", { status: 503, headers: { "Content-Type": "application/javascript" } });
    }
    throw new Error("Offline asset is unavailable.");
  }
}

function offlineFallback() {
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Personal Control Center</title></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;display:grid;min-height:100vh;place-items:center;padding:24px;box-sizing:border-box">
<main style="max-width:420px;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:24px;text-align:center">
<h1 style="font-size:20px;margin:0">Offline capture is not installed yet</h1>
<p style="color:#64748b;line-height:1.6">Reconnect once and reopen Personal Control Center so this device can install the offline Capture screen.</p>
</main></body></html>`, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
