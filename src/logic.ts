import programJson from './program.json'
import { WEEKDAYS, type Day, type Exercise, type Mode, type Program, type Session, type SetLog, type Weekday } from './types'

export const program = programJson as Program

export const dayById = (id: string): Day | undefined => program.days.find((d) => d.id === id)

export function allExercises(): Exercise[] {
  const seen = new Map<string, Exercise>()
  for (const d of program.days) for (const b of d.blocks) for (const e of b.exercises) if (!seen.has(e.id)) seen.set(e.id, e)
  return [...seen.values()]
}

export const weekdayOf = (date: Date): Weekday => WEEKDAYS[date.getDay()]
export const isLiftDay = (date: Date) => program.liftDays.includes(weekdayOf(date))

const isLift = (s: Session) => s.dayId !== 'cardio'

/** The next day in the A → B → C rotation, after the most recently finished lift session. */
export function nextDayId(sessions: Session[]): string {
  const last = sessions.find((s) => isLift(s) && s.finishedAt)
  if (!last) return program.rotation[0]
  const i = program.rotation.indexOf(last.dayId)
  return program.rotation[(i + 1) % program.rotation.length]
}

/** The next calendar date (today included) that is a lift day. */
export function nextLiftDate(from = new Date()): Date {
  const d = new Date(from)
  for (let i = 0; i < 7; i++) {
    if (isLiftDay(d)) return d
    d.setDate(d.getDate() + 1)
  }
  return from
}

export function inProgress(sessions: Session[]): Session | undefined {
  return sessions.find((s) => !s.finishedAt && isLift(s))
}

/**
 * Most recent finished session that logged this exercise. Prefers the same mode
 * (gym weights and home weights aren't comparable), falling back to any mode.
 */
export function lastLog(sessions: Session[], exerciseId: string, mode: Mode, excludeId?: string) {
  const candidates = sessions.filter(
    (s) => s.finishedAt && s.id !== excludeId && s.sets[exerciseId]?.some((x) => x.done),
  )
  const s = candidates.find((c) => c.mode === mode) ?? candidates[0]
  return s ? { session: s, sets: s.sets[exerciseId].filter((x) => x.done) } : undefined
}

/** True when every prescribed set was completed at (or above) the top of the rep range. */
export function hitTopOfRange(sets: SetLog[] | undefined, ex: Exercise): boolean {
  if (!sets) return false
  const done = sets.filter((s) => s.done && s.reps != null)
  return done.length >= ex.sets && done.every((s) => (s.reps ?? 0) >= ex.repRange[1])
}

export function emptySets(ex: Exercise, prev?: SetLog[]): SetLog[] {
  return Array.from({ length: ex.sets }, (_, i) => ({
    weight: prev?.[i]?.weight ?? prev?.[prev.length - 1]?.weight ?? null,
    reps: null,
    done: false,
  }))
}

export function topSet(sets: SetLog[]): SetLog | undefined {
  return sets
    .filter((s) => s.done && s.weight != null)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0]
}

/** Epley estimated one-rep max. */
export const e1rm = (w: number, r: number) => (r <= 1 ? w : Math.round(w * (1 + r / 30)))

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(ts).toLocaleDateString(undefined, opts)
}
