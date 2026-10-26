import { describe, expect, it } from 'vitest'
import {
  clearOldSignIn, DEVICE_KEY, localPartnerStore, newKey, OLD_SIGN_IN_KEYS, PENDING_KEY, SUMMARY_KEY, type KeyValueStore,
} from '../../src/partner/store'
import { key, memoryStorage, PARTNER_A } from '../fixtures/partner'

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

  it('forgets the pending key alone, and everything on forget', () => {
    const storage = memoryStorage()
    const store = localPartnerStore(storage)
    store.saveDevice({ key: key(1), partnerId: PARTNER_A })
    store.savePendingKey(key(2))
    store.saveSummary(SUMMARY)
    store.forgetPendingKey()
    expect(store.pendingKey()).toBeNull()
    expect(store.device()).not.toBeNull()
    store.forget()
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, null, null])
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
    expect(localPartnerStore(null).savePendingKey(key(2))).toBe(false)
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
})
