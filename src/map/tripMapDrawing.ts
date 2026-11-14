import type { GeoPoint } from './greatCircle'
import { activityAt, isGroundKind, type GroundActivity } from './tripActivity'
import { headingAt, isMoving, legProgress, positionAt, type AirportMark, type TripMap } from './tripMap'

/** Everything the trip map draws at one instant (moving map spec §7.1, §7.2), worked out here so the SVG only renders it. */

/** Still to fly (dashed), flown so far on the leg in the air (solid), flown earlier (grey), or a drive (dotted). */
export type SegmentStyle = 'upcoming' | 'flying' | 'flown' | 'drive'

export interface RouteSegment {
  id: string
  from: GeoPoint
  to: GeoPoint
  style: SegmentStyle
  /** Flights follow the great circle; drives are short enough to draw straight. */
  geodesic: boolean
}

export interface TripMapDrawing {
  segments: RouteSegment[]
  airports: AirportMark[]
  cars: { id: string; place: GeoPoint }[]
  /** The schedule's plane: where, and its angle in radians (0 east, clockwise). */
  plane: { place: GeoPoint; angle: number } | null
  /** The pilot's marker: what they're doing and where, while nothing moves (activity markers design §2). */
  pilot: GroundActivity | null
}

export function tripMapDrawing(map: TripMap, t: number): TripMapDrawing {
  const segments: RouteSegment[] = []
  const cars: TripMapDrawing['cars'] = []
  let plane: TripMapDrawing['plane'] = null
  for (const leg of map.legs) {
    const from = leg.origin.place
    const to = leg.destination.place
    if (leg.kind === 'drive') {
      segments.push({ id: `${leg.id}-drive`, from, to, style: 'drive', geodesic: false })
      cars.push({ id: `${leg.id}-car`, place: positionAt(leg, isMoving(leg, t) ? legProgress(leg, t) : 0.5) })
    } else if (t >= leg.end) {
      segments.push({ id: `${leg.id}-flown`, from, to, style: 'flown', geodesic: true })
    } else if (isMoving(leg, t)) {
      const fraction = legProgress(leg, t)
      const here = positionAt(leg, fraction)
      if (fraction > 0) segments.push({ id: `${leg.id}-flying`, from, to: here, style: 'flying', geodesic: true })
      if (fraction < 1) segments.push({ id: `${leg.id}-upcoming`, from: here, to, style: 'upcoming', geodesic: true })
      plane = { place: here, angle: headingAt(leg, t) ?? 0 }
    } else {
      segments.push({ id: `${leg.id}-upcoming`, from, to, style: 'upcoming', geodesic: true })
    }
  }
  const seen = new Set<string>()
  const airports = map.legs.flatMap((l) => [l.origin, l.destination]).filter((a) => !seen.has(a.code) && seen.add(a.code))
  const activity = activityAt(map, t)
  const pilot = activity && isGroundKind(activity.kind) ? { kind: activity.kind, place: activity.place } : null
  return { segments, airports, cars, plane, pilot }
}

/** `t` held back to a whole number of `step` ms, so the night is redrawn only once it has moved enough to see. */
export function nightTime(t: number, step: number): number {
  return step > 0 ? Math.floor(t / step) * step : t
}
