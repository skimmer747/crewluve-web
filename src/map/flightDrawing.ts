import { pointAtDistance, type FlightPath } from './flightPath'
import { pathHeadingAt, pathPoints, pathPointsBetween, pathRuns } from './flightPathDrawing'
import { recordDistanceAt } from './flightRecord'
import type { GeoPoint } from './greatCircle'
import { mapFlightProgress, type MapFlight } from './mapFlight'
import { headingAt, isMoving, legProgress, positionAt, type MapLeg } from './tripMap'

/**
 * What one flight draws at a moment (Stage 3 spec §5.1, §5.4, §6.2, §7.3), as the app's FlightDrawing, chosen by the
 * real plane's phase:
 *
 * | The flight is | Lines | Planes |
 * |---|---|---|
 * | past its gate | one grey line along its path, real or not | none |
 * | still to leave its gate | dashed along its path | none |
 * | between its gates, not live | as before: the great circle, flown and ahead | the schedule's |
 * | on the ground at the departure airport | the whole path dashed | the real plane at its fix, and the ghost |
 * | in the air | solid where it was seen, dotted where it wasn't, dashed ahead | the real plane at its fix, and the ghost |
 * | estimated | the same, with the plan's line dotted from its last fix to it | the real plane faded, and the ghost |
 * | landed | the whole path flown | the real plane at the arrival airport |
 * | on the ground somewhere else | flown as far as it was seen, dashed from there | the real plane where it is |
 * | at a moment of the replay, with a record | flown as far as the record has it, dashed from there | the real plane alone |
 */

/**
 * - upcoming: still to fly, dashed;
 * - flying: flown so far on the leg in the air, by the schedule's plane, solid;
 * - flown: a flight earlier in the trip, grey;
 * - drive: dotted;
 * - seen: a real path flown, where the plane was seen, solid;
 * - unseen: a real path flown where nobody saw the plane, or the plan's line behind a plane only estimated to have flown it, dotted.
 */
export type SegmentStyle = 'upcoming' | 'flying' | 'flown' | 'drive' | 'seen' | 'unseen'

export interface RouteSegment {
  id: string
  /**
   * The places the line passes, at least two. A dashed or dotted line's pattern starts at its first place, on the SVG
   * map and on Apple's, so a real path's line whose one end moves is written from the end that stays still, and its
   * dashes don't crawl as the plane moves: a dotted line from the place the plane was last seen, and the line ahead from
   * the arrival airport back to the plane. (The app writes them the other way round: MapKit on iOS lays the pattern from
   * a line's last place.)
   */
  points: GeoPoint[]
  style: SegmentStyle
  /** Flights follow great circles between their places; drives are short enough to draw straight. */
  geodesic: boolean
}

/** A plane: where, and its angle in radians (0 east, clockwise). */
export interface PlaneMark {
  place: GeoPoint
  angle: number
}

/** The real plane, faded while it's an estimate (spec §5.4). */
export interface RealPlaneMark extends PlaneMark {
  isEstimated: boolean
}

export interface FlightDrawing {
  segments: RouteSegment[]
  /** The schedule's plane, alone: the flight has no real plane at this moment. */
  plane: PlaneMark | null
  realPlane: RealPlaneMark | null
  /** Where an on-schedule plane would be, beside the real one. Now only: a replay has none. */
  ghost: PlaneMark | null
}

const NO_PLANES = { plane: null, realPlane: null, ghost: null }

/**
 * `leg`, a flight, at `t`: now by this browser's clock, or a moment of the replay when `isReplay`, when the real plane
 * flies its record, alone.
 */
export function flightDrawing(leg: MapLeg, t: number, isReplay: boolean): FlightDrawing {
  const path = leg.flight?.path
  const whole = path ? pathPoints(path) : [leg.origin.place, leg.destination.place]
  if (t >= leg.end) return { segments: [{ id: `${leg.id}-flown`, points: whole, style: 'flown', geodesic: true }], ...NO_PLANES }
  if (!isMoving(leg, t)) return { segments: [{ id: `${leg.id}-upcoming`, points: whole, style: 'upcoming', geodesic: true }], ...NO_PLANES }
  const sighting = leg.flight ? sightingOf(leg.flight, t, isReplay) : null
  if (path && sighting) {
    return { segments: pathSegments(leg.id, path, sighting.distance), plane: null, realPlane: sighting.plane, ghost: sighting.ghost }
  }
  // The schedule's plane on the great circle, as before Stage 3.
  const fraction = legProgress(leg, t)
  const here = positionAt(leg, fraction)
  const segments: RouteSegment[] = []
  if (fraction > 0) segments.push({ id: `${leg.id}-flying`, points: [leg.origin.place, here], style: 'flying', geodesic: true })
  if (fraction < 1) segments.push({ id: `${leg.id}-upcoming`, points: [here, leg.destination.place], style: 'upcoming', geodesic: true })
  return { segments, plane: { place: here, angle: headingAt(leg, t) ?? 0 }, realPlane: null, ghost: null }
}

/** The real plane of a flight between its gates: how far along the path the lines turn from flown to still to come, and its planes. */
interface Sighting {
  distance: number
  plane: RealPlaneMark
  ghost: PlaneMark | null
}

/** The real plane at `t`, or null when the schedule's plane shows instead: the flight isn't live now, or has no record to replay. */
function sightingOf(flight: MapFlight, t: number, isReplay: boolean): Sighting | null {
  const path = flight.path
  if (isReplay) {
    if (!flight.record) return null
    const distance = recordDistanceAt(flight.record, t)
    // Past the last place it was seen, the record flies the plan: an estimate, drawn as one.
    const isEstimated = !path.hasLanded && distance > path.flownLength
    return { distance, plane: { place: pointAtDistance(path, distance), angle: pathHeadingAt(path, distance) ?? 0, isEstimated }, ghost: null }
  }
  const progress = mapFlightProgress(flight, t)
  if (!progress.plane) return null
  // A plane on the ground somewhere else isn't on the path: the lines stay as it was last seen flying them.
  const distance = progress.planeDistance ?? path.flownLength
  // In the air the plane points the way it's really going, and otherwise along its path.
  const track = progress.phase === 'inAir' ? flight.live?.fix?.trackDeg ?? null : null
  const angle = track != null ? ((track - 90) * Math.PI) / 180 : pathHeadingAt(path, distance) ?? 0
  const ghost = progress.ghostDistance == null ? null
    : { place: pointAtDistance(path, progress.ghostDistance), angle: pathHeadingAt(path, progress.ghostDistance) ?? 0 }
  return { distance, plane: { place: progress.plane, angle, isEstimated: progress.phase === 'estimated' }, ghost }
}

/**
 * The path's lines with the plane `distance` meters along it (spec §6.2). Behind the plane the path is flown: solid where
 * the plane was seen, and dotted where nobody saw it, which is also the plan's line behind a plane that's only estimated
 * to have flown it. Ahead of the plane it's still to come. Two runs drawn the same way are one line, so its dots don't
 * start again where they meet.
 */
function pathSegments(legId: string, path: FlightPath, distance: number): RouteSegment[] {
  const segments: RouteSegment[] = []
  for (const run of pathRuns(path, 0, distance)) {
    const style = run.kind === 'seen' ? 'seen' : 'unseen'
    const last = segments[segments.length - 1]
    if (last?.style === style) last.points.push(...run.points.slice(1))
    else segments.push({ id: `${legId}-${style}-${segments.length}`, points: [...run.points], style, geodesic: true })
  }
  // Written from the airport back to the plane, which moves.
  const ahead = pathPointsBetween(path, distance, path.length).reverse()
  if (ahead.length > 0) segments.push({ id: `${legId}-upcoming`, points: ahead, style: 'upcoming', geodesic: true })
  return segments
}
