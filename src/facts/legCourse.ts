import { makeFlightPath, type FlightPath, type StretchKind } from '../map/flightPath'
import { airborneWindow } from '../map/flightProgress'
import { recordPositionAt, recordTimeAt } from '../map/flightRecord'
import type { GeoPoint } from '../map/greatCircle'
import { legDistanceMeters, positionAtTime, timeAtFraction, type MapLeg } from '../map/tripMap'

/**
 * A leg as the facts follow it (Stage 3 spec §8), as the app's MapLeg+Course: along its real path at the times of its
 * record, once the plane has been seen in the air, and otherwise along the great circle on the schedule. The facts ask
 * these, so they needn't know which kind of flight it is. The map's own `legProgress`, `positionAt` and
 * `timeAtFraction` stay the schedule's: the schedule's plane and the replay's clock read them. Distances are meters
 * along the path, and times epoch ms.
 */

// The path

/** The path the facts follow: the flight's own, real once the plane has been seen in the air, else the great circle between the airports. */
export const legPath = (leg: MapLeg): FlightPath => leg.flight?.path ?? makeFlightPath(leg.origin.place, leg.destination.place)

/** The path's whole length, flown and ahead. Without a real path, the great-circle distance. */
export const legPathLength = (leg: MapLeg): number => leg.flight?.path.length ?? legDistanceMeters(leg)

/** Whether Crewlu Cloud has seen this flight: it knows a place it was last seen, or the path it flew. */
export const hasLiveData = (leg: MapLeg): boolean => leg.flight != null && (leg.flight.live?.fix != null || leg.flight.path.isReal)

/** The kind of `path` `distance` meters along it: the stretch `pointAtDistance` reads there. */
export function kindAtDistance(path: FlightPath, distance: number): StretchKind {
  const far = Math.min(Math.max(distance, 0), path.length)
  return path.stretches.find((s) => far <= s.startDistance + s.length)?.kind ?? 'planned'
}

// Its times

/**
 * When the plane was, or is expected to be, `distance` meters along its path: by its record, and without one by the
 * schedule. Null for a flight with no time in the air.
 */
export function legTimeAtDistance(leg: MapLeg, distance: number): number | null {
  const record = leg.flight?.record
  if (record) return recordTimeAt(record, distance)
  const length = legPathLength(leg)
  return timeAtFraction(leg, length > 0 ? distance / length : 0)
}

/** When the plane is halfway along its path, flown and ahead: by its record, else the middle of the schedule's time in the air. */
export function legHalfwayTime(leg: MapLeg): number | null {
  const record = leg.flight?.record
  if (record) return recordTimeAt(record, record.path.length / 2)
  return timeAtFraction(leg, 0.5)
}

/**
 * Whether the plane was seen `distance` meters along its path. Where nobody saw it, on a stretch with no coverage or past
 * the last place it was seen, what happens there is a best guess, and its time reads "about" (best guesses design §1). A
 * flight with no real path flies the schedule, which is told as it is.
 */
export function isSeenAt(leg: MapLeg, distance: number): boolean {
  const path = leg.flight?.path
  if (!path?.isReal) return true
  return kindAtDistance(path, distance) === 'seen'
}

// The sky's questions

/**
 * When the plane is in the air. With a record, from leaving the departure airport to its touchdown, real or estimated.
 * Otherwise the schedule's time in the air. Null for a flight that arrives no later than it leaves.
 */
export function legAirborne(leg: MapLeg): { start: number; end: number } | null {
  const record = leg.flight?.record
  if (!record) return airborneWindow(leg.start, leg.end)
  const takeoff = recordTimeAt(record, 0)
  return record.touchdown > takeoff ? { start: takeoff, end: record.touchdown } : null
}

/**
 * Where the plane was, or is expected to be, at `t`: by its record, else by the schedule. Unlike `legPlane` it keeps
 * moving between the places the real plane is seen, which the sun's times and the plane's speed across the sky need.
 */
export function coursePositionAt(leg: MapLeg, t: number): GeoPoint {
  const record = leg.flight?.record
  return record ? recordPositionAt(record, t) : positionAtTime(leg, t)
}
