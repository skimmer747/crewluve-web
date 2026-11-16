import { HOUR, MINUTE } from '../time/zoned'
import type { LiveFlight } from './liveFlight'

/**
 * When a flight's live data is worth asking for (Stage 3 spec §10.2, and partner-api.md's "When to call it"), as the
 * app's LiveWindow: the same window Crewlu Cloud watches it in.
 */

/** It opens this long before the flight leaves the gate. */
export const WINDOW_OPENS_BEFORE_MS = 30 * MINUTE
/** It closes this long after the flight reaches the gate. */
export const WINDOW_CLOSES_AFTER_MS = 2 * HOUR
/** Past that, it stays open while the flight is in the air with a fix newer than this. */
export const WINDOW_KEEPS_MS = 30 * MINUTE
/** And never longer than this after the flight reaches the gate. */
export const WINDOW_ENDS_AFTER_MS = 12 * HOUR

/**
 * Whether the window of a flight leaving the gate at `departure` and reaching it at `arrival`, both moved by any
 * reported delay, is open at `now`, by Crewlu Cloud's clock. `flight` is its live data so far.
 */
export function isLiveWindowOpen(departure: number, arrival: number, flight: LiveFlight | null, now: number): boolean {
  if (now < departure - WINDOW_OPENS_BEFORE_MS || flight?.state === 'landed') return false
  if (now < arrival + WINDOW_CLOSES_AFTER_MS) return true
  const fix = flight?.fix
  if (flight?.state !== 'airborne' || !fix) return false
  return fix.seenAt > now - WINDOW_KEEPS_MS && now < arrival + WINDOW_ENDS_AFTER_MS
}
