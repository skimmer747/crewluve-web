/**
 * The full-screen map's time (moving map spec §6), as the app's TripReplayClock: now, a moment dragged to, or a replay
 * at 1x to 10x. A value the page keeps in state and reads on each frame, so nothing changes per frame.
 */

export type ReplaySpeed = 1 | 2 | 5 | 10
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2, 5, 10]

/** Trip time per replay time at 1x: a day in 48 seconds, as on CrewLu's moving map. */
export const REPLAY_BASE_RATE = 1800

export interface ReplayClock {
  span: { start: number; end: number }
  speed: ReplaySpeed
  /** Null while live. Otherwise the trip time it was set to, and when it started playing from there. */
  anchor: { tripTime: number; playingSince: number | null } | null
}

export const liveClock = (span: ReplayClock['span']): ReplayClock => ({ span, speed: 1, anchor: null })
export const isLive = (c: ReplayClock) => c.anchor == null
/** True while a replay plays, and still true once it has reached the trip's end: check `hasFinished` for that. */
export const isPlaying = (c: ReplayClock) => c.anchor?.playingSince != null

const held = (c: ReplayClock, t: number) => Math.min(Math.max(t, c.span.start), c.span.end)

/** The trip time to show at the real time `now`. */
export function clockTime(c: ReplayClock, now: number): number {
  if (!c.anchor) return now
  const since = c.anchor.playingSince
  if (since == null) return c.anchor.tripTime
  return Math.min(c.anchor.tripTime + Math.max(now - since, 0) * REPLAY_BASE_RATE * c.speed, c.span.end)
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
