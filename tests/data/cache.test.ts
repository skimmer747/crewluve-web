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
