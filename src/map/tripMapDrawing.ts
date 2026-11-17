import { flightDrawing, type PlaneMark, type RealPlaneMark, type RouteSegment } from './flightDrawing'
import { distanceMeters, EARTH_RADIUS_M, pointsAlong, type GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { isMoving, legProgress, positionAt, type AirportMark, type MapLeg, type TripMap } from './tripMap'

export type { PlaneMark, RealPlaneMark, RouteSegment, SegmentStyle } from './flightDrawing'

/** Everything the trip map draws at one instant (moving map spec §7.1, §7.2), worked out here so the SVG only renders it. */

/** The pilot's marker's radius, in px, on the SVG map and on Apple's. */
export const PILOT_RADIUS = 12

/** An airport on the map, and whether only drives reach it. */
export interface DrawnAirport extends AirportMark {
  /**
   * No flight of the trip leaves from or lands at it, as with a commuter's home: it gives way where it crowds another
   * airport (tidy markers design §2).
   */
  driveOnly: boolean
}

export interface TripMapDrawing {
  segments: RouteSegment[]
  airports: DrawnAirport[]
  /** The car, only while the pilot drives, where they are along the drive (tidy markers design §1). */
  cars: { id: string; place: GeoPoint }[]
  /** The schedule's plane: where, and its angle in radians (0 east, clockwise). */
  plane: PlaneMark | null
  /** The real plane, of a flight Crewlu Cloud has seen (Stage 3 spec §5.4). */
  realPlane: RealPlaneMark | null
  /** Where an on-schedule plane would be, beside the real one. */
  ghost: PlaneMark | null
  /** The flight the real plane and its ghost are of, while there's a real plane: what their popups speak of. */
  liveLeg: MapLeg | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
  pilot: GroundActivity | null
}

/**
 * What the camera keeps in the clear part of the map, the first above all: the pilot's marker while nothing moves (the
 * app's card framing design §4.2), and in flight the real plane, then its ghost, or the schedule's plane. On the card the
 * latest event's banner, the key under it and the bottom chip can leave a band too thin to frame the trip in (latest
 * event design §2): the view then slides to show these in it.
 */
export function keptInView(drawing: TripMapDrawing): GeoPoint[] {
  if (drawing.pilot) return [drawing.pilot.place.place]
  if (drawing.realPlane) return [drawing.realPlane.place, ...(drawing.ghost ? [drawing.ghost.place] : [])]
  return drawing.plane ? [drawing.plane.place] : []
}

/** Whether the map shows the key to its two planes: while it draws a real plane and its ghost (which plane design §2). */
export const showsPlaneKey = (drawing: TripMapDrawing) => drawing.realPlane != null && drawing.ghost != null

/**
 * The trip at `t`: now, or a moment of the replay when `isReplay`, when a flight with a record shows its real plane alone
 * (Stage 3 spec §7.3).
 */
export function tripMapDrawing(map: TripMap, t: number, isReplay = false): TripMapDrawing {
  const segments: RouteSegment[] = []
  const cars: TripMapDrawing['cars'] = []
  let plane: PlaneMark | null = null
  let realPlane: RealPlaneMark | null = null
  let ghost: PlaneMark | null = null
  let liveLeg: MapLeg | null = null
  for (const leg of map.legs) {
    if (leg.kind === 'drive') {
      segments.push({ id: `${leg.id}-drive`, points: [leg.origin.place, leg.destination.place], style: 'drive', geodesic: false })
      if (isMoving(leg, t)) cars.push({ id: `${leg.id}-car`, place: positionAt(leg, legProgress(leg, t)) })
    } else {
      const flight = flightDrawing(leg, t, isReplay)
      segments.push(...flight.segments)
      plane = flight.plane ?? plane
      if (flight.realPlane) {
        realPlane = flight.realPlane
        ghost = flight.ghost
        liveLeg = leg
      }
    }
  }
  const seen = new Set<string>()
  const flown = new Set(map.legs.filter((l) => l.kind === 'flight').flatMap((l) => [l.origin.code, l.destination.code]))
  const airports = map.legs.flatMap((l) => [l.origin, l.destination]).filter((a) => !seen.has(a.code) && seen.add(a.code))
    .map((a) => ({ ...a, driveOnly: !flown.has(a.code) }))
  const activity = activityAt(map, t)
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, realPlane, ghost, liveLeg, pilot }
}

/** About a degree of arc, in meters: the longest step of a real path's line (Stage 3 spec §13). */
const STEP_M = (EARTH_RADIUS_M * Math.PI) / 180

/**
 * A route's line as places to join straight. A drive's are its own. A flight's follow great circles: a line of two
 * places in 101 steps, as before, and a longer one, a real path, with each of its joins in steps of a degree at most.
 */
export function routePoints(segment: RouteSegment): GeoPoint[] {
  const { points } = segment
  if (!segment.geodesic) return points
  if (points.length === 2) return pointsAlong(points[0], points[1], 101)
  const line = points.slice(0, 1)
  for (let i = 1; i < points.length; i++) {
    line.push(...pointsAlong(points[i - 1], points[i], Math.ceil(distanceMeters(points[i - 1], points[i]) / STEP_M) + 1).slice(1))
  }
  return line
}

/** `t` held back to a whole number of `step` ms, so the night is redrawn only once it has moved enough to see. */
export function nightTime(t: number, step: number): number {
  return step > 0 ? Math.floor(t / step) * step : t
}
