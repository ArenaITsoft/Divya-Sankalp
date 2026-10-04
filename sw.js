/* Divya Sankalp – Service Worker
   Place this file next to index.html (same folder, served over HTTPS).
   Bump CACHE_VERSION whenever you update index.html so users get the new version. */
const CACHE_VERSION = "v1";
const CACHE = "divya-sankalp-" + CACHE_VERSION;
const CORE = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

// Third-party libraries and fonts the app needs to render
const CDN_HOSTS = [
  "cdn.tailwindcss.com",
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(CORE);
      // Pre-cache CDN files so the app opens offline after the first visit
      const urls = [...document_scripts()];
      await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

function document_scripts() {
  return [
    "https://cdn.tailwindcss.com",
    "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js",
    "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js",
    "https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:ital@0;1&family=Mukta:wght@400;500;600;700&display=swap"
  ];
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache live lookups and email sending (PIN code, coordinates, EmailJS)
  if (/postalpincode\.in|nominatim\.openstreetmap\.org|api\.emailjs\.com/.test(url.hostname)) return;

  // Page navigations: try network first, fall back to cached app shell when offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Same-origin files and CDN libraries/fonts: cache first, update in background
  if (url.origin === location.origin || CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
