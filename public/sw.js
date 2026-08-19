/* 1011 Tracker service worker — app-shell offline cache.
 *
 * Bump VERSION whenever the app shell or cached asset filenames change.
 * The `activate` handler below deletes every cache whose key does not
 * match the current VERSION, so old shells (including the pre-rebrand
 * "tasbih-v1" caches from returning PWA users) are cleared on upgrade. */
const VERSION = "1011-v2";
const CORE = [
  "/",
  "/app/dashboard",
  "/app/history",
  "/app/insights",
  "/app/profile",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // For navigations, use network first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match("/app/dashboard") || caches.match("/"),
          ),
        ),
    );
    return;
  }

  // Static assets — cache first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
              return res;
            })
            .catch(() => cached),
      ),
    );
    return;
  }

  // default — try network, fall back to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((cached) => cached || Response.error())),
  );
});
