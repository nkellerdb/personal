import { program } from './logic'
import type { Settings } from './types'

/** Public VAPID key, injected at build time (repo variable VAPID_PUBLIC_KEY → VITE_VAPID_PUBLIC_KEY). */
export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || ''

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function support() {
  return {
    notifications: 'Notification' in window,
    push: 'serviceWorker' in navigator && 'PushManager' in window,
    periodicSync: 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype,
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Subscribe this device to Web Push. Returns null when no VAPID key is configured. */
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY || !support().push) return null
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

export async function unsubscribePush() {
  if (!support().push) return
  const reg = await navigator.serviceWorker.ready
  await (await reg.pushManager.getSubscription())?.unsubscribe()
}

/**
 * Fallback for browsers that support Periodic Background Sync (Chromium, installed PWA):
 * the service worker wakes up roughly hourly and shows due reminders locally.
 */
export async function registerPeriodicSync(on: boolean) {
  if (!support().periodicSync) return false
  const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
    periodicSync: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> }
  }
  try {
    if (on) await reg.periodicSync.register('workout-reminder', { minInterval: 60 * 60 * 1000 })
    else await reg.periodicSync.unregister('workout-reminder')
    return true
  } catch {
    return false
  }
}

/** The JSON the scheduled GitHub Action needs (stored as the PUSH_CONFIG secret). */
export function pushConfig(settings: Settings, sub: PushSubscription) {
  return JSON.stringify(
    {
      subscription: sub.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      times: settings.reminders.times,
      liftDays: program.liftDays,
      url: location.origin + import.meta.env.BASE_URL,
    },
    null,
    2,
  )
}

export async function testNotification() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Workout reminder', {
    body: 'This is what your reminders will look like.',
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icon-192.png`,
    tag: 'test',
  })
}
