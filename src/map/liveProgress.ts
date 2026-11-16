import { MINUTE } from '../time/zoned'
import { pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, taxiIn, taxiOut, timeInAir, timeToFly, type FlightPlan } from './flightPlan'
import type { FlightRecord } from './flightRecord'
import { distanceMeters, METERS_PER_NM, type GeoPoint } from './greatCircle'
import { liveLabel, type LiveLabel } from './liveLabel'
import type { LiveFix, LiveFlight } from './liveFlight'

/**
 * A flight's real plane at one moment (Stage 3 spec §5, §7.1), as the app's LiveProgress: whether it's live, when it
 * will land, how far ahead of the schedule or behind it that is, where the real plane and the ghost are, and the leg's
 * real times.
 */

/**
 * - notLive: no live data, never seen, or last seen on the ground too long ago: the schedule's plane alone;
 * - onGround: seen on the ground at the departure airport;
 * - inAir: seen in the air lately;
 * - estimated: last seen in the air too long ago: the real plane flies the plan on from there, at the plane's own
 *   speed once that's known;
 * - landed;
 * - elsewhere: on the ground anywhere else: a diversion.
 */
export type LivePhase = 'notLive' | 'onGround' | 'inAir' | 'estimated' | 'landed' | 'elsewhere'

/** A fix this old or newer is live, by Crewlu Cloud's clock: 3 minutes. Crewlu Cloud asks for one a minute, so this outlasts a single answer that didn't come. */
export const FRESH_FOR_MS = 3 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. */
export const AIRPORT_RADIUS = 10 * METERS_PER_NM

export interface LiveProgress {
  phase: LivePhase
  /** When the real plane touches down, or did. Null where there's no estimate. */
  touchdown: number | null
  /** When it reaches the gate: `touchdown` plus the plan's taxi in. */
  liveArrival: number | null
  /** The plan's touchdown minus `touchdown`, to the nearest minute. Ahead is positive. */
  gapMinutes: number | null
  label: LiveLabel | null
  /** How far along the path the real plane is, in meters. Null when it isn't shown, or isn't on the path. */
  planeDistance: number | null
  /** Where the real plane is. Null when it isn't shown. */
  plane: GeoPoint | null
  /** How far along the path a plane that lands on schedule would be, flying as this one does. Null when the ghost isn't shown. */
  ghostDistance: number | null
  /**
   * The leg's real times (spec §7.1): its start, moved earlier by an early takeoff, and its end, the live arrival where
   * there is one. Otherwise they're the plan's.
   */
  start: number
  end: number
}

/**
 * The real plane of a leg at `now`, by Crewlu Cloud's clock.
 * - `plan`: the leg's plan, from its scheduled times moved by the reported delay.
 * - `path`: the leg's path, made from `flight`.
 * - `record`: the path's record, when it's a real one.
 * - `flight`: the leg's live data, or null when Crewlu Cloud answered none.
 */
export function liveProgress(plan: FlightPlan, path: FlightPath, record: FlightRecord | null, flight: LiveFlight | null, now: number): LiveProgress {
  const phase = phaseOf(flight, path.origin, now)
  // The plane's own speed stands in for the plan's, for the estimate, the estimated plane and the ghost alike.
  const flown = flownPlan(plan, path)
  const touchdown = touchdownOf(phase, flown, path, record, flight, now)
  const plane = planeOf(phase, flown, path, flight?.fix ?? null, touchdown, now)
  const liveArrival = touchdown == null ? null : touchdown + taxiIn(plan)
  const gap = touchdown == null ? null : gapMinutes(plan.touchdown - touchdown)
  const earlyStart = record?.takeoff == null ? null : record.takeoff - taxiOut(plan)
  return {
    phase,
    touchdown,
    liveArrival,
    gapMinutes: gap,
    label: liveLabel(phase, gap),
    planeDistance: plane.distance,
    plane: plane.place,
    ghostDistance: ghostDistanceOf(phase, flown, path, now),
    start: earlyStart == null ? plan.departure : Math.min(earlyStart, plan.departure),
    end: liveArrival ?? plan.arrival,
  }
}

/** The widest gap there can be, either way: a year of minutes. A time that can't be right is held to it. */
const WIDEST_GAP = 365 * 24 * 60

/** A gap of `ms` ahead (behind when negative) in whole minutes, halves away from zero. */
export function gapMinutes(ms: number): number {
  const exact = ms / MINUTE
  if (Number.isNaN(exact)) return 0
  const minutes = Math.min(Math.round(Math.abs(exact)), WIDEST_GAP)
  // Never -0: a gap under half a minute behind is none.
  return exact < 0 && minutes !== 0 ? -minutes : minutes
}

/** When the real plane touches down, or did (spec §5.2). Null where there's no estimate. `plan` is the plan as the plane flies it. */
function touchdownOf(phase: LivePhase, plan: FlightPlan, path: FlightPath, record: FlightRecord | null, flight: LiveFlight | null, now: number): number | null {
  switch (phase) {
    case 'inAir':
    case 'estimated': {
      // The last fix, plus the time for the straight distance left at the plane's own speed.
      const fix = flight?.fix
      return fix ? fix.seenAt + timeToFly(plan, distanceMeters(fix.place, path.destination)) : null
    }
    case 'onGround':
      // Past the plan's takeoff, it's as if the plane took off this moment.
      return now >= plan.takeoff ? now + timeInAir(plan) : null
    case 'landed':
      // The record's landing, where there is one, so the two can't disagree.
      return record?.touchdown ?? flight?.landedAt ?? flight?.fix?.seenAt ?? null
    case 'notLive':
    case 'elsewhere':
      return null
  }
}

/** Where the real plane is, and how far along the path. Neither when it isn't shown, and no distance when it isn't on the path. */
function planeOf(
  phase: LivePhase,
  plan: FlightPlan,
  path: FlightPath,
  fix: LiveFix | null,
  touchdown: number | null,
  now: number,
): { distance: number | null; place: GeoPoint | null } {
  switch (phase) {
    case 'inAir':
      return { distance: path.flownLength, place: fix?.place ?? null }
    case 'estimated': {
      // It flies on from its last fix as the plan has it, and stays at the arrival airport once it's there (spec §5.5).
      if (touchdown == null) return { distance: null, place: null }
      const left = distanceLeft(plan, touchdown - now)
      const distance = Math.min(Math.max(path.length - left, path.flownLength), path.length)
      return { distance, place: pointAtDistance(path, distance) }
    }
    case 'landed':
      return { distance: path.length, place: path.destination }
    case 'onGround':
      return { distance: 0, place: fix?.place ?? null }
    case 'elsewhere':
      return { distance: null, place: fix?.place ?? null }
    case 'notLive':
      return { distance: null, place: null }
  }
}

/** How far along the path a plane landing on schedule would be, flying `plan` (spec §5.4). Null when the ghost isn't shown. */
function ghostDistanceOf(phase: LivePhase, plan: FlightPlan, path: FlightPath, now: number): number | null {
  switch (phase) {
    case 'inAir':
    case 'estimated':
    case 'onGround':
      // Until the plan's takeoff it waits at the departure airport, however long the real path is.
      if (now < plan.takeoff) return 0
      return Math.max(0, path.length - distanceLeft(plan, plan.touchdown - now))
    case 'landed':
    case 'elsewhere':
    case 'notLive':
      return null
  }
}

/** What the live data says of a flight from `origin` at `now` (spec §5.1). */
function phaseOf(flight: LiveFlight | null, origin: GeoPoint, now: number): LivePhase {
  const fix = flight?.fix
  if (!flight || !fix) return 'notLive'
  const isFresh = now - fix.seenAt <= FRESH_FOR_MS
  switch (flight.state) {
    case 'waiting':
      return 'notLive'
    case 'landed':
      return 'landed'
    case 'airborne':
      return isFresh ? 'inAir' : 'estimated'
    case 'ground':
      if (!isFresh) return 'notLive'
      return distanceMeters(fix.place, origin) <= AIRPORT_RADIUS ? 'onGround' : 'elsewhere'
  }
}
