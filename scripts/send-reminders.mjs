// Sends due workout reminders via Web Push. Run by .github/workflows/reminders.yml
// on a 15-minute schedule — no server needed.
//
// Env:
//   PUSH_CONFIG        JSON copied from the app (Settings → Copy push config).
//                      May also be an array of configs (several devices).
//   VAPID_PUBLIC_KEY   from `npm run vapid`
//   VAPID_PRIVATE_KEY  from `npm run vapid`
//   VAPID_SUBJECT      optional, mailto: or https: contact for the push service
//   WINDOW_MINUTES     optional, default 15 — must match the cron interval
//   FORCE=1            optional, send immediately regardless of schedule (testing)
import webpush from 'web-push'

const { PUSH_CONFIG, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
const subject = process.env.VAPID_SUBJECT || 'https://github.com'
const windowMin = Number(process.env.WINDOW_MINUTES || 15)
const force = process.env.FORCE === '1'

if (!PUSH_CONFIG || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.log('PUSH_CONFIG / VAPID keys not set — nothing to do.')
  process.exit(0)
}
webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/** Weekday + minutes-since-midnight for `date` in an IANA time zone. */
function localParts(date, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  )
  return { day: p.weekday.slice(0, 3).toLowerCase(), minutes: Number(p.hour) * 60 + Number(p.minute) }
}

// The window this run is responsible for: (slotEnd - window, slotEnd], where slotEnd
// is "now" floored to the interval. GitHub cron runs are often a few minutes late;
// flooring keeps each reminder in exactly one run as long as the delay < the interval.
const ms = windowMin * 60_000
const slotEnd = new Date(Math.floor(Date.now() / ms) * ms)

const configs = [JSON.parse(PUSH_CONFIG)].flat()
let failures = 0
for (const cfg of configs) {
  const tz = cfg.timezone || 'UTC'
  const { day, minutes } = localParts(slotEnd, tz)
  const time = cfg.times?.[day]
  if (!force) {
    if (!time) continue
    const [h, m] = time.split(':').map(Number)
    const due = h * 60 + m
    if (!(due > minutes - windowMin && due <= minutes)) continue
  }
  const lift = (cfg.liftDays ?? ['mon', 'wed', 'fri']).includes(day)
  const payload = JSON.stringify({
    title: lift ? 'Lift day 🏋️' : 'Walk / bike day 🚲',
    body: lift ? "Tap to open today's workout." : 'Get your 30–45 minutes in.',
    url: cfg.url,
  })
  try {
    await webpush.sendNotification(cfg.subscription, payload, { TTL: 3600 })
    console.log(`Sent ${day} ${time ?? '(forced)'} reminder (${tz}).`)
  } catch (e) {
    failures++
    console.error(`Push failed (${e.statusCode ?? '?'}):`, e.body || e.message)
    if (e.statusCode === 404 || e.statusCode === 410)
      console.error('Subscription expired — re-enable reminders in the app and update PUSH_CONFIG.')
  }
}
process.exit(failures ? 1 : 0)
