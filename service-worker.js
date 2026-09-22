const CACHE_NAME = "duc-anh-maintenance-pwa-v4";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./customers.html",
  "./buildings.html",
  "./elevators.html",
  "./manifest.webmanifest",

  "./css/navigation.css",

  "./js/navigation.js",
  "./js/pwa.js",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (url.pathname.startsWith("/__")) {
    return;
  }

  /*
   * HTML/navigation:
   * Always try the network first so GitHub Pages updates are visible.
   * Fall back to cache when offline.
   */
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  /*
   * CSS / JS / images:
   * Network first for the application UI so a new deployment
   * replaces an old cached navigation asset immediately.
   */
  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
