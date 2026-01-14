const CACHE_VERSION = "v1.2.8";
const CACHE_NAME = `eletrize-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=1.0.9",
  "/script.js?v=1.0.16",
  "/config.js?v=1.0.10",
  "/fonts-raleway.css",
  "/manifest.json",
  "/images/pwa/app-icon-192.png",
  "/images/pwa/app-icon-512-transparent.png",
];
const DEBUG_SW = false;

function log(...args) {
  if (DEBUG_SW) {
    console.log("[SW]", ...args);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => log("precache error", error))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHubitat =
    /cloud\.hubitat\.com$/i.test(url.hostname) ||
    /\/apps\/api\//i.test(url.pathname);

  if (!isSameOrigin || isHubitat) {
    return;
  }

  const isHTMLRequest =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHTMLRequest) {
    event.respondWith(htmlNetworkFirst(request));
    return;
  }

  // config.js deve refletir alterações imediatamente após refresh.
  // Evita stale-while-revalidate aqui (senão pode exigir 2 reloads).
  if (url.pathname === "/config.js") {
    event.respondWith(fetchConfigNoStore(request));
    return;
  }

  if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }

  if (url.pathname.startsWith("/images/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, request));
});

function fetchConfigNoStore(request) {
  return fetch(request, { cache: "no-store" }).catch(() => caches.match(request));
}

function htmlNetworkFirst(request) {
  return fetch(request)
    .then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })
    .catch((error) => {
      log("html fetch failed", request.url, error);
      return caches.match(request);
    });
}

function staleWhileRevalidate(event, request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((response) => {
        if (!response || !response.ok) {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch((error) => {
        log("network error", request.url, error);
        if (cached) {
          return cached;
        }
        throw error;
      });

    if (cached) {
      event.waitUntil(fetchPromise.catch(() => null));
      return cached;
    }

    return fetchPromise;
  });
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) {
      return cached;
    }

    return fetch(request)
      .then((response) => {
        if (!response || !response.ok) {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch((error) => {
        log("cacheFirst network error", request.url, error);
        throw error;
      });
  });
}

