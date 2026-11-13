import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface RestTimer {
  /** Epoch ms when the rest ends, or null when idle. */
  endsAt: number | null
  total: number
  label: string
  start: (seconds: number, label: string) => void
  add: (seconds: number) => void
  stop: () => void
}

const Ctx = createContext<RestTimer | null>(null)
export const useRestTimer = () => useContext(Ctx)!

let audio: AudioContext | null = null
/** Must be called from a user gesture first on iOS so later beeps are allowed. */
export function primeAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* audio unavailable */
  }
}

function beep() {
  if (!audio) return
  const t = audio.currentTime
  for (const [i, f] of [880, 880, 1320].entries()) {
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t + i * 0.22)
    g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.22 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.18)
    o.connect(g).connect(audio.destination)
    o.start(t + i * 0.22)
    o.stop(t + i * 0.22 + 0.2)
  }
}

async function alertDone(label: string) {
  // Android/Chromium vibrate; iOS Safari has no Vibration API, so the beep covers it.
  navigator.vibrate?.([400, 150, 400, 150, 400])
  beep()
  if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.showNotification('Rest over', { body: `Next: ${label}`, tag: 'rest', renotify: true } as NotificationOptions)
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [label, setLabel] = useState('')
  const fired = useRef(false)

  const start = useCallback((seconds: number, l: string) => {
    primeAudio()
    fired.current = false
    setTotal(seconds)
    setLabel(l)
    setEndsAt(Date.now() + seconds * 1000)
  }, [])
  const add = useCallback((s: number) => {
    setEndsAt((e) => (e ? e + s * 1000 : e))
    setTotal((t) => t + s)
  }, [])
  const stop = useCallback(() => setEndsAt(null), [])

  useEffect(() => {
    if (!endsAt) return
    const tick = () => {
      if (!fired.current && Date.now() >= endsAt) {
        fired.current = true
        void alertDone(label)
      }
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, label])

  return <Ctx.Provider value={{ endsAt, total, label, start, add, stop }}>{children}</Ctx.Provider>
}

export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}

export const fmtClock = (secs: number) => {
  const s = Math.max(0, Math.ceil(secs))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
