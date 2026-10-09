import type { RawSchedule } from './rows'

export const CACHE_KEY = 'crewluve.schedule.v1'

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface ScheduleCache {
  load(): RawSchedule | null
  save(raw: RawSchedule): void
  clear(): void
}

const TABLES = ['pilotInfos', 'trips', 'dutyPeriods', 'flights', 'commutes', 'jumpseats', 'trainingEvents', 'manualEvents', 'eventCategories'] as const

function isRawSchedule(value: unknown): value is RawSchedule {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return typeof o.fetchedAt === 'number' && TABLES.every((t) => Array.isArray(o[t]))
}

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The last fetched schedule, kept on this device so the page opens instantly and works offline (spec §5). */
export function localScheduleCache(store: KeyValueStore | null = browserStorage()): ScheduleCache {
  return {
    load() {
      try {
        const text = store?.getItem(CACHE_KEY)
        const value: unknown = text ? JSON.parse(text) : null
        return isRawSchedule(value) ? value : null
      } catch {
        return null
      }
    },
    save(raw) {
      try {
        store?.setItem(CACHE_KEY, JSON.stringify(raw))
      } catch {
        // Storage full or blocked: carry on without a cache.
      }
    },
    clear() {
      try {
        store?.removeItem(CACHE_KEY)
      } catch {
        // Nothing to clear.
      }
    },
  }
}

/** The demo keeps nothing. */
export const noScheduleCache: ScheduleCache = {
  load: () => null,
  save: () => {},
  clear: () => {},
}
