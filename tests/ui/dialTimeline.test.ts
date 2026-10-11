import { describe, expect, it } from 'vitest'
import { dialMoment, easeOut, TURN_MS } from '../../src/ui/dialTimeline'

const both = { home: true, departureDays: 0.25, still: false }
const homeOnly = { home: true, departureDays: null, still: false }

describe('easeOut', () => {
  it('is SwiftUI’s ease-out curve, cubic-bezier(0, 0, 0.58, 1)', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(0.25)).toBeCloseTo(0.3781, 4)
    expect(easeOut(0.5)).toBeCloseTo(0.6846, 4)
    expect(easeOut(0.75)).toBeCloseTo(0.9065, 4)
    expect(easeOut(1)).toBe(1)
  })

  it('holds at the ends outside 0 to 1', () => {
    expect(easeOut(-1)).toBe(0)
    expect(easeOut(2)).toBe(1)
  })
})

describe('dialMoment', () => {
  it.each([
    [0, 0, 1],
    [400, 0.6846, 1],
    [800, 1, 1],
    [2000, 1, 1],
    [2300, 1, 0.3154],
    [2600, 1, 0],
  ])('at %i ms the home turn has drawn %f and shows at %f', (ms, progress, opacity) => {
    const { home, departure } = dialMoment(ms, both)
    expect(home.progress).toBeCloseTo(progress, 4)
    expect(home.opacity).toBeCloseTo(opacity, 4)
    expect(home.middle).toBeCloseTo(progress * opacity, 4)
    expect(departure.progress).toBe(0)
  })

  it('clears the turn at 2.8 s and starts the next after a 0.3 s pause, then goes round again', () => {
    expect(dialMoment(2800, both).home.progress).toBe(0)
    expect(TURN_MS).toBe(3100)
    expect(dialMoment(3100, both).departure).toEqual({ progress: 0, opacity: 1, middle: 0 })
    expect(dialMoment(3100 + 400, both).departure.progress).toBeCloseTo(0.6846, 4)
    expect(dialMoment(2 * 3100 + 400, both).home.progress).toBeCloseTo(0.6846, 4)
  })

  it('sweeps 0.8 s for each day to a departure more than a day ahead', () => {
    // A day and a half: 1.2 s.
    const far = { ...both, departureDays: 1.5 }
    expect(dialMoment(3100 + 800, far).departure.progress).toBeCloseTo(easeOut(800 / 1200), 9)
    expect(dialMoment(3100 + 1200, far).departure.progress).toBe(1)
  })

  it('starts fading a sweep that takes longer than 2 s before it finishes, as the app does', () => {
    // Four days: 3.2 s, so it's still drawing when it fades, and cleared at 2.8 s before it's done.
    const veryFar = { ...both, departureDays: 4 }
    const fading = dialMoment(3100 + 2300, veryFar).departure
    expect(fading.progress).toBeCloseTo(easeOut(2300 / 3200), 9)
    expect(fading.opacity).toBeCloseTo(0.3154, 4)
    expect(dialMoment(3100 + 2800, veryFar).departure.progress).toBe(0)
  })

  it('skips a turn that doesn’t apply', () => {
    expect(dialMoment(3100 + 400, homeOnly).home.progress).toBeCloseTo(0.6846, 4)
    expect(dialMoment(400, { home: false, departureDays: 0.25, still: false }).departure.progress).toBeCloseTo(0.6846, 4)
  })

  it('moves nothing when neither turn applies', () => {
    const none = { home: false, departureDays: null, still: false }
    for (const ms of [0, 400, 5000]) {
      expect(dialMoment(ms, none)).toEqual({ home: { progress: 0, opacity: 1, middle: 0 }, departure: { progress: 0, opacity: 1, middle: 0 } })
    }
  })

  it('holds both arcs drawn for reduced motion, with the countdown in the middle when there’s a departure', () => {
    for (const ms of [0, 1234]) {
      expect(dialMoment(ms, { ...both, still: true })).toEqual({
        home: { progress: 1, opacity: 1, middle: 0 },
        departure: { progress: 1, opacity: 1, middle: 1 },
      })
    }
    expect(dialMoment(0, { ...homeOnly, still: true }).home).toEqual({ progress: 1, opacity: 1, middle: 1 })
  })
})
