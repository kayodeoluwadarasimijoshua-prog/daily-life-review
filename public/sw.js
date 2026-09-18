/* Daily Life Review — service worker (push notifications) */

self.addEventListener("install", (event) => {
  // Activate this version immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Daily Life Review";
  const options = {
    body: payload.body || "How did today go? Take a minute to write it down.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "daily-reminder",
    renotify: false,
    requireInteraction: false,
    data: { url: payload.url || "/journal?new=1" },
    actions: [{ action: "write", title: "Write now" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Focus an existing tab if the app is already open.
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
