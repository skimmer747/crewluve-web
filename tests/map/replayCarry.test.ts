import { describe, expect, it } from 'vitest'
import { carried, clockTime, hasFinished, hasTimes, isLive, isPlaying, liveClock, play, scrub, setSpeed, type Stretch } from '../../src/map/replayClock'

const HOUR = 3_600_000
const T = Date.UTC(2027, 0, 15, 12)
const at = (hours: number) => T + hours * HOUR

/** A flight from noon to 2, a wait, and one from 3 to 5: the trip's times before a new landing estimate. */
const SPAN: Stretch = { start: at(0), end: at(5) }
const LEGS: Stretch[] = [{ start: at(0), end: at(2) }, { start: at(3), end: at(5) }]
const WAITS: Stretch[] = [{ start: at(2), end: at(3) }]
/** The first flight lands 20 minutes early: its wait starts then. */
const EARLY_LEGS: Stretch[] = [{ start: at(0), end: at(2) - HOUR / 3 }, LEGS[1]]
const EARLY_WAITS: Stretch[] = [{ start: at(2) - HOUR / 3, end: at(3) }]
/** The last flight lands half an hour late: the trip grows. */
const LATE_SPAN: Stretch = { start: at(0), end: at(5.5) }
const LATE_LEGS: Stretch[] = [LEGS[0], { start: at(3), end: at(5.5) }]

const REAL_NOW = Date.UTC(2027, 0, 16, 9)

describe("the replay's clock when the trip's times change (Stage 3 spec §7.3)", () => {
  it('stays live when live', () => {
    const clock = carried(liveClock(SPAN, LEGS, WAITS), SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isLive(clock)).toBe(true)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })

  it('keeps a paused moment', () => {
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), at(1))
    const clock = carried(paused, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(false)
    expect(clockTime(clock, REAL_NOW + HOUR)).toBe(at(1))
  })

  it('plays on from the same moment, at the same speed and at the new legs’ pace', () => {
    const playing = setSpeed(play(scrub(liveClock(SPAN, LEGS, WAITS), at(1)), REAL_NOW - 1000), 5, REAL_NOW - 1000)
    const before = clockTime(playing, REAL_NOW)
    const clock = carried(playing, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(true)
    expect(clock.speed).toBe(5)
    expect(clockTime(clock, REAL_NOW)).toBe(before)
    expect(clockTime(clock, REAL_NOW + 1000)).toBeGreaterThan(before)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })

  it('holds a moment past the new end to it', () => {
    const paused = scrub(liveClock(LATE_SPAN, LATE_LEGS, WAITS), at(5.25))
    expect(clockTime(carried(paused, SPAN, LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(SPAN.end)
  })

  it('moves a clock at the old end to the new end when the trip grows', () => {
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), SPAN.end)
    expect(clockTime(carried(paused, LATE_SPAN, LATE_LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(LATE_SPAN.end)
  })

  it('moves a clock at the old start to the new start when the trip starts earlier', () => {
    const earlier: Stretch = { start: at(-0.25), end: SPAN.end }
    const paused = scrub(liveClock(SPAN, LEGS, WAITS), SPAN.start)
    expect(clockTime(carried(paused, earlier, LEGS, WAITS, REAL_NOW), REAL_NOW)).toBe(earlier.start)
  })

  it('keeps a finished replay at the end, paused', () => {
    const finished = play(scrub(liveClock(SPAN, LEGS, WAITS), at(4.99)), REAL_NOW - HOUR)
    expect(hasFinished(finished, REAL_NOW)).toBe(true)
    const clock = carried(finished, LATE_SPAN, LATE_LEGS, WAITS, REAL_NOW)
    expect(isPlaying(clock)).toBe(false)
    expect(clockTime(clock, REAL_NOW)).toBe(LATE_SPAN.end)
  })

  it('keeps Quick layovers, and says which times it was made for', () => {
    const clock = carried({ ...scrub(liveClock(SPAN, LEGS, WAITS), at(1)), quickLayovers: true }, SPAN, EARLY_LEGS, EARLY_WAITS, REAL_NOW)
    expect(clock.quickLayovers).toBe(true)
    expect(hasTimes(clock, SPAN, LEGS, WAITS)).toBe(false)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, WAITS)).toBe(false)
    expect(hasTimes(clock, LATE_SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(false)
    expect(hasTimes(clock, SPAN, EARLY_LEGS, EARLY_WAITS)).toBe(true)
  })
})
