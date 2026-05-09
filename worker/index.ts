// Custom Service Worker additions — merged into the next-pwa generated SW.
// Handles push notifications and notification click events.

declare const self: ServiceWorkerGlobalScope

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: PushPayload
  try {
    data = event.data.json() as PushPayload
  } catch {
    data = { title: 'TaskFlow', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
      vibrate: [200, 100, 200],
      tag: 'taskflow-notification',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = (event.notification.data?.url as string | undefined) ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const wc = client as WindowClient
          if ('navigate' in wc && 'focus' in wc) {
            return wc.focus().then((c) => c.navigate(url))
          }
        }
        return self.clients.openWindow(url)
      })
  )
})
