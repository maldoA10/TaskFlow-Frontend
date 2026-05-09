'use client'

import { apiFetch } from './api'

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { publicKey } = await apiFetch<{ publicKey: string | null }>('/push/vapid-public-key', {
      auth: false,
    })
    return publicKey
  } catch {
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
}

function subToPayload(sub: PushSubscription) {
  const raw = sub.toJSON()
  return {
    endpoint: raw.endpoint!,
    keys: {
      p256dh: raw.keys!.p256dh,
      auth: raw.keys!.auth,
    },
  }
}

/**
 * Register push subscription on every login.
 * - If permission was denied, returns silently (no re-prompt).
 * - If already granted, no permission dialog appears.
 * - Always sends the current subscription to the backend so the DB stays in
 *   sync even if a previous session cleared the records.
 * No sessionStorage guard — idempotency is handled server-side via deleteMany.
 */
export async function registerPush(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return
  if (Notification.permission === 'denied') return

  const vapidKey = await getVapidPublicKey()
  if (!vapidKey) {
    console.warn('[Push] No VAPID key available from server')
    return
  }

  try {
    // requestPermission() returns immediately with current state if already
    // granted — no modal shown to the user.
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }))

    const payload = subToPayload(subscription)
    await apiFetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    console.info('[Push] Subscription registered for this user')
  } catch (err) {
    console.warn('[Push] Registration failed:', err)
  }
}

/**
 * Unsubscribe from push and remove from the backend. Called on logout.
 * After this the browser will create a fresh subscription on the next login.
 */
export async function unregisterPush(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      const { endpoint } = subToPayload(subscription)
      await apiFetch('/push/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint }),
      }).catch(() => {})
      // Invalidate the browser-side subscription so the next user on this
      // browser gets a brand-new endpoint.
      await subscription.unsubscribe()
    }
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err)
  }
}
