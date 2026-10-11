import { describe, expect, it } from 'vitest'
import { moonCycle, moonPhase, SYNODIC_MONTH } from '../../src/time/moon'
import { DAY } from '../../src/time/zoned'

/** How many days `t` is from the point `target` (0 new, 0.5 full) in the moon's cycle, either way. */
const daysFrom = (t: number, target: number) => {
  const off = moonCycle(t) - target
  return Math.abs(off - Math.round(off)) * SYNODIC_MONTH
}

// Eclipses fall exactly at new moon (solar) or full moon (lunar), so they pin the phase to within the hour.
const ECLIPSES: Array<[name: string, at: string, phase: 'new' | 'full']> = [
  ['the annular solar eclipse of 17 February 2026', '2026-02-17T12:12:00Z', 'new'],
  ['the total lunar eclipse of 3 March 2026', '2026-03-03T11:33:00Z', 'full'],
  ['the total solar eclipse of 12 August 2026', '2026-08-12T17:46:00Z', 'new'],
  ['the partial lunar eclipse of 28 August 2026', '2026-08-28T04:12:00Z', 'full'],
]

describe('moonPhase', () => {
  it.each(ECLIPSES)('is right within a day at %s', (_name, at, phase) => {
    const t = Date.parse(at)
    expect(moonPhase(t)).toBe(phase)
    expect(daysFrom(t, phase === 'new' ? 0 : 0.5)).toBeLessThan(1)
  })

  it('walks through all eight phases in order across one cycle', () => {
    const newMoon = Date.parse('2026-08-12T17:46:00Z')
    const step = (SYNODIC_MONTH / 8) * DAY
    // Each phase's middle, starting from the new moon (nudged by the formula's offset at that eclipse).
    const start = newMoon - moonCycle(newMoon) * SYNODIC_MONTH * DAY + SYNODIC_MONTH * DAY
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => moonPhase(start + i * step))).toEqual([
      'new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent',
    ])
  })

  it('changes name at each of the eight boundaries, halfway between the main points', () => {
    const fullMoon = Date.parse('2026-08-28T04:12:00Z')
    const cycleStart = fullMoon - moonCycle(fullMoon) * SYNODIC_MONTH * DAY
    const at = (fraction: number) => cycleStart + fraction * SYNODIC_MONTH * DAY
    const names = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent']
    for (let k = 0; k < 8; k++) {
      const boundary = (2 * k + 1) / 16
      expect(moonPhase(at(boundary - 0.001))).toBe(names[k])
      expect(moonPhase(at(boundary + 0.001))).toBe(names[(k + 1) % 8])
    }
  })
})

describe('moonCycle', () => {
  it('runs from 0 up to 1 and starts again', () => {
    const t = Date.parse('2026-10-11T12:00:00Z')
    expect(moonCycle(t)).toBeGreaterThanOrEqual(0)
    expect(moonCycle(t)).toBeLessThan(1)
    expect(moonCycle(t + SYNODIC_MONTH * DAY)).toBeCloseTo(moonCycle(t), 9)
  })
})
