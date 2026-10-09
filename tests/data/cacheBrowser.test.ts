// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { CACHE_KEY, localScheduleCache } from '../../src/data/cache'
import { RawBuilder } from '../../src/data/rowBuilder'

const raw = new RawBuilder(Date.UTC(2026, 9, 9)).pilot('Alex', 'SDF', 'LEX').build()

afterEach(() => {
  localStorage.clear()
})

describe('localScheduleCache in a browser', () => {
  it('uses the page localStorage by default', () => {
    const cache = localScheduleCache()
    cache.save(raw)
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!)).toEqual(raw)
    expect(localScheduleCache().load()).toEqual(raw)
    cache.clear()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('leaves the rest of localStorage alone', () => {
    localStorage.setItem('crewluve-auth', '{"session":true}')
    const cache = localScheduleCache()
    cache.save(raw)
    cache.clear()
    expect(localStorage.getItem('crewluve-auth')).toBe('{"session":true}')
  })

  it('carries on without a cache where the browser blocks site data', () => {
    // Some browsers throw when window.localStorage itself is touched.
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('blocked', 'SecurityError') } })
    try {
      const cache = localScheduleCache()
      expect(() => cache.save(raw)).not.toThrow()
      expect(cache.load()).toBeNull()
      expect(() => cache.clear()).not.toThrow()
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
      else delete (window as { localStorage?: unknown }).localStorage
    }
  })
})
