// ============================================================
// service-worker.js  — StudyFlow PWA Service Worker
// ============================================================

const CACHE_NAME = "studyflow-v3";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/auth.js",
  "/db.js",
  "/analytics.js",
  "/snackbar.js",
  "/notifications.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve shell from cache, network-first for Firebase/external ────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let Firebase API calls and external CDN requests go straight to the network
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("googleapis.com") ||
    request.method !== "GET"
  ) {
    return; // let browser handle it
  }

  // For same-origin navigation requests, serve the shell
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => cached || fetch(request))
    );
    return;
  }

  // Cache-first for shell assets, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "StudyFlow Reminder",
    body: "You have a task due soon!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      tag: data.tag || "studyflow-reminder",
      data: data.taskId ? { taskId: data.taskId, url: data.url || "/" } : { url: "/" },
      actions: [
        { action: "view", title: "View Task" },
        { action: "snooze", title: "Snooze 15m" },
      ],
      requireInteraction: false,
      silent: false,
    })
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const taskId = event.notification.data?.taskId;
  const targetUrl = event.notification.data?.url || "/";

  if (action === "snooze" && taskId) {
    // Post a message to the main thread to snooze the task
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: "SNOOZE_TASK", taskId });
        }
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: "OPEN_TASK", taskId, url: targetUrl });
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync (optional future feature) ─────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(Promise.resolve()); // placeholder
  }
});
