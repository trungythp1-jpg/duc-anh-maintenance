const CACHE_NAME = "duc-anh-maintenance-pwa-v5";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./customers.html",
  "./buildings.html",
  "./elevators.html",
  "./manifest.webmanifest",
  "./css/navigation.css",
  "./js/ui/navigation.js",
  "./js/pwa.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon-180.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (error) {
          console.warn("PWA cache skipped:", asset, error);
        }
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/__")
  ) {
    return;
  }

  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then(response => {
        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
