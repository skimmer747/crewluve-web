import { describe, expect, it, vi } from 'vitest'
import {
  clearOldSignIn, DEVICE_KEY, localPartnerStore, newKey, OLD_SIGN_IN_KEYS, PENDING_KEY, SUMMARY_KEY, type KeyValueStore,
} from '../../src/partner/store'
import { key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const SUMMARY = { partnerId: PARTNER_A, updatedAt: '2026-10-26T17:36:00.123+00:00', status: { schemaVersion: 1 }, checkedAt: 5 }

describe('localPartnerStore (piece 5a §4.2)', () => {
  it('keeps the device, the pending key and the summary for the next visit', () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    expect(store.saveDevice({ key: key(1), partnerId: PARTNER_A })).toBe(true)
    expect(store.savePendingKey(key(2))).toBe(true)
    store.saveSummary(SUMMARY)
    const nextVisit = localPartnerStore(storage)
    expect(nextVisit.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(nextVisit.pendingKey()).toBe(key(2))
    expect(nextVisit.summary()).toEqual(SUMMARY)
    expect([...storage.data.keys()].sort()).toEqual([DEVICE_KEY, PENDING_KEY, SUMMARY_KEY].sort())
  })

  it("keeps an answer from before the pilot's first summary, with no updated_at", () => {
    const store = localPartnerStore(memoryStorage())
    store.saveSummary({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
  })

  it('forgets the device and the summary, keeping a pending key as Crewluve does; and the pending key on its own', () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    store.saveDevice({ key: key(1), partnerId: PARTNER_A })
    store.savePendingKey(key(2))
    store.saveSummary(SUMMARY)
    store.forget()
    expect([store.device(), store.summary()]).toEqual([null, null])
    // A join whose answer was lost tries again with the same key, so the same device answers (spec §4.3).
    expect(store.pendingKey()).toBe(key(2))
    store.forgetPendingKey()
    expect(store.pendingKey()).toBeNull()
    expect(storage.data.size).toBe(0)
  })

  it('ignores what does not look right', () => {
    const storage = memoryStorage()
    storage.setItem(DEVICE_KEY, JSON.stringify({ key: 'ABC', partnerId: PARTNER_A }))
    storage.setItem(PENDING_KEY, '{not json')
    storage.setItem(SUMMARY_KEY, JSON.stringify({ partnerId: PARTNER_A, updatedAt: 5, checkedAt: 1 }))
    const store = localPartnerStore(storage)
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
  })

  it('ignores a kept key that is not 64 lower-case hex characters', () => {
    const storage = memoryStorage()
    storage.setItem(PENDING_KEY, JSON.stringify(key(0xabc).toUpperCase()))
    storage.setItem(DEVICE_KEY, JSON.stringify({ key: key(1).slice(1), partnerId: PARTNER_A }))
    const store = localPartnerStore(storage)
    expect([store.pendingKey(), store.device()]).toEqual([null, null])
  })

  it('refuses to save a key that is not 64 lower-case hex characters', () => {
    const store = localPartnerStore(memoryStorage())
    expect(store.savePendingKey(key(0xabc).toUpperCase())).toBe(false)
    expect(store.saveDevice({ key: 'not-a-key', partnerId: PARTNER_A })).toBe(false)
    expect([store.pendingKey(), store.device()]).toEqual([null, null])
  })

  it("clears the last summary when a new one can't be saved, so another pilot's never shows", () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    store.saveSummary(SUMMARY)
    const setItem = storage.setItem
    storage.setItem = (name, value) => {
      if (name === SUMMARY_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      setItem(name, value)
    }
    store.saveSummary({ ...SUMMARY, partnerId: PARTNER_B })
    expect(store.summary()).toBeNull()
  })

  it('says so when it cannot save, and reads nothing, when the browser blocks storage', () => {
    const refuse = () => {
      throw new Error('SecurityError')
    }
    const blocked: KeyValueStore = { getItem: refuse, setItem: refuse, removeItem: refuse }
    const store = localPartnerStore(blocked)
    expect(store.saveDevice({ key: key(1), partnerId: PARTNER_A })).toBe(false)
    expect(store.savePendingKey(key(2))).toBe(false)
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
    expect(() => store.forget()).not.toThrow()
    expect(() => clearOldSignIn(blocked)).not.toThrow()
    expect(localPartnerStore(null).savePendingKey(key(2))).toBe(false)
  })

  it("works on a page whose localStorage the browser refuses: nothing saved, nothing thrown", () => {
    const own = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    try {
      expect(localPartnerStore().savePendingKey(key(1))).toBe(false)
      expect(localPartnerStore().device()).toBeNull()
      expect(() => clearOldSignIn()).not.toThrow()
    } finally {
      if (own) Object.defineProperty(globalThis, 'localStorage', own)
      else delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})

describe('clearOldSignIn', () => {
  it("deletes the password sign-in's session and schedule cache, and nothing else", () => {
    const storage = memoryStorage()
    for (const name of [...OLD_SIGN_IN_KEYS, DEVICE_KEY, 'other']) storage.setItem(name, '1')
    clearOldSignIn(storage)
    expect([...storage.data.keys()].sort()).toEqual([DEVICE_KEY, 'other'].sort())
  })
})

describe('newKey', () => {
  it('makes 32 random bytes as 64 lower-case hex characters, new each time', () => {
    const first = newKey()
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(newKey()).not.toBe(first)
  })

  it('writes each byte as two hex digits, keeping leading zeros', () => {
    const fill = (array: Uint8Array) => {
      array.set([0x00, 0x0f, 0xa0, 0xff])
      return array
    }
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation(fill as unknown as typeof crypto.getRandomValues)
    try {
      expect(newKey().startsWith('000fa0ff')).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
})
