import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  clockTime, LEG_MIN_REPLAY, liveClock, play, progressAt, QUICK_WAIT_RATE, REPLAY_BASE_RATE, replayDuration, replayOffset, scrub,
  setQuickLayovers, setSpeed, tripTimeAtOffset, WAIT_MIN_REPLAY, type ReplaySpeed,
} from '../../src/map/replayClock'
import { at } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface Stretchy { start: string; end: string }
interface Cases {
  constants: { baseRate: number; legMinimumSeconds: number; waitMinimumSeconds: number; quickWaitRate: number }
  cases: { name: string; span: Stretchy; legs: Stretchy[]; waits: Stretchy[]; quickLayovers: boolean; speed: ReplaySpeed; replayLength: number; checks: { seconds: number; at: string }[] }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/replay-cases.json', import.meta.url), 'utf8')) as Cases
const stretch = (s: Stretchy) => ({ start: Date.parse(s.start), end: Date.parse(s.end) })

describe("the replay's pace with Quick layovers (activity markers design §3.2): the shared cases", () => {
  it("uses the shared cases' constants", () => {
    expect(REPLAY_BASE_RATE).toBe(cases.constants.baseRate)
    expect(LEG_MIN_REPLAY).toBe(cases.constants.legMinimumSeconds * 1000)
    expect(WAIT_MIN_REPLAY).toBe(cases.constants.waitMinimumSeconds * 1000)
    expect(QUICK_WAIT_RATE).toBe(cases.constants.quickWaitRate)
  })

  it.each(cases.cases)('$name', (c) => {
    const pressed = 1_000_000
    const clock = play(setSpeed(liveClock(stretch(c.span), c.legs.map(stretch), c.waits.map(stretch), c.quickLayovers), c.speed, 0), pressed)
    expect(replayDuration(clock)).toBeCloseTo(c.replayLength * 1000, 6)
    for (const check of c.checks) {
      expect(Math.abs(clockTime(clock, pressed + check.seconds * 1000) - Date.parse(check.at)), `${check.seconds} s`).toBeLessThan(1)
    }
  })
})

describe('Quick layovers (activity markers design §3.1) and positions in replay time (§4.3)', () => {
  // The Europe trip: legs of 8, 6 and 14 hours, with a 24-hour and a 20-hour wait. At 1x with Quick layovers on that's
  // 16 s, 3 s, 12 s, 3 s and 28 s: 62 s. With it off, 144 s.
  const span = { start: at(0), end: at(72) }
  const legs = [{ start: at(0), end: at(8) }, { start: at(32), end: at(38) }, { start: at(58), end: at(72) }]
  const waits = [{ start: at(8), end: at(32) }, { start: at(38), end: at(58) }]
  const quick = liveClock(span, legs, waits, true)

  it('is off for a clock made as before, so it plays as before', () => {
    expect(liveClock(span, legs).quickLayovers).toBe(false)
    expect(replayDuration(liveClock(span, legs, waits))).toBe(144_000)
  })

  it('measures the whole replay at each pace', () => {
    expect(replayDuration(quick)).toBe(62_000)
    expect(replayDuration({ ...quick, quickLayovers: false })).toBe(144_000)
  })

  it('keeps the moment when switched during a replay, and carries on from there at the new pace', () => {
    const switched = setQuickLayovers(play(quick, 0), false, 17_500)
    expect(switched.quickLayovers).toBe(false)
    expect(clockTime(switched, 17_500)).toBe(at(20))
    // A second at a day in 48 s is half an hour.
    expect(clockTime(switched, 18_500)).toBe(at(20.5))
  })

  it('keeps the moment when switched while paused', () => {
    expect(clockTime(setQuickLayovers(scrub(quick, at(20)), false, 0), 99)).toBe(at(20))
  })

  it('turns a moment into replay time and back, held to the trip', () => {
    expect(replayOffset(quick, at(20))).toBe(17_500)
    expect(tripTimeAtOffset(quick, 17_500)).toBe(at(20))
    expect(tripTimeAtOffset(quick, -5)).toBe(at(0))
    expect(tripTimeAtOffset(quick, 99_000)).toBe(at(72))
  })

  it('places a moment along the bar, 0 to 1, held to its ends', () => {
    expect(progressAt(quick, at(8))).toBeCloseTo(16 / 62, 12)
    expect(progressAt(quick, at(-5))).toBe(0)
    expect(progressAt(quick, at(80))).toBe(1)
    expect(progressAt(liveClock({ start: at(0), end: at(0) }), at(0))).toBe(0)
  })
})
