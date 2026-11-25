import { MINUTE } from '../time/zoned'

/**
 * Where the schedule says a flight is (moving map spec §7.3), as the app's FlightProgress. The constants are written
 * down in tests/fixtures/trip-map/progress-cases.json, a copy of the app's.
 */

/** The schedule's plane waits this long at the gate before it takes off. */
export const TAXI_OUT_MS = 15 * MINUTE
/** It lands this long before the scheduled gate arrival. */
export const TAXI_IN_MS = 7 * MINUTE
/** A block shorter than both allowances plus this is flown gate to gate, with no allowances. */
export const SHORTEST_CRUISE_MS = 10 * MINUTE

/** When the schedule's plane is in the air for a flight from `departure` to `arrival` (both delay-moved), or null when it arrives no later than it leaves. */
export function airborneWindow(departure: number, arrival: number): { start: number; end: number } | null {
  const block = arrival - departure
  if (block <= 0) return null
  if (block < TAXI_OUT_MS + TAXI_IN_MS + SHORTEST_CRUISE_MS) return { start: departure, end: arrival }
  return { start: departure + TAXI_OUT_MS, end: arrival - TAXI_IN_MS }
}

/**
 * When the schedule's plane takes off for a flight from `departure` to `arrival` (both delay-moved): the start of its
 * time in the air, or the gate departure for a flight with none (live or scheduled design §3).
 */
export const scheduledTakeoff = (departure: number, arrival: number): number =>
  airborneWindow(departure, arrival)?.start ?? departure

/** How far along its route the schedule's plane is at `t`: 0 at the departure airport, 1 at the arrival airport. */
export function scheduledFraction(departure: number, arrival: number, t: number): number {
  const window = airborneWindow(departure, arrival)
  if (!window) return t >= arrival ? 1 : 0
  return Math.min(Math.max((t - window.start) / (window.end - window.start), 0), 1)
}

/**
 * When the schedule's plane is `fraction` of the way along its route: the inverse of `scheduledFraction`, for the facts'
 * milestones (Stage 2 spec §4.2). Null when the flight has no time in the air.
 */
export function scheduledTime(departure: number, arrival: number, fraction: number): number | null {
  const window = airborneWindow(departure, arrival)
  if (!window) return null
  return window.start + Math.min(Math.max(fraction, 0), 1) * (window.end - window.start)
}
