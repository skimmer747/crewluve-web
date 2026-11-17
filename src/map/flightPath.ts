import { MINUTE } from '../time/zoned'
import { DESCENT_DISTANCE } from './flightPlan'
import { distanceMeters, METERS_PER_NM, pointAlong, type GeoPoint } from './greatCircle'
import type { LiveFlight, TrailPoint } from './liveFlight'

/**
 * The path a flight is drawn and measured along (Stage 3 spec §6.1), as the app's FlightPath. With no live data it's
 * the great circle between the airports, as before. With a trail it's the real path: the departure airport, each place
 * the plane was seen, and the great circle from the last of them to the arrival airport. Distances are meters.
 */

/**
 * - seen: flown, between two places the plane was seen close enough together;
 * - unseen: flown, and nobody saw it: the straight join is a guess;
 * - planned: the great circle the schedule flies: a flight with no trail, or the way ahead of a real plane.
 */
export type StretchKind = 'seen' | 'unseen' | 'planned'

/** One join of the path, a great circle between two places. */
export interface Stretch {
  start: GeoPoint
  end: GeoPoint
  kind: StretchKind
  /** How far along the path it starts. */
  startDistance: number
  length: number
}

/** A place the plane was seen: when, and how far along the path. */
export interface Knot {
  time: number
  distance: number
}

/** Two neighbouring places seen further apart in time than this have an unseen join between them. */
export const UNSEEN_GAP_MS = 10 * MINUTE
/** A first place further than this from the departure airport is joined to it unseen, and doesn't tell the takeoff's time: 30 nautical miles. */
export const FIRST_POINT_RADIUS = 30 * METERS_PER_NM
/** A plane has a speed of its own once this much of its cruise has been seen: 10 minutes. */
export const OWN_SPEED_LEAST_MS = 10 * MINUTE
/** On the ground this close to the departure airport is at it: 10 nautical miles. */
export const AIRPORT_RADIUS = 10 * METERS_PER_NM
/**
 * A trail whose highest point is this much above its lowest has flown: 1,000 ft (air return design §2). Heights are from
 * sea level, and a plane taxiing at Denver reads 5,400 ft, so it's a climb, not a height.
 */
export const RETURN_CLIMB_FEET = 1000
/**
 * A point near the departure airport this long after the one before it, which was near it too, starts the trail again:
 * 10 minutes (air return design §4). Points come every 2 minutes in the air, so a hold near the airport never leaves
 * this gap.
 */
export const RESTART_GAP_MS = 10 * MINUTE

export interface FlightPath {
  origin: GeoPoint
  destination: GeoPoint
  /** Never empty, from the departure airport to the arrival airport. */
  stretches: Stretch[]
  /** Each place the plane was seen in the air, oldest first, and then its landing, when it has landed. Empty for a flight never seen in the air. */
  knots: Knot[]
  /** Whether it's a real path, from places the plane was seen. */
  isReal: boolean
  /** The whole path, flown and ahead. */
  length: number
  /** How far along the path the plane was last seen: where the way ahead begins. The whole path once it has landed. */
  flownLength: number
  /**
   * Whether the path ends with a landing: the flight has landed, and was seen in the air before it. A landed flight
   * never seen in the air has the great circle, and this is false: its progress's phase says it landed.
   */
  hasLanded: boolean
  /**
   * The plane's own speed over its cruise so far, in meters a second (spec §4): the distance it flew along the path
   * over the time it took, counted over each stretch between two neighbouring places both seen in its cruise, the
   * descent's distance or more from both airports. Null until those stretches come to OWN_SPEED_LEAST_MS. A stretch
   * nobody saw counts, as the straight join, when both its ends are in the cruise.
   */
  ownSpeed: number | null
}

/** A place the plane was seen in the air, and when. */
interface Sighting {
  place: GeoPoint
  time: number
}

/**
 * The path of a flight from `origin` to `destination`: the real one when `flight` has been seen in the air on its latest
 * try (air return design §4).
 */
export function makeFlightPath(origin: GeoPoint, destination: GeoPoint, flight: LiveFlight | null = null): FlightPath {
  const seen = sightings(flight, origin)
  const first = seen[0]
  const last = seen[seen.length - 1]
  if (!first || !last) {
    const length = distanceMeters(origin, destination)
    const stretches: Stretch[] = [{ start: origin, end: destination, kind: 'planned', startDistance: 0, length }]
    return { origin, destination, stretches, knots: [], isReal: false, length, flownLength: 0, hasLanded: false, ownSpeed: null }
  }
  const stretches: Stretch[] = []
  const knots: Knot[] = []
  let distance = 0
  const add = (start: GeoPoint, end: GeoPoint, kind: StretchKind) => {
    const length = distanceMeters(start, end)
    stretches.push({ start, end, kind, startDistance: distance, length })
    distance += length
  }
  add(origin, first.place, distanceMeters(origin, first.place) > FIRST_POINT_RADIUS ? 'unseen' : 'seen')
  knots.push({ time: first.time, distance })
  for (let i = 1; i < seen.length; i++) {
    add(seen[i - 1].place, seen[i].place, seen[i].time - seen[i - 1].time > UNSEEN_GAP_MS ? 'unseen' : 'seen')
    knots.push({ time: seen[i].time, distance })
  }
  const lastSeenDistance = distance
  const hasLanded = flight?.state === 'landed'
  if (hasLanded) {
    const landedAt = Math.max(flight.landedAt ?? flight.fix?.seenAt ?? last.time, last.time)
    add(last.place, destination, landedAt - last.time > UNSEEN_GAP_MS ? 'unseen' : 'seen')
    knots.push({ time: landedAt, distance })
  } else {
    add(last.place, destination, 'planned')
  }
  return {
    origin,
    destination,
    stretches,
    knots,
    isReal: true,
    length: distance,
    flownLength: hasLanded ? distance : lastSeenDistance,
    hasLanded,
    ownSpeed: cruiseSpeed(seen, knots, origin, destination),
  }
}

/**
 * The speed over the cruise: the distance between `knots` over the time between them, counted over each stretch
 * between two neighbours of `seen` that are both the descent's distance or more from both airports, in a straight
 * line. Null when those stretches come to under OWN_SPEED_LEAST_MS. A place's distance from an airport never changes,
 * so a hold or a pattern near the arrival airport can't bring its places into the cruise, and neither can a return to
 * the departure airport and the wait there.
 */
function cruiseSpeed(seen: Sighting[], knots: Knot[], origin: GeoPoint, destination: GeoPoint): number | null {
  const inCruise = seen.map((s) => distanceMeters(origin, s.place) >= DESCENT_DISTANCE && distanceMeters(s.place, destination) >= DESCENT_DISTANCE)
  let time = 0
  let flown = 0
  for (let i = 1; i < seen.length; i++) {
    if (!inCruise[i - 1] || !inCruise[i]) continue
    time += knots[i].time - knots[i - 1].time
    flown += knots[i].distance - knots[i - 1].distance
  }
  return time >= OWN_SPEED_LEAST_MS ? flown / (time / 1000) : null
}

/**
 * Each place `flight` from `origin` was seen in the air on its latest try, oldest first: that try's trail points
 * (`latestTry`), and then its fix, when that's in the air and newer than the last of them. An air return and the wait
 * after it aren't the flight's path (air return design §4).
 */
function sightings(flight: LiveFlight | null, origin: GeoPoint): Sighting[] {
  const seen: Sighting[] = latestTry(flight, origin).map((point) => ({ place: point.place, time: point.time }))
  const fix = flight?.fix
  if (fix && !fix.onGround && fix.seenAt > (seen[seen.length - 1]?.time ?? -Infinity)) seen.push({ place: fix.place, time: fix.seenAt })
  return seen
}

/** The trail of `flight`, oldest first, with two points of one time in the order they came. */
const sortedTrail = (flight: LiveFlight): TrailPoint[] =>
  flight.trail
    .map((point, order) => ({ point, order }))
    .sort((a, b) => a.point.time - b.point.time || a.order - b.order)
    .map(({ point }) => point)

/** Whether the highest of `points` is RETURN_CLIMB_FEET or more above the lowest. Points with no height don't count. */
function hasClimbed(points: TrailPoint[]): boolean {
  const feet = points.flatMap((p) => (p.altitudeFt == null ? [] : [p.altitudeFt]))
  return feet.length > 0 && Math.max(...feet) - Math.min(...feet) >= RETURN_CLIMB_FEET
}

/**
 * Whether the plane of `flight` is back on the ground at its departure airport, at `origin`, after flying (air return
 * design §2): on the ground by Crewlu Cloud's state, its fix within AIRPORT_RADIUS of the airport, and its whole trail
 * climbed RETURN_CLIMB_FEET. How old the fix is isn't asked: `liveProgress` asks that.
 */
export function isBack(flight: LiveFlight | null, origin: GeoPoint): boolean {
  const fix = flight?.fix
  if (!flight || flight.state !== 'ground' || !fix) return false
  return distanceMeters(fix.place, origin) <= AIRPORT_RADIUS && hasClimbed(flight.trail)
}

/**
 * The trail of the flight's latest try, oldest first (air return design §4). A try starts again at a place seen in the
 * air within FIRST_POINT_RADIUS of `origin` more than RESTART_GAP_MS after the point before it, which was within
 * AIRPORT_RADIUS, once the try before had climbed RETURN_CLIMB_FEET. The fix in the air, when it's newer than the trail,
 * can start one too, with no trail points yet. None while the plane is back on the ground there.
 */
export function latestTry(flight: LiveFlight | null, origin: GeoPoint): TrailPoint[] {
  if (!flight || isBack(flight, origin)) return []
  const points = sortedTrail(flight)
  const places = points.map((p) => ({ time: p.time, place: p.place }))
  const fix = flight.fix
  if (fix && !fix.onGround && fix.seenAt > (points[points.length - 1]?.time ?? -Infinity)) places.push({ time: fix.seenAt, place: fix.place })
  let start = 0
  for (let i = 1; i < places.length; i++) {
    const earlier = places[i - 1]
    const later = places[i]
    if (later.time - earlier.time > RESTART_GAP_MS && distanceMeters(earlier.place, origin) <= AIRPORT_RADIUS
      && distanceMeters(later.place, origin) <= FIRST_POINT_RADIUS && hasClimbed(points.slice(start, i))) start = i
  }
  return points.slice(start)
}

/** The place `distance` meters along `path`. Before its start that's the departure airport, and past its end the arrival airport. */
export function pointAtDistance(path: FlightPath, distance: number): GeoPoint {
  const far = Math.min(Math.max(distance, 0), path.length)
  const stretch = path.stretches.find((s) => far <= s.startDistance + s.length)
  if (!stretch) return path.destination
  if (stretch.length <= 0) return stretch.start
  return pointAlong(stretch.start, stretch.end, (far - stretch.startDistance) / stretch.length)
}
