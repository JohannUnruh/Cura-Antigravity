/* eslint-disable no-restricted-globals */

/**
 * Firebase Cloud Messaging Service Worker
 *
 * Empfängt Push-Benachrichtigungen im Hintergrund.
 * Minimalistisch gehalten – keine Firebase SDK Abhängigkeit im SW.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Push Event Handler
// ──────────────────────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
    console.log("[SW] Push-Event erhalten");

    let data = {};
    try {
        data = event.data?.json() || {};
    } catch {
        data = { title: "Cura Erinnerung", body: event.data?.text() || "" };
    }

    const notification = data.notification || {};
    const title = notification.title || data.title || "Cura Erinnerung";
    const body = notification.body || data.body || "Neue Benachrichtigung";
    const icon = notification.icon || "/favicon.ico";
    const badge = notification.badge || "/favicon.ico";
    const tag = notification.tag || `cura-${Date.now()}`;

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            data: data.data || data,
            requireInteraction: false,
            silent: false,
        })
    );
});

// ──────────────────────────────────────────────────────────────────────────────
// Notification Click Handler
// ──────────────────────────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
    console.log("[SW] Benachrichtigung angeklickt:", event.notification.title);

    event.notification.close();

    const data = event.notification.data || {};
    let urlToOpen = "/";

    if (data.relatedType === "consultation" && data.relatedId) {
        urlToOpen = `/consultations/${data.relatedId}`;
    } else if (data.relatedType === "client" && data.relatedId) {
        urlToOpen = `/clients/${data.relatedId}`;
    } else if (data.relatedType === "skbConsultation" && data.relatedId) {
        urlToOpen = `/consultations/skb/${data.relatedId}`;
    }

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});

// ──────────────────────────────────────────────────────────────────────────────
// Install & Activate
// ──────────────────────────────────────────────────────────────────────────────

self.addEventListener("install", () => {
    console.log("[SW] Service Worker installiert");
    self.skipWaiting();
});

self.addEventListener("activate", () => {
    console.log("[SW] Service Worker aktiviert");
    self.clients.claim();
});
