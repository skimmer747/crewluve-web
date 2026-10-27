/**
 * What this browser keeps in localStorage (piece 5a §4.2): the device it's connected with, the key a join is trying,
 * and the last summary, so a return visit shows it at once. None of it is the pilot's sign-in: the keys go to the
 * partner door, and so does the summary's updated_at, as the next poll's p_since.
 */
export const DEVICE_KEY = 'crewluve.device.v1'
export const PENDING_KEY = 'crewluve.pendingKey.v1'
export const SUMMARY_KEY = 'crewluve.summary.v1'
/** The password sign-in's stored session, from before piece 5a. */
export const OLD_SESSION_KEY = 'crewluve-auth'
/** The password sign-in's session and schedule cache, from before piece 5a: deleted on load. */
export const OLD_SIGN_IN_KEYS: readonly string[] = [OLD_SESSION_KEY, 'crewluve.schedule.v1']

/** The door's rule for a device key (partner-api.md, "The device key"). */
const KEY_SHAPE = /^[0-9a-f]{64}$/

export interface Device {
  key: string
  partnerId: string
}

/** partner_view's last answer for this browser's device, and when the door last answered at all. */
export interface StoredSummary {
  partnerId: string
  /** updated_at exactly as received, for the next call's p_since; null before the pilot's first summary. */
  updatedAt: string | null
  /** The summary as received; null before the pilot's first. */
  status: unknown
  /** When the door last answered, epoch ms: the footer's "Checked". */
  checkedAt: number
}

export interface PartnerStore {
  device(): Device | null
  /** False when it couldn't be saved, and then the browser isn't connected with it. */
  saveDevice(device: Device): boolean
  pendingKey(): string | null
  /** False when it couldn't be saved, and then it must not be sent. */
  savePendingKey(key: string): boolean
  forgetPendingKey(): void
  summary(): StoredSummary | null
  saveSummary(summary: StoredSummary): void
  /**
   * Disconnected, or sharing ended: the device and the summary go. A pending key stays, as in Crewluve, so a join
   * whose answer was lost gets the same device when it's tried again (piece 5a §4.3).
   */
  forget(): void
}

/** The part of localStorage the store uses. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** localStorage, or null where the browser refuses it (blocked site data). */
function pageStorage(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function localPartnerStore(storage: KeyValueStore | null = pageStorage()): PartnerStore {
  const read = (name: string): unknown => {
    try {
      const saved = storage?.getItem(name)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }
  const write = (name: string, value: unknown): boolean => {
    try {
      if (!storage) return false
      storage.setItem(name, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }
  const remove = (name: string) => {
    try {
      storage?.removeItem(name)
    } catch {
      // Nothing more can be done. A device or summary left behind is cleared again by the next sharing_ended, and a
      // pending key left behind is what the next join tries first.
    }
  }
  return {
    device() {
      const d = read(DEVICE_KEY) as Partial<Device> | null
      return d && typeof d.key === 'string' && KEY_SHAPE.test(d.key) && typeof d.partnerId === 'string' ? { key: d.key, partnerId: d.partnerId } : null
    },
    saveDevice: (device) => KEY_SHAPE.test(device.key) && write(DEVICE_KEY, device),
    pendingKey() {
      const key = read(PENDING_KEY)
      return typeof key === 'string' && KEY_SHAPE.test(key) ? key : null
    },
    savePendingKey: (key) => KEY_SHAPE.test(key) && write(PENDING_KEY, key),
    forgetPendingKey: () => remove(PENDING_KEY),
    summary() {
      const s = read(SUMMARY_KEY) as Partial<StoredSummary> | null
      if (!s || typeof s.partnerId !== 'string' || typeof s.checkedAt !== 'number') return null
      if (s.updatedAt !== null && typeof s.updatedAt !== 'string') return null
      return { partnerId: s.partnerId, updatedAt: s.updatedAt, status: s.status ?? null, checkedAt: s.checkedAt }
    },
    saveSummary: (summary) => {
      // One that can't be saved mustn't leave the last one, which may be another pilot's, to show on the next visit.
      if (!write(SUMMARY_KEY, summary)) remove(SUMMARY_KEY)
    },
    forget() {
      remove(DEVICE_KEY)
      remove(SUMMARY_KEY)
    },
  }
}

/**
 * Whether this browser still holds the password sign-in's session: it signed in with the pilot's password before piece
 * 5a (§8). The schedule cache alone doesn't count. Only a read, so it can be asked before clearOldSignIn deletes it.
 */
export function hadPasswordSignIn(storage: KeyValueStore | null = pageStorage()): boolean {
  try {
    return storage?.getItem(OLD_SESSION_KEY) != null
  } catch {
    return false
  }
}

/** Deletes the password sign-in's leftovers (piece 5a §4.2): its stored session and its schedule cache. */
export function clearOldSignIn(storage: KeyValueStore | null = pageStorage()): void {
  for (const name of OLD_SIGN_IN_KEYS) {
    try {
      storage?.removeItem(name)
    } catch {
      // Blocked storage holds nothing to clear.
    }
  }
}

/** A new device key: 32 random bytes as 64 lower-case hex characters, from the browser's own random source. */
export function newKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
}
