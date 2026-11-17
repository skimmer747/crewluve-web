import { pointAtDistance } from '../map/flightPath'
import { OWN_SPEED_AHEAD_MS } from '../map/flightPlan'
import { recordDistanceAt } from '../map/flightRecord'
import type { GeoPoint } from '../map/greatCircle'
import { mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { legProgress, positionAt, type MapLeg } from '../map/tripMap'
import { legPathLength } from './legCourse'

/**
 * Where the facts have a flight's plane at a moment (Stage 3 spec §8), as the app's PlanePosition: the real plane
 * wherever the map draws one, placed by the map's own rule (`flightDrawing`'s sighting) so the two agree, and
 * otherwise the schedule's. A test holds the two together at every moment of the shared cases.
 */

export interface PlanePosition {
  /** How far along the leg's path, in meters. */
  distance: number
  place: GeoPoint
  /** Set while the real plane is an estimate: how long ago it was last seen, in ms. It's where the plan has it by now. */
  unseenFor: number | null
  /** Whether `unseenFor` is set: the real plane is an estimate, faded on the map and "about" in the words. */
  isEstimated: boolean
  /**
   * The real plane, seen in the air just now. Never in a replay: what only the newest fix tells, its height and its
   * speed, is for now only.
   */
  isSeenInAir: boolean
}

const position = (distance: number, place: GeoPoint, unseenFor: number | null, isSeenInAir: boolean): PlanePosition =>
  ({ distance, place, unseenFor, isEstimated: unseenFor != null, isSeenInAir })

/**
 * How long out of tracking range the facts tell the plane's best guesses in full, in ms: the 2 hours its own speed is
 * trusted for, deliberately the same. Past them, where it's guessed to be can be hundreds of miles from where it is, so
 * the facts name only an ocean under it, and hold their events until it's tracked again or the flight is over (long gap
 * design §3).
 */
export const GUESS_HORIZON_MS = OWN_SPEED_AHEAD_MS

/** Whether the real plane has been out of tracking range for longer than `GUESS_HORIZON_MS`. */
export const isPastGuessHorizon = (plane: PlanePosition) => plane.unseenFor != null && plane.unseenFor > GUESS_HORIZON_MS

/**
 * The real plane at `t`, or null where the schedule's plane shows instead: the flight isn't live now, or has no record
 * to replay. `t` is now by this browser's clock, or a moment of the replay when `isReplay`, when the plane is where its
 * record has it.
 */
export function mapFlightPlane(flight: MapFlight, t: number, isReplay: boolean): PlanePosition | null {
  const path = flight.path
  if (isReplay) {
    const lastSeen = path.knots[path.knots.length - 1]
    if (!flight.record || !lastSeen) return null
    const distance = recordDistanceAt(flight.record, t)
    // Past the last place it was seen, the record flies the plan: an estimate.
    const isEstimated = !path.hasLanded && distance > path.flownLength
    return position(distance, pointAtDistance(path, distance), isEstimated ? Math.max(0, t - lastSeen.time) : null, false)
  }
  const progress = mapFlightProgress(flight, t)
  if (!progress.plane) return null
  // Crewlu Cloud's clock ages the fix, as it decides the phase.
  const fix = flight.live?.fix
  const unseenFor = progress.phase === 'estimated' && fix ? Math.max(0, t + flight.clockOffset - fix.seenAt) : null
  // A plane on the ground somewhere else isn't on the path: it counts as far as it was last seen flying.
  return position(progress.planeDistance ?? path.flownLength, progress.plane, unseenFor, progress.phase === 'inAir')
}

/**
 * Where the plane is at `t`: the real one where the map draws it, and otherwise the schedule's, where the map draws
 * that. The schedule's plane counts as far along the leg's path as the schedule has it along the great circle, which
 * without a real path is the same thing.
 */
export function legPlane(leg: MapLeg, t: number, isReplay: boolean): PlanePosition {
  const real = leg.flight ? mapFlightPlane(leg.flight, t, isReplay) : null
  if (real) return real
  const fraction = legProgress(leg, t)
  return position(fraction * legPathLength(leg), positionAt(leg, fraction), null, false)
}
