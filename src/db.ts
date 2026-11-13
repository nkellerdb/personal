import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Session, Settings } from './types'

interface WorkoutDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { startedAt: number }
  }
  kv: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<WorkoutDB>> | null = null

// Shared by the app and the service worker (reminder checks).
export function db() {
  dbPromise ??= openDB<WorkoutDB>('workout-tracker', 1, {
    upgrade(d) {
      const sessions = d.createObjectStore('sessions', { keyPath: 'id' })
      sessions.createIndex('startedAt', 'startedAt')
      d.createObjectStore('kv')
    },
  })
  return dbPromise
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lb',
  reminders: { enabled: false, times: { mon: '07:00', wed: '07:00', fri: '07:00' } },
}

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get('kv', 'settings')) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(s: Settings) {
  await (await db()).put('kv', s, 'settings')
}

/** All sessions, newest first. */
export async function allSessions(): Promise<Session[]> {
  const list = await (await db()).getAllFromIndex('sessions', 'startedAt')
  return list.reverse()
}

export async function saveSession(s: Session) {
  await (await db()).put('sessions', s)
}

export async function deleteSession(id: string) {
  await (await db()).delete('sessions', id)
}

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined
}

export async function setKV(key: string, value: unknown) {
  await (await db()).put('kv', value, key)
}
