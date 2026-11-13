export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
}

export type Mode = 'gym' | 'home'

export interface Demo {
  /** File name inside public/demos (GIF, MP4 or WebM). */
  file?: string
  /** Fallback link, used when the local file is missing. */
  youtube?: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  repRange: [number, number]
  gym: string
  home: string
  cues: string[]
  demo?: Demo
}

export interface Block {
  type: 'main' | 'superset'
  exercises: Exercise[]
}

export interface Day {
  id: string
  name: string
  focus: string
  blocks: Block[]
}

export interface Program {
  name: string
  rotation: string[]
  liftDays: Weekday[]
  rest: { main: number; superset: number }
  cardio: { title: string; description: string }
  days: Day[]
}

export interface SetLog {
  weight: number | null
  reps: number | null
  done: boolean
}

export interface Session {
  id: string
  /** Program day id ("A", "B", "C") or "cardio". */
  dayId: string
  mode: Mode
  startedAt: number
  finishedAt?: number
  /** Logged sets keyed by exercise id. */
  sets: Record<string, SetLog[]>
}

export interface ReminderSettings {
  enabled: boolean
  /** Reminder time ("HH:MM", 24h) per weekday; missing = no reminder that day. */
  times: Partial<Record<Weekday, string>>
}

export interface Settings {
  unit: 'lb' | 'kg'
  reminders: ReminderSettings
}
