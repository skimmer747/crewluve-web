/**
 * The big dial's loop (slice 2B2 §5.2), copying SunCircleView's task: each turn draws its arc in with an ease-out, holds,
 * fades from 2.0 s over 0.6 s, is cleared at 2.8 s, and the next turn starts after a 0.3 s pause. The home-time turn
 * comes first, then the departure turn; a turn that doesn't apply is skipped.
 */

/** One turn, start to start: 2.0 s, then 0.8 s while it fades and clears, then the 0.3 s pause. */
export const TURN_MS = 3100
const DRAW_MS = 800
const FADE_AT_MS = 2000
const FADE_MS = 600
const CLEAR_AT_MS = 2800

/**
 * SwiftUI's .easeOut, which is CSS's cubic-bezier(0, 0, 0.58, 1): how much of the change is done when `x` of the time
 * (0 to 1) has passed. The curve's time runs x(u) = 1.74(1 − u)u² + u³, solved for u by halving.
 */
export function easeOut(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let low = 0
  let high = 1
  for (let i = 0; i < 30; i++) {
    const u = (low + high) / 2
    if (3 * (1 - u) * u * u * 0.58 + u * u * u < x) low = u
    else high = u
  }
  const u = (low + high) / 2
  return 3 * (1 - u) * u * u + u * u * u
}

/** Where one turn's arc stands at a moment. */
export interface TurnState {
  /** How far it has drawn, eased: 0 to 1. */
  progress: number
  /** How faded it is: 1 shown, 0 gone. */
  opacity: number
  /** The middle text's opacity: it comes in with the arc and fades out with it. */
  middle: number
}

export interface DialMoment {
  home: TurnState
  departure: TurnState
}

export interface DialTurns {
  /** The home-time turn applies: the pilot's clock differs from home's. */
  home: boolean
  /** Days until the departure when one is ahead, else null. The sweep takes 0.8 s a day, and at least 0.8 s. */
  departureDays: number | null
  /** Reduced motion: nothing sweeps, and both arcs stay drawn in full. */
  still: boolean
}

const NOTHING: TurnState = { progress: 0, opacity: 1, middle: 0 }

/** The state of a turn `ms` after it started, for an arc that draws in over `drawMs`. */
function turnAt(ms: number, drawMs: number): TurnState {
  if (ms >= CLEAR_AT_MS) return NOTHING
  const progress = easeOut(ms / drawMs)
  const opacity = ms < FADE_AT_MS ? 1 : 1 - easeOut((ms - FADE_AT_MS) / FADE_MS)
  return { progress, opacity, middle: progress * opacity }
}

/** Both turns' states `elapsed` ms after the dial appeared. A pure function, so the dial can read it on every frame. */
export function dialMoment(elapsed: number, turns: DialTurns): DialMoment {
  const departs = turns.departureDays != null
  if (turns.still) {
    // Both arcs in full; the middle shows the countdown when there's a departure, otherwise the time difference.
    return {
      home: turns.home ? { progress: 1, opacity: 1, middle: departs ? 0 : 1 } : NOTHING,
      departure: departs ? { progress: 1, opacity: 1, middle: 1 } : NOTHING,
    }
  }
  const order = [...(turns.home ? ['home' as const] : []), ...(departs ? ['departure' as const] : [])]
  if (order.length === 0) return { home: NOTHING, departure: NOTHING }
  const cycle = order.length * TURN_MS
  const at = ((elapsed % cycle) + cycle) % cycle
  const which = order[Math.floor(at / TURN_MS)]
  const ms = at % TURN_MS
  if (which === 'home') return { home: turnAt(ms, DRAW_MS), departure: NOTHING }
  return { home: NOTHING, departure: turnAt(ms, DRAW_MS * Math.max(1, turns.departureDays ?? 1)) }
}
