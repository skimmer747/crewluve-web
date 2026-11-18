/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame. The pace is a day
 * in 96 s at 1x, half CrewLu's, since 17 Nov 2026. A leg in motion that would pass in under 6 s at 1x slows so it takes
 * 6 s (docs/superpowers/specs/2026-11-13-replay-short-legs-design.md). With Quick layovers on, a wait on the ground takes
 * a second a day, never under 3 s and never slower than a day in 96 s,
 * and the clock places any moment along the timeline in replay time (the app's activity markers design §3.2, §4.3).
 * The shared cases are tests/fixtures/trip-map/replay-cases.json, a copy of the app's: change both together.
 */

export type ReplaySpeed = 1 | 2 | 5 | 10
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10]

/**
 * Trip time per replay time at 1x: a day in 96 seconds, half CrewLu's moving map's pace, so a short flight such as
 * Louisville to Cleveland can be followed (Todd, 17 Nov 2026; the app's, and the shared cases').
 */
export const REPLAY_BASE_RATE = 900

/** The least real time, in ms at 1x, that a leg in motion takes, so a drive to work can be seen: 6 s, as the app's. */
export const LEG_MIN_REPLAY = 6000

/** The least real time, in ms at 1x, that a wait takes with Quick layovers on. */
export const WAIT_MIN_REPLAY = 3000

/** Trip time per real time at 1x through a long wait with Quick layovers on: a day a second. */
export const QUICK_WAIT_RATE = 86_400

/** A stretch of trip time. */
export interface Stretch {
  start: number
  end: number
}

export interface ReplayClock {
  span: Stretch
  /** The trip's legs. A short one slows the replay while it moves. */
  legs: readonly Stretch[]
  /** The stretches with no leg moving, which Quick layovers hurries through. */
  waits: readonly Stretch[]
  /** Whether waits on the ground hurry by (activity markers design §3.1). */
  quickLayovers: boolean
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

/** Live. Quick layovers is off unless asked, so a clock made as before plays as before. */
export const liveClock = (span: Stretch, legs: readonly Stretch[] = [], waits: readonly Stretch[] = [], quickLayovers = false): ReplayClock =>
  ({ span, legs, waits, quickLayovers, speed: 1, anchor: null })
export const isLive = (c: ReplayClock) => c.anchor == null
/** True while a replay plays, and still true once it has reached the trip's end: check `hasFinished` for that. */
export const isPlaying = (c: ReplayClock) => c.anchor?.playingSince != null

const held = (c: ReplayClock, t: number) => Math.min(Math.max(t, c.span.start), c.span.end)

/** A stretch of the trip played at one rate: trip time per real time at 1x. */
interface Piece extends Stretch {
  rate: number
}

/**
 * The span cut at every leg's and wait's start and end. Each piece plays at the normal rate. While legs move through
 * it, it plays at the slowest of their rates, a leg's length over 3 s; a leg with no length covers no piece, so it adds
 * no time. Through a wait with Quick layovers on, it plays at the whole wait's quick rate.
 */
function pace(c: ReplayClock): Piece[] {
  const { start, end } = c.span
  const cuts = [start, end, ...[...c.legs, ...c.waits].flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  return times.slice(1).map((to, i) => {
    const from = times[i]
    const moving = c.legs.filter((l) => l.start <= from && to <= l.end)
    if (moving.length > 0) {
      return { start: from, end: to, rate: moving.reduce((slowest, l) => Math.min(slowest, (l.end - l.start) / LEG_MIN_REPLAY), REPLAY_BASE_RATE) }
    }
    const wait = c.quickLayovers ? c.waits.find((w) => w.start <= from && to <= w.end) : undefined
    return { start: from, end: to, rate: wait ? quickRate(wait.end - wait.start) : REPLAY_BASE_RATE }
  })
}

/**
 * A wait of `length` plays in min(length / 900, max(3 s, length / 86,400)) at 1x: a second a day, never under 3 s,
 * and never slower than the normal rate. As a rate, that's its length over that time.
 */
const quickRate = (length: number) => Math.max(REPLAY_BASE_RATE, Math.min(length / WAIT_MIN_REPLAY, QUICK_WAIT_RATE))

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

/** The trip time to show at the real time `now`. */
export function clockTime(c: ReplayClock, now: number): number {
  if (!c.anchor) return now
  const since = c.anchor.playingSince
  if (since == null) return c.anchor.tripTime
  const pieces = pace(c)
  const real = realAt(pieces, c.anchor.tripTime) + Math.max(now - since, 0) * c.speed
  return real >= realAt(pieces, c.span.end) ? c.span.end : tripAt(pieces, real, c.span.end)
}

/** The real time a playing clock reaches the trip's end, or null when it isn't playing. */
export function finishesAt(c: ReplayClock): number | null {
  const since = c.anchor?.playingSince
  if (c.anchor == null || since == null) return null
  const pieces = pace(c)
  let at = Math.ceil(since + (realAt(pieces, c.span.end) - realAt(pieces, c.anchor.tripTime)) / c.speed)
  // Near today's epoch a double is only good to about 0.0002 ms, so the round-up can land a hair short of the end.
  // The page's frames stop at this time, and the replay must read as finished there: step on a millisecond until it
  // does. That takes one step at most; the cap only guards against a malformed clock.
  for (let step = 0; step < 4 && clockTime(c, at) < c.span.end; step++) at++
  return at
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

/** Hurries through waits or plays them at the normal rate, from the moment shown: a replay carries on from there (§3.1). */
export const setQuickLayovers = (c: ReplayClock, quickLayovers: boolean, now: number): ReplayClock =>
  isPlaying(c) ? { ...c, quickLayovers, anchor: { tripTime: clockTime(c, now), playingSince: now } } : { ...c, quickLayovers }

export const goLive = (c: ReplayClock): ReplayClock => ({ ...c, anchor: null })

const sameStretches = (a: readonly Stretch[], b: readonly Stretch[]) =>
  a.length === b.length && a.every((s, i) => s.start === b[i].start && s.end === b[i].end)

/** Whether the clock was made for these times: the trip's span, its legs and its waits. */
export const hasTimes = (c: ReplayClock, span: Stretch, legs: readonly Stretch[], waits: readonly Stretch[]) =>
  c.span.start === span.start && c.span.end === span.end && sameStretches(c.legs, legs) && sameStretches(c.waits, waits)

/**
 * The clock for the trip's new times, as the app's TripReplayClock.carried: each new landing estimate moves a leg
 * (Stage 3 spec §7.3). Live stays live. A replay keeps its moment, playing or paused, at its speed, and plays on at the
 * new legs' pace. A moment at either end of the trip stays at that end, wherever the new times put it. A replay that
 * has finished stays at the end.
 */
export function carried(c: ReplayClock, span: Stretch, legs: readonly Stretch[], waits: readonly Stretch[], now: number): ReplayClock {
  const next: ReplayClock = { ...c, span, legs, waits, anchor: null }
  if (isLive(c)) return next
  const moment = clockTime(c, now)
  const tripTime = held(next, moment >= c.span.end ? span.end : moment <= c.span.start ? span.start : moment)
  return { ...next, anchor: { tripTime, playingSince: isPlaying(c) && !hasFinished(c, now) ? now : null } }
}

// Positions along the timeline (activity markers design §4.3): the bar measures replay time at 1x at the clock's pace.

/** The whole replay at 1x, in ms. */
export const replayDuration = (c: ReplayClock) => realAt(pace(c), c.span.end)

/** The replay ms at 1x from the span's start to the trip time `t`. */
export const replayOffset = (c: ReplayClock, t: number) => realAt(pace(c), t)

/** The trip time `offset` replay ms at 1x after the span's start: the span's end once the whole replay has played. */
export const tripTimeAtOffset = (c: ReplayClock, offset: number) => tripAt(pace(c), Math.max(offset, 0), c.span.end)

/** Where `t` sits along the timeline, 0 at the span's start and 1 at its end, in replay time at 1x. */
export function progressAt(c: ReplayClock, t: number): number {
  const whole = replayDuration(c)
  return whole > 0 ? Math.min(Math.max(replayOffset(c, t) / whole, 0), 1) : 0
}
