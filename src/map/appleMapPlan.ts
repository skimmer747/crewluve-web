import { pointsAlong, type GeoPoint } from './greatCircle'
import type { MapLeg } from './tripMap'
import type { SegmentStyle, TripMapDrawing } from './tripMapDrawing'

/**
 * What Apple's map shows for a moment of the trip (Apple Maps spec §8): the same drawing as the SVG map, as lines and
 * marks MapKit can take. Pure, so every choice here is tested without MapKit.
 */

export interface PlannedLine {
  id: string
  style: SegmentStyle
  points: GeoPoint[]
}

export type MarkKind = 'airport' | 'car' | 'heart' | 'plane'

export interface PlannedMark {
  id: string
  kind: MarkKind
  place: GeoPoint
  /** The airport's code, under its dot. */
  label: string | null
  /** The mark's turn, clockwise from pointing up. */
  degrees: number
  /** Where marks collide, MapKit hides the lower first. */
  priority: 'low' | 'high' | 'required'
}

export interface AppleMapPlan {
  lines: PlannedLine[]
  marks: PlannedMark[]
}

/**
 * Longitudes laid out in one piece, each within 180° of the one before (§11): MapKit then draws a route across the date
 * line the short way. Raw longitudes jump from 180 to −180 and draw a stray line across the whole world.
 */
export function laidOut(points: GeoPoint[]): GeoPoint[] {
  const laid: GeoPoint[] = []
  for (const p of points) {
    const before = laid[laid.length - 1]
    laid.push(before ? { lat: p.lat, lng: p.lng + 360 * Math.round((before.lng - p.lng) / 360) } : p)
  }
  return laid
}

/** How close to the date line a night shape's points may come, in degrees: about 100 m. */
const DATE_LINE_EDGE = 179.999

/**
 * A night shape for MapKit, with its points kept a hair off the date line. MapKit takes 180° and −180° for the same
 * edge. A night layer as wide as the world runs from one to the other, and whenever the night is deep at the date line
 * (morning in the Americas) MapKit filled it inside-out: daylight shaded, night clear, with the layers' edges sweeping
 * up and down the map through the day. Measured on 2026-11-14: noon in Louisville drew as 28 to 36% night across North
 * America, and as none with the points at ±179.999°.
 */
export const offDateLine = (shape: GeoPoint[]): GeoPoint[] =>
  shape.map((p) => (Math.abs(p.lng) > DATE_LINE_EDGE ? { lat: p.lat, lng: Math.sign(p.lng) * DATE_LINE_EDGE } : p))

export function appleMapPlan(drawing: TripMapDrawing, focus: MapLeg | null): AppleMapPlan {
  const onLeg = (code: string) => focus != null && (focus.origin.code === code || focus.destination.code === code)
  const marks: PlannedMark[] = [
    ...drawing.airports.map((a): PlannedMark => ({
      id: `airport:${a.code}`, kind: 'airport', place: a.place, label: a.code, degrees: 0, priority: onLeg(a.code) ? 'high' : 'low',
    })),
    ...drawing.cars.map((c): PlannedMark => ({ id: `car:${c.id}`, kind: 'car', place: c.place, label: null, degrees: 0, priority: 'required' })),
  ]
  if (drawing.pin) marks.push({ id: 'heart', kind: 'heart', place: drawing.pin.place, label: null, degrees: 0, priority: 'required' })
  // The plane icon points up, so it turns a quarter more than the route's screen angle, as on the SVG map.
  if (drawing.plane) {
    marks.push({ id: 'plane', kind: 'plane', place: drawing.plane.place, label: null, degrees: (drawing.plane.angle * 180) / Math.PI + 90, priority: 'required' })
  }
  return {
    lines: drawing.segments.map((s) => ({ id: s.id, style: s.style, points: laidOut(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to]) })),
    marks,
  }
}
