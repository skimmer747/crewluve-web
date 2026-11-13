import { describe, expect, it } from 'vitest'
import { subsolarPoint, sunAltitude } from '../../src/time/sun'

const utc = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const degrees = (r: number) => (r * 180) / Math.PI

describe('subsolarPoint (moving map spec §7.1)', () => {
  it('is over the Tropic of Cancer at the June solstice', () => {
    expect(degrees(subsolarPoint(utc(2026, 6, 21, 8, 24)).declination)).toBeCloseTo(23.44, 1)
  })

  it('is over the equator at the March equinox', () => {
    expect(degrees(subsolarPoint(utc(2026, 3, 20, 14, 46)).declination)).toBeCloseTo(0, 1)
  })

  it('is a few degrees west of Greenwich at noon UTC in mid-October, when the sun runs 14 minutes ahead', () => {
    expect(Math.abs(subsolarPoint(utc(2026, 10, 15, 12)).longitude + 3.55)).toBeLessThan(0.2)
  })

  it('keeps its longitude within the map all year', () => {
    for (let h = 0; h < 24 * 365; h += 7) {
      expect(Math.abs(subsolarPoint(utc(2026, 1, 1, 0) + h * 3_600_000).longitude)).toBeLessThanOrEqual(180)
    }
  })

  it('has the sun straight up above it', () => {
    const t = utc(2026, 11, 13, 17)
    const sun = subsolarPoint(t)
    expect(sunAltitude(t, degrees(sun.declination), sun.longitude)).toBeGreaterThan(89.99)
  })
})
