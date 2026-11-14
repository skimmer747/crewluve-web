/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. A leg in motion
 * that would pass in under 3 s at 1x slows so it takes 3 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md).
 */

export type ReplaySpeed = 1 | 2 | 5 | 10
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10]

/** Trip time per replay time at 1x: a day in 48 seconds, as on CrewLu's moving map. */
export const REPLAY_BASE_RATE = 1800

/** The least real time, in ms at 1x, that a leg in motion takes, so a drive to work can be seen. */
export const LEG_MIN_REPLAY = 3000

/** A stretch of trip time. */
export interface Stretch {
  start: number
  end: number
}

export interface ReplayClock {
  span: Stretch
  /** The trip's legs. A short one slows the replay while it moves. */
  legs: readonly Stretch[]
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

export const liveClock = (span: Stretch, legs: readonly Stretch[] = []): ReplayClock => ({ span, legs, speed: 1, anchor: null })
export const isLive = (c: ReplayClock) => c.anchor == null
/** True while a replay plays, and still true once it has reached the trip's end: check `hasFinished` for that. */
export const isPlaying = (c: ReplayClock) => c.anchor?.playingSince != null

const held = (c: ReplayClock, t: number) => Math.min(Math.max(t, c.span.start), c.span.end)

/** A stretch of the trip played at one rate: trip time per real time at 1x. */
interface Piece extends Stretch {
  rate: number
}

/**
 * The span cut at every leg's start and end. Each piece plays at the normal rate or, while legs move through it, at the
 * slowest of their rates: a leg's length over 3 s. A leg with no length covers no piece, so it adds no time.
 */
function pace(c: ReplayClock): Piece[] {
  const { start, end } = c.span
  const cuts = [start, end, ...c.legs.flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  return times.slice(1).map((to, i) => {
    const from = times[i]
    const rate = c.legs.reduce(
      (slowest, l) => (l.start <= from && to <= l.end ? Math.min(slowest, (l.end - l.start) / LEG_MIN_REPLAY) : slowest),
      REPLAY_BASE_RATE,
    )
    return { start: from, end: to, rate }
  })
}

/** The real time at 1x from the span's start to the trip time `t`. */
const realAt = (pieces: Piece[], t: number) => pieces.reduce((sum, p) => sum + Math.max(0, Math.min(t, p.end) - p.start) / p.rate, 0)

/** The trip time `real` ms after the span's start at 1x, short of the end. */
function tripAt(pieces: Piece[], real: number, end: number): number {
  let left = real
  for (const p of pieces) {
    const length = (p.end - p.start) / p.rate
    if (left < length) return p.start + left * p.rate
    left -= length
  }
  return end
}

/** Room for float rounding, in real ms: `finishesAt` rounds up, so at that time the replay must read the end. */
const SLACK = 1e-6

/** The trip time to show at the real time `now`. */
export function clockTime(c: ReplayClock, now: number): number {
  if (!c.anchor) return now
  const since = c.anchor.playingSince
  if (since == null) return c.anchor.tripTime
  const pieces = pace(c)
  const real = realAt(pieces, c.anchor.tripTime) + Math.max(now - since, 0) * c.speed
  return real >= realAt(pieces, c.span.end) - SLACK ? c.span.end : tripAt(pieces, real, c.span.end)
}

/** The real time a playing clock reaches the trip's end, or null when it isn't playing. */
export function finishesAt(c: ReplayClock): number | null {
  const since = c.anchor?.playingSince
  if (c.anchor == null || since == null) return null
  const pieces = pace(c)
  return Math.ceil(since + (realAt(pieces, c.span.end) - realAt(pieces, c.anchor.tripTime)) / c.speed)
}

/** True once a replay has run to the trip's end. `isPlaying` stays true then, so the page shows Play again. */
export const hasFinished = (c: ReplayClock, now: number) => isPlaying(c) && clockTime(c, now) >= c.span.end

export const scrub = (c: ReplayClock, t: number): ReplayClock => ({ ...c, anchor: { tripTime: held(c, t), playingSince: null } })

/** Plays from where it is: from the start when live, and again from the start once finished. */
export function play(c: ReplayClock, now: number): ReplayClock {
  const current = isLive(c) ? c.span.start : clockTime(c, now)
  return { ...c, anchor: { tripTime: current >= c.span.end ? c.span.start : current, playingSince: now } }
}

export const pause = (c: ReplayClock, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, anchor: { tripTime: clockTime(c, now), playingSince: null } } : c

export const setSpeed = (c: ReplayClock, speed: ReplaySpeed, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, speed, anchor: { tripTime: clockTime(c, now), playingSince: now } } : { ...c, speed }

export const goLive = (c: ReplayClock): ReplayClock => ({ ...c, anchor: null })
