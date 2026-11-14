import { describe, expect, it } from 'vitest'
import { moonAltitude, subLunarPoint } from '../../src/facts/moonPosition'
import { moonPhase } from '../../src/time/moon'

const DAY = 86_400_000

describe('the moon (Stage 2 spec §4.5)', () => {
  it('names each phase at its middle in November 2026, as the app does', () => {
    expect(
      ['2026-11-09T21:58:00Z', '2026-11-13T14:33:00Z', '2026-11-17T07:09:00Z', '2026-11-20T23:44:00Z', '2026-11-24T16:20:00Z',
        '2026-11-28T08:55:00Z', '2026-12-02T01:31:00Z', '2026-12-05T18:06:00Z'].map((iso) => moonPhase(Date.parse(iso))),
    ).toEqual(['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'])
  })

  it('keeps the point below the moon within its reach', () => {
    for (let day = 0; day < 60; day++) {
      const point = subLunarPoint(Date.UTC(2026, 0, 1) + day * DAY)
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(29)
      expect(Math.abs(point.lng)).toBeLessThanOrEqual(180)
    }
  })

  it('is high over Cologne on a waxing gibbous evening', () => {
    expect(moonAltitude(50.87, 7.14, Date.parse('2026-11-20T21:00:00Z'))).toBeCloseTo(44.3, 0)
  })

  it('is below the horizon at dawn over the Netherlands', () => {
    expect(moonAltitude(51.79, 4.25, Date.parse('2026-11-14T06:38:00Z'))).toBeCloseTo(-45.5, 0)
  })
})
