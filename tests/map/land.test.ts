import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseLand } from '../../src/map/land'

describe('the land (moving map spec §11)', () => {
  it('turns rings of [lng, lat] into places', () => {
    expect(parseLand([[[0, 1], [2, 3], [4, 5], [0, 1]]])).toEqual([[{ lat: 1, lng: 0 }, { lat: 3, lng: 2 }, { lat: 5, lng: 4 }, { lat: 1, lng: 0 }]])
  })

  it('leaves out anything that is not a ring of number pairs', () => {
    expect(parseLand([[[0, 1]], 'x', [[0, 'a'], [1, 2], [3, 4], [5, 6]]] as unknown[])).toEqual([])
  })

  it('ships a land file the map can read, every point on the map', () => {
    const rings = parseLand(JSON.parse(readFileSync(new URL('../../public/data/land.json', import.meta.url), 'utf8')))
    expect(rings.length).toBeGreaterThan(50)
    for (const ring of rings) for (const p of ring) expect(Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180).toBe(true)
  })

  it('keeps the Caspian Sea as water, and Antarctica reaching both edges of the map', () => {
    const rings = parseLand(JSON.parse(readFileSync(new URL('../../public/data/land.json', import.meta.url), 'utf8')))
    const inCaspian = (p: { lat: number; lng: number }) => p.lng > 46 && p.lng < 55.5 && p.lat > 36 && p.lat < 47.5
    expect(rings.some((ring) => ring.every(inCaspian))).toBe(true)
    expect(rings.some((ring) => ring.some((p) => p.lng === -180) && ring.some((p) => p.lng === 180))).toBe(true)
  })
})
