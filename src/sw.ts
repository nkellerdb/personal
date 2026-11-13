/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { allSessions, getKV, getSettings, setKV } from './db'
import { WEEKDAYS } from './types'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: every navigation gets the precached index.html, so the app opens offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)))

// Demo GIF/MP4 files are cached the first time they're viewed.
registerRoute(
  ({ url }) => url.pathname.startsWith(`${import.meta.env.BASE_URL}demos/`),
  new CacheFirst({ cacheName: 'demos', plugins: [new ExpirationPlugin({ maxEntries: 60 })] }),
)

const ICON = `${import.meta.env.BASE_URL}icon-192.png`

// ---- Web Push (sent by the scheduled GitHub Action, see scripts/send-reminders.mjs) ----
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Workout time', {
      body: data.body ?? "Open the app to see today's workout.",
      icon: ICON,
      badge: ICON,
      tag: 'reminder',
      data: { url: data.url ?? self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) ?? self.registration.scope
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = wins.find((w) => w.url.startsWith(self.registration.scope))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })(),
  )
})

// ---- Local fallback: Periodic Background Sync (Chromium installed PWAs) ----
async function showDueReminder() {
  const settings = await getSettings()
  if (!settings.reminders.enabled) return
  const now = new Date()
  const time = settings.reminders.times[WEEKDAYS[now.getDay()]]
  if (!time) return
  const [h, m] = time.split(':').map(Number)
  const due = new Date(now)
  due.setHours(h, m, 0, 0)
  const today = now.toDateString()
  if (now < due || (await getKV<string>('lastReminder')) === today) return
  const startOfDay = new Date(now).setHours(0, 0, 0, 0)
  if ((await allSessions()).some((s) => s.startedAt >= startOfDay)) return // already trained
  await setKV('lastReminder', today)
  await self.registration.showNotification('Workout time', {
    body: "Open the app to see today's workout.",
    icon: ICON,
    tag: 'reminder',
  })
}

self.addEventListener('periodicsync', ((event: ExtendableEvent & { tag: string }) => {
  if (event.tag === 'workout-reminder') event.waitUntil(showDueReminder())
}) as EventListener)
