// Egyszerű cache-first service worker: az app teljesen statikus (nincs fetch
// a futása során), így az összes fájlt egyszer letöltjük, utána internet
// nélkül is működik. Frissítéskor a CACHE_NAME verziót kell emelni.
const CACHE_NAME = "keresztrejtveny-v1";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/data.js",
  "js/crossword.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
