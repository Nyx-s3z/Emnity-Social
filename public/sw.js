const CACHE_NAME = "emnity-social-shell-v10";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/social.js",
  "/manifest.webmanifest",
  "/icons/emnity.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("emnity-social-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache account data, API responses, or live Socket.IO traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("/index.html", copy));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match("/index.html");
        return cached || Response.error();
      })
    );
    return;
  }

  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fresh = fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        });
        return cached || fresh;
      })
    );
  }
});

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const appIsVisible = windows.some(client => client.focused && client.visibilityState === "visible");
    if (appIsVisible) return;
    const title = typeof payload.title === "string" ? payload.title.slice(0, 80) : "Emnity Social";
    const body = typeof payload.body === "string" ? payload.body.slice(0, 160) : "You have a new notification.";
    const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";
    const isCall = payload.type === "call";
    const isDm = payload.type === "dm";
    await self.registration.showNotification(title, {
      body,
      icon: "/icons/emnity.svg",
      badge: "/icons/emnity.svg",
      tag: isCall ? "emnity-incoming-call" : (isDm ? `emnity-dm-${String(payload.url || "").slice(0, 100)}` : undefined),
      renotify: isCall || isDm,
      data: { url, type: payload.type || "message" }
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const targetUrl = new URL(typeof rawUrl === "string" && rawUrl.startsWith("/") ? rawUrl : "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        if ("navigate" in client) await client.navigate(targetUrl);
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
