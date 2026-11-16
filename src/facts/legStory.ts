import { makeFlightPath, pointAtDistance, type FlightPath } from '../map/flightPath'
import { distanceMeters, METERS_PER_MILE, type GeoPoint } from '../map/greatCircle'
import type { AirportMark, MapLeg } from '../map/tripMap'
import { placeAt, samePlace, type Geography, type Place } from './geography'
import { legPath } from './legCourse'

/**
 * A flight's story (Stage 2 spec §4.2, Stage 3 spec §8), as the app's LegStory: the places under its path and its
 * closest point to home, as fractions of the way along, 0 at the departure airport and 1 at the arrival. The path is the
 * great circle until the plane has been seen in the air, and its real path from then on, when the story is made again
 * as the path grows. The leg turns a distance along its path into a time (`legTimeAtDistance`), so a new delay moves
 * every time without redoing the geography.
 */

/** A place under the route, from where it starts. */
export interface Stretch {
  place: Place
  start: number
}

/** The route's closest point to home. */
export interface ClosestToHome {
  fraction: number
  meters: number
}

export interface LegStory {
  /** In order. The first starts at 0. Empty without geography. */
  stretches: Stretch[]
  closestToHome: ClosestToHome | null
  /**
   * The length of the path the story was made along, in meters: a fraction of the way is that share of it. A real path
   * grows at its far end, and a place this far along it stays this far along it, so the story is read by distance.
   */
  length: number
}

/** The route is looked up this often. */
export const SAMPLE_SPACING_M = 10 * METERS_PER_MILE
export const MINIMUM_SAMPLES = 16
/** A place counts once the route stays in it this far, so a route along a border doesn't flicker. */
export const HOLD_DISTANCE_M = 25 * METERS_PER_MILE
/** Crossings and the closest point are narrowed down to this. */
export const PRECISION_M = 0.1 * METERS_PER_MILE
/** Home counts when the route passes this close. */
export const HOME_RADIUS_M = 100 * METERS_PER_MILE

/** A path as the story samples it, by the fraction of the way along. */
interface Route {
  path: FlightPath
  length: number
  sampleCount: number
  step: number
}

function route(path: FlightPath): Route {
  const length = path.length
  const sampleCount = Math.max(MINIMUM_SAMPLES, Math.ceil(length / SAMPLE_SPACING_M) + 1)
  return { path, length, sampleCount, step: 1 / (sampleCount - 1) }
}

const pointOn = (r: Route, fraction: number) => pointAtDistance(r.path, fraction * r.length)

interface Run {
  place: Place
  first: number
  last: number
}

function stretchesAlong(r: Route, geography: Geography): Stretch[] {
  const places = Array.from({ length: r.sampleCount }, (_, i) => placeAt(geography, pointOn(r, i * r.step)))

  // Runs of one place. A sample with no place joins no run, so a gap changes nothing.
  const runs: Run[] = []
  places.forEach((place, index) => {
    if (!place) return
    const last = runs[runs.length - 1]
    if (last && samePlace(last.place, place)) last.last = index
    else runs.push({ place, first: index, last: index })
  })

  // The hold rule: a run shorter than 25 mi goes, and the runs either side of it join if they're one place.
  const spacing = r.length * r.step
  const held: Run[] = []
  for (const run of runs) {
    if ((run.last - run.first + 1) * spacing < HOLD_DISTANCE_M) continue
    const last = held[held.length - 1]
    if (last && samePlace(last.place, run.place)) last.last = run.last
    else held.push({ ...run })
  }

  if (held.length === 0) return []
  const stretches: Stretch[] = [{ place: held[0].place, start: 0 }]
  for (let i = 1; i < held.length; i++) {
    const start = boundary(held[i].place, held[i - 1].last * r.step, held[i].first * r.step, r, geography)
    stretches.push({ place: held[i].place, start })
  }
  return stretches
}

/** Where `place` begins between two fractions, by bisection. */
function boundary(place: Place, after: number, before: number, r: Route, geography: Geography): number {
  let low = after
  let high = before
  while ((high - low) * r.length > PRECISION_M) {
    const middle = (low + high) / 2
    if (samePlace(placeAt(geography, pointOn(r, middle)), place)) high = middle
    else low = middle
  }
  return high
}

function closestPoint(r: Route, home: GeoPoint): ClosestToHome | null {
  const distances = Array.from({ length: r.sampleCount }, (_, i) => distanceMeters(pointOn(r, i * r.step), home))
  let nearest = 0
  distances.forEach((d, i) => {
    if (d < distances[nearest]) nearest = i
  })
  if (nearest === 0 || nearest === r.sampleCount - 1) return null

  // The distance has one minimum between the nearest sample's neighbours: narrow it down by thirds.
  let low = (nearest - 1) * r.step
  let high = (nearest + 1) * r.step
  while ((high - low) * r.length > PRECISION_M) {
    const third = (high - low) / 3
    if (distanceMeters(pointOn(r, low + third), home) < distanceMeters(pointOn(r, high - third), home)) high -= third
    else low += third
  }
  const fraction = (low + high) / 2
  const meters = distanceMeters(pointOn(r, fraction), home)
  return meters <= HOME_RADIUS_M ? { fraction, meters } : null
}

/** The story along `path`. `home` is null for a flight that starts or ends there. */
export function storyAlong(path: FlightPath, geography: Geography | null, home: GeoPoint | null): LegStory {
  const r = route(path)
  return { stretches: geography ? stretchesAlong(r, geography) : [], closestToHome: home ? closestPoint(r, home) : null, length: path.length }
}

/** The story along the great circle from `origin` to `destination`. `home` is null for a flight that starts or ends there. */
export function routeStory(origin: GeoPoint, destination: GeoPoint, geography: Geography | null, home: GeoPoint | null): LegStory {
  return storyAlong(makeFlightPath(origin, destination), geography, home)
}

/** A flight's story, along its path (`legPath`). Home counts only when the flight doesn't start or end there. */
export function legStory(leg: MapLeg, geography: Geography | null, home: AirportMark | null): LegStory {
  const isHomeLeg = home == null || home.code === leg.origin.code || home.code === leg.destination.code
  return storyAlong(legPath(leg), geography, isHomeLeg ? null : home.place)
}

/** The place `fraction` of the way along, or null where no place is known. */
export function placeAtFraction(story: LegStory, fraction: number): Place | null {
  let found: Place | null = null
  for (const stretch of story.stretches) if (stretch.start <= fraction) found = stretch.place
  return found
}

/** The place `distance` meters along the path, or null where no place is known. */
export const placeAtDistance = (story: LegStory, distance: number): Place | null =>
  placeAtFraction(story, story.length > 0 ? distance / story.length : 0)
