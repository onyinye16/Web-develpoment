// Offline support: cache the app shell; network-first so updates arrive quickly.
const CACHE = "parle-v2";
const SHELL = [
  "./", "index.html", "css/styles.css", "manifest.webmanifest",
  "js/app.js", "js/curriculum.js", "js/store.js", "js/tutor.js", "js/speech.js", "js/personas.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Never cache API calls.
  if (url.hostname === "api.anthropic.com") return;
  const sameOrigin = url.origin === location.origin;
  const isSdk = url.hostname === "esm.sh";
  if (!sameOrigin && !isSdk) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
