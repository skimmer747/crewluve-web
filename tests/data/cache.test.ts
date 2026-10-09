import { describe, expect, it } from 'vitest'
import { CACHE_KEY, localScheduleCache, noScheduleCache, type KeyValueStore } from '../../src/data/cache'
import { RawBuilder } from '../../src/data/rowBuilder'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => { data[key] = value },
    removeItem: (key) => { delete data[key] },
  }
}

const raw = new RawBuilder(Date.UTC(2026, 9, 9)).pilot('Alex', 'SDF', 'LEX').build()

describe('localScheduleCache', () => {
  it('round-trips the last schedule', () => {
    const store = memoryStore()
    const cache = localScheduleCache(store)
    cache.save(raw)
    expect(Object.keys(store.data)).toEqual([CACHE_KEY])
    expect(cache.load()).toEqual(raw)
  })

  it('ignores corrupt or foreign data', () => {
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: '{nope' })).load()).toBeNull()
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: '{"fetchedAt":1}' })).load()).toBeNull()
    expect(localScheduleCache(memoryStore()).load()).toBeNull()
  })

  it("keeps the schedule under 'crewluve.schedule.v1', the key sign-out removes (spec §9)", () => {
    expect(CACHE_KEY).toBe('crewluve.schedule.v1')
    const store = memoryStore()
    localScheduleCache(store).save(raw)
    expect(Object.keys(store.data)).toEqual(['crewluve.schedule.v1'])
    expect(localScheduleCache(memoryStore({ 'crewluve.schedule': JSON.stringify(raw) })).load()).toBeNull()
  })

  it('ignores data whose fetch time is missing or not a number', () => {
    const without = { ...raw } as Partial<typeof raw>
    delete without.fetchedAt
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: JSON.stringify(without) })).load()).toBeNull()
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: JSON.stringify({ ...raw, fetchedAt: '1760000000000' }) })).load()).toBeNull()
  })

  it.each([
    'pilotInfos', 'trips', 'dutyPeriods', 'flights', 'commutes', 'jumpseats', 'trainingEvents', 'manualEvents', 'eventCategories',
  ])('ignores data with no %s list', (table) => {
    const missing = { ...raw } as Record<string, unknown>
    delete missing[table]
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: JSON.stringify(missing) })).load()).toBeNull()
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: JSON.stringify({ ...raw, [table]: {} }) })).load()).toBeNull()
    expect(localScheduleCache(memoryStore({ [CACHE_KEY]: JSON.stringify(raw) })).load()).toEqual(raw)
  })

  it('ignores JSON that is not an object', () => {
    for (const text of ['null', '7', '"text"', '[]', 'true']) {
      expect(localScheduleCache(memoryStore({ [CACHE_KEY]: text })).load()).toBeNull()
    }
  })

  it('only removes its own key when cleared', () => {
    const store = memoryStore({ other: 'keep me' })
    const cache = localScheduleCache(store)
    cache.save(raw)
    cache.clear()
    expect(store.data).toEqual({ other: 'keep me' })
  })

  it('without a browser, the default cache holds nothing and never throws', () => {
    // Vitest runs this file in Node, where there is no window.localStorage.
    const cache = localScheduleCache()
    expect(() => cache.save(raw)).not.toThrow()
    expect(cache.load()).toBeNull()
    expect(() => cache.clear()).not.toThrow()
  })

  it('clears on sign-out', () => {
    const store = memoryStore()
    const cache = localScheduleCache(store)
    cache.save(raw)
    cache.clear()
    expect(cache.load()).toBeNull()
  })

  it('never throws when storage is blocked', () => {
    const blocked: KeyValueStore = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    }
    const cache = localScheduleCache(blocked)
    expect(() => cache.save(raw)).not.toThrow()
    expect(cache.load()).toBeNull()
    expect(() => cache.clear()).not.toThrow()
    expect(localScheduleCache(null).load()).toBeNull()
  })

  it('has a do-nothing cache for the demo', () => {
    noScheduleCache.save(raw)
    expect(noScheduleCache.load()).toBeNull()
  })
})
