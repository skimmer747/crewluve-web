import { describe, expect, it } from 'vitest'
import { clockTime, finishesAt, goLive, hasFinished, isLive, isPlaying, liveClock, pause, play, scrub, setSpeed } from '../../src/map/replayClock'

const SPAN = { start: 1_800_000_000_000, end: 1_800_000_000_000 + 2 * 86_400_000 }
const NOW = 1_800_050_000_000
const S = 1000

describe('the replay clock (moving map spec §6)', () => {
  it('reads now while live', () => {
    const clock = liveClock(SPAN)
    expect([isLive(clock), isPlaying(clock), clockTime(clock, NOW)]).toEqual([true, false, NOW])
  })

  it('holds a scrub to the trip', () => {
    expect(clockTime(scrub(liveClock(SPAN), SPAN.start - 3_600_000), NOW)).toBe(SPAN.start)
    expect(clockTime(scrub(liveClock(SPAN), SPAN.end + 3_600_000), NOW)).toBe(SPAN.end)
  })

  it("plays from the trip's start at a day in 96 seconds, and faster at 10x without jumping", () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 96 * S)).toBe(SPAN.start + 86_400_000)
    const later = NOW + 10 * S
    const faster = setSpeed(playing, 10, later)
    expect(clockTime(faster, later)).toBe(clockTime(playing, later))
    expect(clockTime(faster, later + S)).toBe(clockTime(playing, later) + 9_000 * S)
  })

  it('stops at the end, and plays again from the start', () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 500 * S)).toBe(SPAN.end)
    expect(hasFinished(playing, NOW + 500 * S)).toBe(true)
    expect(clockTime(play(playing, NOW + 500 * S), NOW + 500 * S)).toBe(SPAN.start)
  })

  it('knows the real time a replay reaches the end, and has none when it is not playing', () => {
    const playing = play(liveClock(SPAN), NOW)
    const end = finishesAt(playing)!
    expect(hasFinished(playing, end - 1)).toBe(false)
    expect(hasFinished(playing, end)).toBe(true)
    // A faster replay ends sooner.
    expect(finishesAt(setSpeed(playing, 10, NOW))!).toBeLessThan(end)
    expect(finishesAt(liveClock(SPAN))).toBeNull()
    expect(finishesAt(pause(playing, NOW + 5 * S))).toBeNull()
  })

  it('reads the end at the time it says it finishes, whatever the rounding', () => {
    // At 5x from here, a plain round-up lands a fraction of a millisecond short of the end, and the replay never finishes.
    const c = setSpeed(play(scrub(liveClock(SPAN), SPAN.start + 34_217_999), NOW), 5, NOW)
    expect(hasFinished(c, finishesAt(c)!)).toBe(true)
    for (const speed of [1, 2, 5, 10] as const) {
      for (let k = 1; k < 5_000; k++) {
        const from = setSpeed(play(scrub(liveClock(SPAN), SPAN.start + k * 7_919), NOW), speed, NOW)
        expect(hasFinished(from, finishesAt(from)!)).toBe(true)
      }
    }
  })

  it('pauses where it is, and goes back to now', () => {
    const paused = pause(play(liveClock(SPAN), NOW), NOW + 5 * S)
    expect(clockTime(paused, NOW + 60 * S)).toBe(SPAN.start + 5 * 900 * S)
    expect(isLive(goLive(paused))).toBe(true)
  })
})

describe('short legs take at least 6 seconds at 1x (replay design, 2026-11-13; 6 s since 17 Nov 2026)', () => {
  const MIN = 60_000
  const T0 = 1_800_000_000_000
  // A 25-minute drive, a 30-minute gap, a 50-minute hop, an hour's gap and an 8-hour flight. At 1x: 6 s, 2 s, 6 s, 4 s, 32 s.
  const LEGS = [
    { start: T0, end: T0 + 25 * MIN },
    { start: T0 + 55 * MIN, end: T0 + 105 * MIN },
    { start: T0 + 165 * MIN, end: T0 + 645 * MIN },
  ]
  const TRIP = { start: T0, end: T0 + 645 * MIN }
  const playing = () => play(liveClock(TRIP, LEGS), NOW)

  it('slows a 25-minute drive to 6 s at 1x, and half that at 2x', () => {
    expect(clockTime(playing(), NOW + 3 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(playing(), NOW + 6 * S)).toBe(T0 + 25 * MIN)
    expect(clockTime(setSpeed(playing(), 2, NOW), NOW + 3 * S)).toBe(T0 + 25 * MIN)
  })

  it('slows a 50-minute flight to 6 s too, and plays the gaps between legs at a day in 96 s', () => {
    expect(clockTime(playing(), NOW + 8 * S)).toBe(T0 + 55 * MIN)
    expect(clockTime(playing(), NOW + 14 * S)).toBe(T0 + 105 * MIN)
    expect(clockTime(playing(), NOW + 18 * S)).toBe(T0 + 165 * MIN)
  })

  it('plays a leg of 90 minutes or more as before', () => {
    expect(clockTime(playing(), NOW + 34 * S)).toBe(T0 + 405 * MIN)
    expect(clockTime(playing(), NOW + 50 * S)).toBe(TRIP.end)
  })

  it('knows when the slowed replay reaches the end, at any speed', () => {
    const end = finishesAt(playing())!
    expect(end).toBe(NOW + 50 * S)
    expect(hasFinished(playing(), end - 1)).toBe(false)
    expect(hasFinished(playing(), end)).toBe(true)
    expect(finishesAt(setSpeed(playing(), 2, NOW))).toBe(NOW + 25 * S)
  })

  it('keeps the moment when paused or sped up in the middle of a slowed leg', () => {
    expect(clockTime(pause(playing(), NOW + 3 * S), NOW + 60 * S)).toBe(T0 + 12.5 * MIN)
    const faster = setSpeed(playing(), 5, NOW + 3 * S)
    expect(clockTime(faster, NOW + 3 * S)).toBe(T0 + 12.5 * MIN)
    expect(clockTime(faster, NOW + 3.6 * S)).toBe(T0 + 25 * MIN)
  })

  it('takes only the rest of the 6 s when played from partway through a slowed leg', () => {
    const fromMiddle = play(scrub(liveClock(TRIP, LEGS), T0 + 12.5 * MIN), NOW)
    expect(clockTime(fromMiddle, NOW + 3 * S)).toBe(T0 + 25 * MIN)
  })

  it('takes the slower rate while two overlapping legs move', () => {
    // An hour's leg (6 s would be 600x) with a 15-minute one inside it (150x): 3 s, then 6 s, then 1.5 s.
    const overlapping = play(liveClock({ start: T0, end: T0 + 60 * MIN }, [
      { start: T0, end: T0 + 60 * MIN },
      { start: T0 + 30 * MIN, end: T0 + 45 * MIN },
    ]), NOW)
    expect(clockTime(overlapping, NOW + 3 * S)).toBe(T0 + 30 * MIN)
    expect(clockTime(overlapping, NOW + 9 * S)).toBe(T0 + 45 * MIN)
    expect(finishesAt(overlapping)).toBe(NOW + 10.5 * S)
  })

  it('gives a leg with no length no time', () => {
    const withEmpty = play(liveClock(TRIP, [...LEGS, { start: T0 + 40 * MIN, end: T0 + 40 * MIN }]), NOW)
    expect(clockTime(withEmpty, NOW + 8 * S)).toBe(T0 + 55 * MIN)
    expect(finishesAt(withEmpty)).toBe(NOW + 50 * S)
  })
})
