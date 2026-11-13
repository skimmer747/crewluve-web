import { describe, expect, it } from 'vitest'
import { clockTime, goLive, hasFinished, isLive, isPlaying, liveClock, pause, play, scrub, setSpeed } from '../../src/map/replayClock'

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

  it("plays from the trip's start at a day in 48 seconds, and faster at 10x without jumping", () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 48 * S)).toBe(SPAN.start + 86_400_000)
    const later = NOW + 10 * S
    const faster = setSpeed(playing, 10, later)
    expect(clockTime(faster, later)).toBe(clockTime(playing, later))
    expect(clockTime(faster, later + S)).toBe(clockTime(playing, later) + 18_000 * S)
  })

  it('stops at the end, and plays again from the start', () => {
    const playing = play(liveClock(SPAN), NOW)
    expect(clockTime(playing, NOW + 500 * S)).toBe(SPAN.end)
    expect(hasFinished(playing, NOW + 500 * S)).toBe(true)
    expect(clockTime(play(playing, NOW + 500 * S), NOW + 500 * S)).toBe(SPAN.start)
  })

  it('pauses where it is, and goes back to now', () => {
    const paused = pause(play(liveClock(SPAN), NOW), NOW + 5 * S)
    expect(clockTime(paused, NOW + 60 * S)).toBe(SPAN.start + 5 * 1800 * S)
    expect(isLive(goLive(paused))).toBe(true)
  })
})
