const CACHE_NAME = "duc-anh-maintenance-pwa-v3";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon-180.png",
  "./js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Chỉ xử lý request GET của chính website
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Không can thiệp namespace dành riêng cho Firebase
  if (url.pathname.startsWith("/__")) {
    return;
  }

  // HTML / navigation:
  // Ưu tiên mạng để luôn lấy phiên bản mới.
  // Nếu offline mới dùng cache.
  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );

    return;
  }

  // CSS / JS / hình ảnh / icon:
  // Cache-first để PWA mở nhanh.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic"
        ) {
          return response;
        }

        const copy = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });

        return response;
      });
    })
  );
});
