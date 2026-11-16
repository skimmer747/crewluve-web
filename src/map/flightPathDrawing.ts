import { pointAtDistance, type FlightPath, type StretchKind } from './flightPath'
import { pointsAlong, type GeoPoint } from './greatCircle'
import { flatMapAngle, LOOK_AHEAD } from './planeHeading'

/** What the map draws and frames of a flight's path (Stage 3 spec §6.2), as the app's FlightPath+Drawing. Distances are meters along it. */

/** A part of the path that's all one kind, as the places it passes. */
export interface PathRun {
  kind: StretchKind
  points: GeoPoint[]
}

/** Every place the path passes, from the departure airport to the arrival airport. */
export const pathPoints = (path: FlightPath): GeoPoint[] => [...path.stretches.map((s) => s.start), path.destination]

/**
 * The path between `start` and `end` meters along it, cut wherever its kind changes. Each run begins where the one
 * before it ended. Empty when `end` isn't past `start`.
 */
export function pathRuns(path: FlightPath, start: number, end: number): PathRun[] {
  const from = Math.min(Math.max(start, 0), path.length)
  const to = Math.min(Math.max(end, 0), path.length)
  if (!(to > from)) return []
  const runs: PathRun[] = []
  for (const stretch of path.stretches) {
    const stretchEnd = stretch.startDistance + stretch.length
    if (!(stretchEnd > from && stretch.startDistance < to)) continue
    const first = stretch.startDistance >= from ? stretch.start : pointAtDistance(path, from)
    const last = stretchEnd <= to ? stretch.end : pointAtDistance(path, to)
    const run = runs[runs.length - 1]
    // Added in place: a real path has hundreds of places, and a replay asks every frame.
    if (run?.kind === stretch.kind) run.points.push(last)
    else runs.push({ kind: stretch.kind, points: [first, last] })
  }
  return runs
}

/** The places the path passes between `start` and `end` meters along it, both ends included. Empty when `end` isn't past `start`. */
export function pathPointsBetween(path: FlightPath, start: number, end: number): GeoPoint[] {
  const runs = pathRuns(path, start, end)
  if (runs.length === 0) return []
  const points = [...runs[0].points]
  for (const run of runs.slice(1)) points.push(...run.points.slice(1))
  return points
}

/**
 * Places all along the path for the camera to frame (spec §6.2): 33 along a great circle, as before, and every place a
 * real path passes.
 */
export function pathFramingPoints(path: FlightPath): GeoPoint[] {
  if (!(path.length > 0)) return [path.origin, path.destination]
  const places = [path.origin]
  for (const stretch of path.stretches) {
    const count = Math.max(Math.ceil((stretch.length / path.length) * 32), 1) + 1
    places.push(...pointsAlong(stretch.start, stretch.end, count).slice(1))
  }
  return places
}

/**
 * The angle a plane `distance` meters along the path points at, on a map with north up (`planeHeading`): along the path
 * just ahead of it, or along the last of the path at its end. Null for a path with no length, and where the two places
 * it's aimed between are one.
 */
export function pathHeadingAt(path: FlightPath, distance: number): number | null {
  const look = LOOK_AHEAD * path.length
  if (!(look > 0)) return null
  const from = Math.min(Math.min(Math.max(distance, 0), path.length), path.length - look)
  return flatMapAngle(pointAtDistance(path, from), pointAtDistance(path, from + look))
}
