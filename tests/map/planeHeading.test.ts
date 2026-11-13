import { describe, expect, it } from 'vitest'
import { aimFractions, continuing, flatMapAngle, shortestTurn } from '../../src/map/planeHeading'

const DEG = Math.PI / 180

describe('plane heading (moving map spec §7.2)', () => {
  it('aims just ahead of the plane, and along the last stretch near the end', () => {
    expect(aimFractions(0.3, 0.01).from).toBeCloseTo(0.3, 12)
    expect(aimFractions(0.3, 0.01).to).toBeCloseTo(0.31, 12)
    expect(aimFractions(0.998, 0.005).from).toBeCloseTo(0.995, 12)
    expect(aimFractions(0.998, 0.005).to).toBe(1)
    expect(aimFractions(-0.2, 0.005)).toEqual({ from: 0, to: 0.005 })
  })

  it('turns the short way round past due west, never more than half a turn', () => {
    expect(shortestTurn(170 * DEG, -170 * DEG)).toBeCloseTo(20 * DEG, 9)
    expect(shortestTurn(-170 * DEG, 170 * DEG)).toBeCloseTo(-20 * DEG, 9)
    for (let from = -10; from <= 10; from += 0.7) {
      for (let to = -10; to <= 10; to += 0.9) expect(Math.abs(shortestTurn(from, to))).toBeLessThanOrEqual(Math.PI + 1e-12)
    }
    const next = continuing(3, -3)
    expect(Math.abs(next - 3)).toBeLessThanOrEqual(Math.PI)
    expect(Math.cos(next)).toBeCloseTo(Math.cos(-3), 12)
  })

  it('points east right, north up and south down on a north-up map', () => {
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBeCloseTo(0, 12)
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBeCloseTo(-Math.PI / 2, 12)
    expect(flatMapAngle({ lat: 0, lng: 0 }, { lat: -10, lng: 0 })).toBeCloseTo(Math.PI / 2, 12)
  })

  it('gives the same angle across the date line as anywhere else, none for one place, and a number at a pole', () => {
    expect(flatMapAngle({ lat: 50, lng: 179 }, { lat: 51, lng: -179 })).toBeCloseTo(flatMapAngle({ lat: 50, lng: -1 }, { lat: 51, lng: 1 })!, 12)
    expect(flatMapAngle({ lat: 38, lng: -85 }, { lat: 38, lng: -85 })).toBeNull()
    expect(Number.isFinite(flatMapAngle({ lat: 90, lng: 0 }, { lat: 89, lng: 10 }))).toBe(true)
  })
})
