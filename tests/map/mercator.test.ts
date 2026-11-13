import { describe, expect, it } from 'vitest'
import { MAX_LATITUDE, toWorld, unwrapped } from '../../src/map/mercator'

describe('the flat map (moving map spec §11)', () => {
  it('puts 0°, 0° in the middle and the date line at the edges', () => {
    expect(toWorld({ lat: 0, lng: 0 }).x).toBe(0.5)
    expect(toWorld({ lat: 0, lng: 0 }).y).toBeCloseTo(0.5, 12)
    expect(toWorld({ lat: 0, lng: 180 }).x).toBe(1)
    expect(toWorld({ lat: 0, lng: -180 }).x).toBe(0)
  })

  it('ends at 85.05° north and south, and holds the poles there', () => {
    expect(toWorld({ lat: MAX_LATITUDE, lng: 0 }).y).toBeCloseTo(0, 3)
    expect(toWorld({ lat: 90, lng: 0 }).y).toBe(toWorld({ lat: MAX_LATITUDE, lng: 0 }).y)
    expect(toWorld({ lat: -MAX_LATITUDE, lng: 0 }).y).toBeCloseTo(1, 3)
  })

  it('lays a line across the date line out in one piece', () => {
    expect(unwrapped([{ x: 0.98, y: 0.3 }, { x: 0.02, y: 0.3 }, { x: 0.05, y: 0.3 }]).map((p) => p.x)).toEqual([0.98, 1.02, 1.05])
  })
})
