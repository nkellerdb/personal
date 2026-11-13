import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, allSessions, deleteSession, getSettings, saveSession, saveSettings } from './db'
import { dayById, inProgress, uid } from './logic'
import { primeAudio } from './timer'
import type { Session, Settings } from './types'
import { HistoryView } from './components/HistoryView'
import { RestTimerBar } from './components/RestTimerBar'
import { SettingsView } from './components/SettingsView'
import { TodayView } from './components/TodayView'
import { WorkoutView } from './components/WorkoutView'

type Tab = 'today' | 'history' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const reload = useCallback(async () => setSessions(await allSessions()), [])
  useEffect(() => {
    void reload()
    void getSettings().then(setSettings)
  }, [reload])

  const updateSettings = (s: Settings) => {
    setSettings(s)
    void saveSettings(s)
  }

  const upsert = (s: Session) => {
    setSessions((list) => {
      const rest = (list ?? []).filter((x) => x.id !== s.id)
      return [s, ...rest].sort((a, b) => b.startedAt - a.startedAt)
    })
    void saveSession(s)
  }

  if (!sessions) return <div className="splash" />
  const active = inProgress(sessions)

  const start = (dayId: string) => {
    primeAudio()
    const last = sessions.find((s) => s.dayId !== 'cardio')
    upsert({ id: uid(), dayId, mode: last?.mode ?? 'gym', startedAt: Date.now(), sets: {} })
    setTab('today')
  }

  return (
    <div className="app">
      <main>
        {tab === 'today' &&
          (active && dayById(active.dayId) ? (
            <WorkoutView
              session={active}
              history={sessions}
              unit={settings.unit}
              onChange={upsert}
              onFinish={() => upsert({ ...active, finishedAt: Date.now() })}
              onDiscard={() => {
                setSessions(sessions.filter((s) => s.id !== active.id))
                void deleteSession(active.id)
              }}
            />
          ) : (
            <TodayView
              sessions={sessions}
              onStart={start}
              onLogCardio={() => {
                const now = Date.now()
                upsert({ id: uid(), dayId: 'cardio', mode: 'home', startedAt: now, finishedAt: now, sets: {} })
              }}
            />
          ))}
        {tab === 'history' && (
          <HistoryView
            sessions={sessions}
            unit={settings.unit}
            onDelete={(id) => {
              setSessions(sessions.filter((s) => s.id !== id))
              void deleteSession(id)
            }}
          />
        )}
        {tab === 'settings' && <SettingsView settings={settings} onChange={updateSettings} onImported={reload} />}
      </main>

      <RestTimerBar />

      <nav className="tabbar" aria-label="Main">
        {(
          [
            ['today', active ? 'Workout' : 'Today', 'M4 12h16M12 4v16'],
            ['history', 'History', 'M4 19l5-6 4 3 7-9'],
            ['settings', 'Settings', 'M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h2M19 12h2M12 3v2M12 19v2'],
          ] as const
        ).map(([id, label, d]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d={d} />
            </svg>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
