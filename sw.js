const CACHE = "airboard-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./accessibility.css",
  "./app.js",
  "./ai-board.js",
  "./ai-contract.js",
  "./calibration.js",
  "./semantic-ink.js",
  "./local-recognizer-v2.js",
  "./manifest.webmanifest",
];
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(event.request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
