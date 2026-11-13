import { useEffect, useState } from 'react'
import { allSessions, saveSession } from '../db'
import {
  VAPID_PUBLIC_KEY,
  ensurePermission,
  isIOS,
  isStandalone,
  pushConfig,
  registerPeriodicSync,
  subscribePush,
  support,
  testNotification,
  unsubscribePush,
} from '../reminders'
import { WEEKDAYS, WEEKDAY_LABEL, type Session, type Settings, type Weekday } from '../types'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  onImported: () => void
}

export function SettingsView({ settings, onChange, onImported }: Props) {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [sub, setSub] = useState<PushSubscription | null>(null)
  const [msg, setMsg] = useState('')
  const sup = support()
  const r = settings.reminders

  useEffect(() => {
    if (!sup.push) return
    void navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then(setSub)
  }, [sup.push])

  const setTimes = (times: Settings['reminders']['times']) => onChange({ ...settings, reminders: { ...r, times } })
  const toggleDay = (d: Weekday) => {
    const times = { ...r.times }
    if (times[d]) delete times[d]
    else times[d] = '07:00'
    setTimes(times)
  }

  const enable = async () => {
    setMsg('')
    const p = await ensurePermission()
    setPerm(p)
    if (p !== 'granted') {
      setMsg(isIOS() && !isStandalone() ? 'On iPhone, add the app to your Home Screen first.' : 'Notifications are blocked.')
      return
    }
    try {
      const s = await subscribePush()
      setSub(s)
      const periodic = await registerPeriodicSync(true)
      onChange({ ...settings, reminders: { ...r, enabled: true } })
      setMsg(
        s
          ? 'Push enabled. Copy the push config below into your repo secrets.'
          : periodic
            ? 'Local reminders enabled (periodic background sync).'
            : 'Notifications allowed, but this build has no VAPID key, so scheduled push is off. See README.',
      )
    } catch (e) {
      setMsg(`Could not subscribe: ${(e as Error).message}`)
    }
  }

  const disable = async () => {
    await unsubscribePush()
    await registerPeriodicSync(false)
    setSub(null)
    onChange({ ...settings, reminders: { ...r, enabled: false } })
  }

  const copyConfig = async () => {
    if (!sub) return
    await navigator.clipboard.writeText(pushConfig(settings, sub))
    setMsg('Copied. Paste it as the PUSH_CONFIG secret (re-copy after changing times).')
  }

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(await allSessions(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `workouts-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importData = async (file: File) => {
    const list = JSON.parse(await file.text()) as Session[]
    for (const s of list) await saveSession(s)
    onImported()
    setMsg(`Imported ${list.length} sessions.`)
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="panel">
        <div className="panel-head">
          <h2>Units</h2>
          <div className="seg seg-small" role="radiogroup" aria-label="Units">
            {(['lb', 'kg'] as const).map((u) => (
              <button key={u} role="radio" aria-checked={settings.unit === u} onClick={() => onChange({ ...settings, unit: u })}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Workout reminders</h2>
          <span className={`badge ${r.enabled ? 'badge-on' : ''}`}>{r.enabled ? 'On' : 'Off'}</span>
        </div>

        <ul className="days">
          {WEEKDAYS.map((d) => (
            <li key={d}>
              <label>
                <input type="checkbox" checked={!!r.times[d]} onChange={() => toggleDay(d)} />
                {WEEKDAY_LABEL[d]}
              </label>
              <input
                type="time"
                value={r.times[d] ?? ''}
                disabled={!r.times[d]}
                onChange={(e) => setTimes({ ...r.times, [d]: e.target.value })}
                aria-label={`${WEEKDAY_LABEL[d]} reminder time`}
              />
            </li>
          ))}
        </ul>

        {isIOS() && !isStandalone() && (
          <p className="note">
            iPhone: tap <b>Share → Add to Home Screen</b>, open the app from there, then enable reminders (iOS 16.4+).
          </p>
        )}

        <div className="row">
          {r.enabled ? (
            <button className="btn btn-ghost" onClick={disable}>
              Turn off
            </button>
          ) : (
            <button className="btn btn-primary" onClick={enable} disabled={perm === 'unsupported'}>
              Enable reminders
            </button>
          )}
          {perm === 'granted' && (
            <button className="btn btn-ghost" onClick={() => void testNotification()}>
              Send test
            </button>
          )}
        </div>

        {sub && (
          <button className="btn btn-ghost full" onClick={copyConfig}>
            Copy push config
          </button>
        )}

        {msg && <p className="note">{msg}</p>}

        <dl className="status small muted">
          <dt>Permission</dt>
          <dd>{perm}</dd>
          <dt>Web Push</dt>
          <dd>{!sup.push ? 'not supported' : !VAPID_PUBLIC_KEY ? 'no VAPID key in this build' : sub ? 'subscribed' : 'not subscribed'}</dd>
          <dt>Background sync</dt>
          <dd>{sup.periodicSync ? 'supported' : 'not supported'}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Data</h2>
        <p className="muted small">Everything is stored on this device only (IndexedDB).</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={exportData}>
            Export JSON
          </button>
          <label className="btn btn-ghost">
            Import JSON
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
