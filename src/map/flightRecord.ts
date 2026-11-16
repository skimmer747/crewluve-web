import { FIRST_POINT_RADIUS, pointAtDistance, type FlightPath } from './flightPath'
import { distanceLeft, flownPlan, timeToFly, type FlightPlan } from './flightPlan'
import type { GeoPoint } from './greatCircle'

/**
 * Where a flight with a real path was at any moment, and when it was any distance along it (Stage 3 spec §7.2), as
 * the app's FlightRecord. The replay, the facts' times and the estimated plane all read it.
 */
export interface FlightRecord {
  path: FlightPath
  /** The schedule's plan. */
  plan: FlightPlan
  /** The plan as the plane flies it, at its own speed once that's known: what it flies after the last place seen. */
  flownPlan: FlightPlan
  /** When it left the ground: the time of the first place it was seen, when that's close enough to the departure airport to tell (spec §7.1). */
  takeoff: number | null
  /** When it touched down, or is estimated to: the last place it was seen, plus the flown plan's time for the rest. */
  touchdown: number
}

/** The record of `path`, flown against `plan`, or null for a path with no place the plane was seen: such a flight has no record. */
export function makeFlightRecord(path: FlightPath, plan: FlightPlan): FlightRecord | null {
  const first = path.knots[0]
  const last = path.knots[path.knots.length - 1]
  if (!first || !last) return null
  const flown = flownPlan(plan, path)
  return {
    path,
    plan,
    flownPlan: flown,
    takeoff: first.distance <= FIRST_POINT_RADIUS ? first.time : null,
    touchdown: path.hasLanded ? last.time : last.time + timeToFly(flown, path.length - last.distance),
  }
}

/**
 * How far along its path the plane was at `t`, in meters.
 * - Before the first place it was seen, it flies there from the departure airport at the plan's speed, and waits at
 *   the airport before that.
 * - Among the places it was seen, it's between the two either side of `t`, in proportion to the time.
 * - After the last, it flies the flown plan to the arrival airport, and stays there. A flight that landed is there.
 */
export function recordDistanceAt(record: FlightRecord, t: number): number {
  const { knots } = record.path
  const first = knots[0]
  const last = knots[knots.length - 1]
  if (t <= first.time) return Math.max(0, first.distance - ((first.time - t) / 1000) * record.plan.speed)
  if (t >= last.time) {
    if (record.path.hasLanded) return record.path.length
    const estimated = record.path.length - distanceLeft(record.flownPlan, record.touchdown - t)
    return Math.min(Math.max(estimated, last.distance), record.path.length)
  }
  for (let i = 1; i < knots.length; i++) {
    const earlier = knots[i - 1]
    const later = knots[i]
    if (t >= later.time) continue
    return earlier.distance + (later.distance - earlier.distance) * ((t - earlier.time) / (later.time - earlier.time))
  }
  return last.distance
}

/** Where the plane was at `t`. */
export const recordPositionAt = (record: FlightRecord, t: number): GeoPoint => pointAtDistance(record.path, recordDistanceAt(record, t))

/** When the plane was `distance` meters along its path: `recordDistanceAt` the other way round. */
export function recordTimeAt(record: FlightRecord, distance: number): number {
  const { knots, length, hasLanded } = record.path
  const first = knots[0]
  const last = knots[knots.length - 1]
  const far = Math.min(Math.max(distance, 0), length)
  if (far <= first.distance) return first.time - ((first.distance - far) / record.plan.speed) * 1000
  if (far >= last.distance) return hasLanded ? last.time : record.touchdown - timeToFly(record.flownPlan, length - far)
  for (let i = 1; i < knots.length; i++) {
    const earlier = knots[i - 1]
    const later = knots[i]
    if (far > later.distance) continue
    if (later.distance <= earlier.distance) return earlier.time
    return earlier.time + (later.time - earlier.time) * ((far - earlier.distance) / (later.distance - earlier.distance))
  }
  return last.time
}
