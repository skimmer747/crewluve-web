import { pointsAlong, type GeoPoint } from './greatCircle'
import { fitClear, fitRect, MIN_CLEAR_PX, NO_INSETS, slideToShow, type Insets, type WorldRect } from './mapFit'
import { placeAt } from './svgPaths'
import type { GroundKind } from './tripActivity'
import type { MapLeg } from './tripMap'
import { PILOT_RADIUS, type SegmentStyle, type TripMapDrawing } from './tripMapDrawing'

/**
 * What Apple's map shows for a moment of the trip (Apple Maps spec §8): the same drawing as the SVG map, as lines and
 * marks MapKit can take. Pure, so every choice here is tested without MapKit.
 */

export interface PlannedLine {
  id: string
  style: SegmentStyle
  points: GeoPoint[]
}

export type MarkKind = 'airport' | 'car' | 'pilot' | 'plane'

export interface PlannedMark {
  id: string
  kind: MarkKind
  place: GeoPoint
  /** The airport's code, under its dot. */
  label: string | null
  /** What the pilot is doing, on the pilot's marker (activity markers design §2). */
  activity: GroundKind | null
  /** The mark's turn, clockwise from pointing up. */
  degrees: number
  /**
   * Where airports crowd each other, MapKit hides the lower first: one only drives reach, then the rest, then the
   * leg's own. The pilot's marker, the plane and a car are always shown.
   */
  priority: 'lowest' | 'low' | 'high' | 'required'
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
  const shown = { label: null, activity: null, degrees: 0, priority: 'required' } as const
  const marks: PlannedMark[] = [
    // An airport only drives reach, such as a commuter's home, gives way where it crowds another (tidy markers design
    // §2): on Apple's map that's MapKit's own collision rule, so zoomed in on the drive it shows again.
    ...drawing.airports.map((a): PlannedMark => ({
      id: `airport:${a.code}`, kind: 'airport', place: a.place, label: a.code, activity: null, degrees: 0,
      priority: a.driveOnly ? 'lowest' : onLeg(a.code) ? 'high' : 'low',
    })),
    ...drawing.cars.map((c): PlannedMark => ({ ...shown, id: `car:${c.id}`, kind: 'car', place: c.place })),
  ]
  // What the pilot is doing while nothing moves. Its id carries the kind, so a new kind is a new marker.
  if (drawing.pilot) {
    marks.push({ ...shown, id: `pilot:${drawing.pilot.kind}`, kind: 'pilot', place: drawing.pilot.place.place, activity: drawing.pilot.kind })
  }
  // The plane icon points up, so it turns a quarter more than the route's screen angle, as on the SVG map.
  if (drawing.plane) {
    marks.push({ ...shown, id: 'plane', kind: 'plane', place: drawing.plane.place, degrees: (drawing.plane.angle * 180) / Math.PI + 90 })
  }
  return {
    lines: drawing.segments.map((s) => ({ id: s.id, style: s.style, points: laidOut(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to]) })),
    marks,
  }
}

/** What MapKit is asked to show: a rectangle of the flat map, fitted inside the view less its padding. */
export interface AppleCamera {
  rect: WorldRect
  padding: Insets
}

/**
 * The camera on Apple's map (Apple Maps spec §5): the very view the SVG map takes. The trip is framed in the part of the
 * view the insets leave clear (beside the full map's panel, between the card's chips), then the view slides the shortest
 * way that shows the pilot's marker (the app's card framing design §4). MapKit is given the clear part's rectangle, with
 * the insets as its padding, so its logo and controls keep clear too. When the clear part is too small to frame in,
 * MapKit gets the whole view and no padding.
 */
export function appleCamera(framing: GeoPoint[], pilot: GeoPoint | null, width: number, height: number, insets: Insets): AppleCamera {
  const framed = fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, insets)
  const view = pilot ? slideToShow(framed, width, height, placeAt(pilot, { rect: framed, width, height }), PILOT_RADIUS, insets) : framed
  return cameraFor(view, width, height, insets)
}

/** The pilot's marker counts as in view when a slide would move it less than this, in px: never a slide for rounding. */
const SLIDE_TOLERANCE_PX = 1

/**
 * MapKit won't zoom out past its own limit, which a small view such as the card reaches on a wide trip: it then shows the
 * middle of what it was asked for, closer in, and the pilot's marker near the trip's edge can fall outside. Given
 * `shown`, what MapKit settled on (its visible rectangle, which is only the part inside its padding, and that padding),
 * this is what to ask for next: the same view, at the same zoom, slid the shortest way that shows the marker in the
 * clear part (as the app's TripMapSlide), or null when it's in view already.
 */
export function slideIntoView(shown: AppleCamera, pilot: GeoPoint, width: number, height: number, insets: Insets): AppleCamera | null {
  const view = wholeView(shown, width, height)
  const slid = slideToShow(view, width, height, placeAt(pilot, { rect: view, width, height }), PILOT_RADIUS, insets)
  const perPixel = view.width / width
  // A slide is far less than a world, so a whole world between the two is only the date line, not a move.
  const dx = slid.x - view.x - Math.round(slid.x - view.x)
  const dy = slid.y - view.y
  if (Math.abs(dx) < SLIDE_TOLERANCE_PX * perPixel && Math.abs(dy) < SLIDE_TOLERANCE_PX * perPixel) return null
  return cameraFor(slid, width, height, insets)
}

/** The whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
function wholeView({ rect, padding }: AppleCamera, width: number, height: number): WorldRect {
  const perPixel = rect.width / (width - padding.left - padding.right)
  return { x: rect.x - padding.left * perPixel, y: rect.y - padding.top * perPixel, width: width * perPixel, height: height * perPixel }
}

/**
 * What MapKit is asked for to show `view`, the whole of a `width` × `height` view: the part the insets leave clear, with
 * the insets as its padding, or, when that part is too small to frame in, the whole view and no padding.
 */
function cameraFor(view: WorldRect, width: number, height: number, insets: Insets): AppleCamera {
  const clearWidth = width - insets.left - insets.right
  const clearHeight = height - insets.top - insets.bottom
  if (clearWidth < MIN_CLEAR_PX || clearHeight < MIN_CLEAR_PX) return { rect: view, padding: NO_INSETS }
  const perPixel = view.width / width
  return {
    rect: { x: view.x + insets.left * perPixel, y: view.y + insets.top * perPixel, width: clearWidth * perPixel, height: clearHeight * perPixel },
    padding: insets,
  }
}
