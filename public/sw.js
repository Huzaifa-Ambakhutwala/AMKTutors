const CACHE_NAME = "amk-tutors-cache-v2";

// Only use HTML fallback for navigations.
const OFFLINE_FALLBACK_PAGE = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_FALLBACK_PAGE]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (!isNavigation) {
    // Never respond to CSS/JS/image requests with HTML fallback.
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(OFFLINE_FALLBACK_PAGE))
  );
});

// -----------------------------
// Push Notifications
// -----------------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Notification", body: event.data.text() };
  }

  const title = data.title || "Notification";
  const body = data.body || "";
  const url = data.url || "/";

  const options = {
    body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const url = notification.data?.url || "/";
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(location.origin)) {
          client.focus();
          client.postMessage({ type: "OPEN_URL", url });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});


