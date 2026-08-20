/* 1011 Tracker service worker — app-shell + versioned avatar cache.
 *
 * Bump VERSION whenever the app shell or cached asset filenames change.
 * DAPVATAR_VERSION follows the pinned dapvatar package version — bumping
 * it names a fresh avatar cache namespace so upgraded assets never
 * conflict with cached bytes from a previous version.
 *
 * On activate we sweep every stale cache: any key that is neither the
 * current app shell VERSION nor the current AVATAR_CACHE_NAME is
 * dropped. That's how the pre-Phase-6 "tasbih-v1" cache and any
 * previous dapvatar version's cache get cleaned up automatically. */
const VERSION = "1011-v4";
/* 1011 curated avatar asset set version. Bumping this string picks a
 * fresh cache namespace so upgraded assets can never conflict with
 * cached bytes from a previous version. */
const AVATAR_SET_VERSION = "v1";
const AVATAR_CACHE_NAME = "1011-avatar-" + AVATAR_SET_VERSION;
const AVATAR_PATH_PREFIX = "/avatar-assets/" + AVATAR_SET_VERSION + "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(VERSION)
        .then((cache) =>
          cache
            .addAll([
              "/",
              "/app/dashboard",
              "/app/history",
              "/app/insights",
              "/app/profile",
              "/manifest.webmanifest",
              "/icons/icon.svg",
              "/icons/favicon.svg",
            ])
            .catch(() => undefined),
        ),
      caches
        .open(AVATAR_CACHE_NAME)
        .then((cache) =>
          /* Precache ONLY the two universal defaults. Each is ~10-15 KB
           * so PWA install stays small. Everything else is cache-on-use. */
          cache
            .addAll([
              AVATAR_PATH_PREFIX + "male-karim-white/01-happy.png",
              AVATAR_PATH_PREFIX + "female-kulthum-white/05-heart-eye.png",
            ])
            .catch(() => undefined),
        ),
    ]),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Only sweep caches we OWN.
  //
  // Phase 6.1.1 §2 correctness fix: previous behaviour deleted every
  // cache except our two current ones — that stomps unrelated caches
  // that happen to sit on the same origin (browser extensions with SW
  // access, other apps that ever ran here in dev, third-party libraries
  // that own their own caches). Now we only touch caches whose names
  // start with a 1011-namespace prefix. Pre-rebrand "tasbih-" is also
  // owned by us and is safe to drop.
  const OWNED_PREFIXES = ["1011-", "tasbih-"];
  const isOwned = (name) => OWNED_PREFIXES.some((p) => name.startsWith(p));
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                isOwned(k) && k !== VERSION && k !== AVATAR_CACHE_NAME,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* ------------------------------------------------------------------ *
   * Dapvatar avatar assets — dedicated cache, cache-first.
   *
   * The URL is versioned (/memoji-assets/vX.Y.Z/...) so contents are
   * immutable. Every request either hits the dedicated cache or fetches
   * once and stores. On failure we do NOT fall back to a stale response
   * from a different cache — a 404 propagates and <UserAvatar> renders
   * the 1011 BrandMark. */
  if (url.pathname.startsWith(AVATAR_PATH_PREFIX)) {
    event.respondWith(
      caches.open(AVATAR_CACHE_NAME).then((cache) =>
        cache.match(req).then(
          (cached) =>
            cached ||
            fetch(req)
              .then((res) => {
                /* Insert only SUCCESSFUL, SAME-ORIGIN, NON-OPAQUE
                 * responses into the dedicated avatar cache.
                 *   • res.ok covers 200–299; a 404 / 500 stays out.
                 *   • res.type === "basic" means same-origin, non-opaque.
                 *     We already filtered by same-origin at the top of
                 *     the fetch handler, but this is a defence-in-depth
                 *     guard against redirects hopping origins.
                 *   • Cloning happens BEFORE we return the original res
                 *     so the caller still sees a fresh readable stream. */
                if (res && res.ok && res.type === "basic") {
                  cache.put(req, res.clone()).catch(() => {});
                }
                return res;
              })
              .catch(() => cached || Response.error()),
        ),
      ),
    );
    return;
  }

  /* App-shell navigations — network first, cache fallback. Never touches
   * authenticated JSON / Server Actions (those are POST). */
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

  /* Framework static assets + icons — cache first. */
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

  /* Default — network only, cache fallback. NEVER writes to a cache, so
   * authenticated GETs, RSC payloads, or any user JSON that reaches this
   * branch cannot leak between accounts. */
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((cached) => cached || Response.error())),
  );
});
