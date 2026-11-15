import { describe, expect, it } from 'vitest'
import { MAP_STYLE_NAMES } from '../../src/copy/tripMap'
import { APPLE_MAP_STYLES, keepMapStyle, MAP_STYLE_KEY, nextMapStyle, readMapStyle } from '../../src/map/appleMapStyle'

const memory = () => {
  const kept = new Map<string, string>()
  return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), kept }
}
const blocked = {
  getItem: (): string | null => {
    throw new Error('blocked')
  },
  setItem: (): void => {
    throw new Error('blocked')
  },
}

describe('the map styles (Apple Maps spec §4.1)', () => {
  it('cycles Hybrid, Map, Satellite, as in the app', () => {
    expect(APPLE_MAP_STYLES).toEqual(['hybrid', 'standard', 'satellite'])
    expect(APPLE_MAP_STYLES.map(nextMapStyle)).toEqual(['standard', 'satellite', 'hybrid'])
    expect(APPLE_MAP_STYLES.map((s) => MAP_STYLE_NAMES[s])).toEqual(['Hybrid', 'Map', 'Satellite'])
  })

  it('starts on Hybrid, and keeps the chosen style', () => {
    const storage = memory()
    expect(readMapStyle(storage)).toBe('hybrid')
    keepMapStyle('satellite', storage)
    expect(storage.kept.get(MAP_STYLE_KEY)).toBe('satellite')
    expect(readMapStyle(storage)).toBe('satellite')
  })

  it('ignores a value it doesn’t know, and storage that refuses', () => {
    const storage = memory()
    storage.setItem(MAP_STYLE_KEY, 'terrain')
    expect(readMapStyle(storage)).toBe('hybrid')
    expect(readMapStyle(blocked)).toBe('hybrid')
    expect(readMapStyle(null)).toBe('hybrid')
    expect(() => keepMapStyle('standard', blocked)).not.toThrow()
  })
})
