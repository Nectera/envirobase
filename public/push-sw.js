// Push notification service worker
// This file handles push events and notification clicks.

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "EnviroBase";
    const options = {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/favicon-32x32.png",
      tag: data.data?.tag || undefined,
      renotify: !!data.data?.tag, // Vibrate again if same tag
      data: {
        url: data.data?.url || "/",
      },
      actions: [],
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback for non-JSON payloads
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("EnviroBase", {
        body: text,
        icon: "/icons/icon-192x192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Focus existing window if one is open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
