import type { GeoPoint } from './greatCircle'
import { fitClear, fitRect, insetsThatFit, slideToShow, type Insets, type WorldRect } from './mapFit'
import { placeAt } from './svgPaths'
import type { GroundKind } from './tripActivity'
import type { MapLeg } from './tripMap'
import { PILOT_RADIUS, routePoints, type SegmentStyle, type TripMapDrawing } from './tripMapDrawing'

/**
 * What Apple's map shows for a moment of the trip (Apple Maps spec §8): the same drawing as the SVG map, as lines and
 * marks MapKit can take. Pure, so every choice here is tested without MapKit.
 */

export interface PlannedLine {
  id: string
  style: SegmentStyle
  points: GeoPoint[]
}

export type MarkKind = 'airport' | 'car' | 'pilot' | 'plane' | 'realPlane' | 'ghost'

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
  /** The real plane while it's an estimate, shown faded (Stage 3 spec §5.4). */
  faded?: boolean
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
  const degrees = (angle: number) => (angle * 180) / Math.PI + 90
  if (drawing.plane) marks.push({ ...shown, id: 'plane', kind: 'plane', place: drawing.plane.place, degrees: degrees(drawing.plane.angle) })
  // The ghost goes just under the real plane, which is on top (Stage 3 spec §5.4): MapKit stacks later marks higher.
  if (drawing.ghost) marks.push({ ...shown, id: 'ghost', kind: 'ghost', place: drawing.ghost.place, degrees: degrees(drawing.ghost.angle) })
  if (drawing.realPlane) {
    const { place, angle, isEstimated } = drawing.realPlane
    marks.push({ ...shown, id: 'realPlane', kind: 'realPlane', place, degrees: degrees(angle), faded: isEstimated })
  }
  // The real path where the plane was seen goes over every other line.
  const lines = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  return { lines: lines.map((s) => ({ id: s.id, style: s.style, points: laidOut(routePoints(s)) })), marks }
}

/** What MapKit is asked to show: a rectangle of the flat map, fitted inside the view less its padding. */
export interface AppleCamera {
  rect: WorldRect
  padding: Insets
}

/**
 * The camera on Apple's map (Apple Maps spec §5): the very view the SVG map takes. The trip is framed in the part of the
 * view the insets leave clear (beside the full map's panel, between the card's chips and under the latest event's
 * banner), then the view slides the shortest way that shows what's kept in view (`keptInView`): the pilot's marker (the
 * app's card framing design §4), or in flight the plane and its ghost. MapKit is given the clear part's rectangle, with
 * the insets as its padding, so its logo and controls keep clear too. When the clear part is too small to frame in,
 * MapKit gets the whole view and no padding, and the slide alone keeps them in the clear part.
 */
export function appleCamera(framing: GeoPoint[], kept: readonly GeoPoint[], width: number, height: number, insets: Insets): AppleCamera {
  const framed = fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, insets)
  const view = slideToShow(framed, width, height, kept.map((p) => placeAt(p, { rect: framed, width, height })), PILOT_RADIUS, insets)
  return cameraFor(view, width, height, insets)
}

/** The pilot's marker counts as in view when a slide would move it less than this, in px: never a slide for rounding. */
const SLIDE_TOLERANCE_PX = 1

/**
 * MapKit won't zoom out past its own limit, which a small view such as the card reaches on a wide trip: it then shows the
 * middle of what it was asked for, closer in, and the pilot's marker near the trip's edge can fall outside. Given
 * `shown`, what MapKit settled on (its visible rectangle, which is only the part inside its padding, and that padding),
 * this is what to ask for next: the same view, at the same zoom, slid the shortest way that shows what's kept in view
 * (the pilot's marker, or the plane and its ghost) in the clear part (as the app's TripMapSlide), or null when it's in
 * view already.
 */
export function slideIntoView(shown: AppleCamera, kept: readonly GeoPoint[], width: number, height: number, insets: Insets): AppleCamera | null {
  const view = wholeView(shown, width, height)
  const slid = slideToShow(view, width, height, kept.map((p) => placeAt(p, { rect: view, width, height })), PILOT_RADIUS, insets)
  const perPixel = view.width / width
  // A slide is far less than a world, so a whole world between the two is only the date line, not a move.
  const dx = slid.x - view.x - Math.round(slid.x - view.x)
  const dy = slid.y - view.y
  if (Math.abs(dx) < SLIDE_TOLERANCE_PX * perPixel && Math.abs(dy) < SLIDE_TOLERANCE_PX * perPixel) return null
  return cameraFor(slid, width, height, insets)
}

/**
 * Between framings, what's kept in view moves: the plane flies on. Given `shown`, the view MapKit has, this slides it again
 * only once the first mark's marker, without its margin, would leave the clear part, and then back so it has its margin,
 * at the same zoom, as `slideIntoView` does; or null while it's still in. So a plane at the band's edge slides the view
 * about once every `SLIDE_MARGIN` px it flies, not every pixel, and MapKit is never asked again for a view it couldn't
 * show (the review's fixes).
 */
export function keepInView(shown: AppleCamera, kept: readonly GeoPoint[], width: number, height: number, insets: Insets): AppleCamera | null {
  if (kept.length === 0) return null
  const view = wholeView(shown, width, height)
  const nudged = slideToShow(view, width, height, [placeAt(kept[0], { rect: view, width, height })], PILOT_RADIUS, insets, 0)
  // Still in while it needs no slide, a whole world across the date line being none.
  if (nudged.x - view.x - Math.round(nudged.x - view.x) === 0 && nudged.y === view.y) return null
  return slideIntoView(shown, kept, width, height, insets)
}

/**
 * Whether MapKit shows the rectangle `asked` asked for, give or take a pixel. Only the rectangles are compared, not the
 * padding: a late report on an earlier ask can come once a newer one has set other padding, as when the banner and the
 * card's chip frame the map again above the chip.
 */
export function isSameView(shown: AppleCamera, asked: AppleCamera, width: number): boolean {
  const [a, b] = [shown.rect, asked.rect]
  const pixel = SLIDE_TOLERANCE_PX * (b.width / (width - asked.padding.left - asked.padding.right))
  const x = a.x - b.x - Math.round(a.x - b.x)
  return Math.abs(x) < pixel && Math.abs(a.y - b.y) < pixel && Math.abs(a.width - b.width) < pixel && Math.abs(a.height - b.height) < pixel
}

/** The whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
function wholeView({ rect, padding }: AppleCamera, width: number, height: number): WorldRect {
  const perPixel = rect.width / (width - padding.left - padding.right)
  return { x: rect.x - padding.left * perPixel, y: rect.y - padding.top * perPixel, width: width * perPixel, height: height * perPixel }
}

/**
 * What MapKit is asked for to show `view`, the whole of a `width` × `height` view: the part the insets that fit leave
 * clear (`insetsThatFit`), with those insets as its padding, so its logo and Legal link keep above the bottom chip; with
 * none that fit, the whole view and no padding.
 */
function cameraFor(view: WorldRect, width: number, height: number, all: Insets): AppleCamera {
  const insets = insetsThatFit(all, width, height)
  const clearWidth = width - insets.left - insets.right
  const clearHeight = height - insets.top - insets.bottom
  const perPixel = view.width / width
  return {
    rect: { x: view.x + insets.left * perPixel, y: view.y + insets.top * perPixel, width: clearWidth * perPixel, height: clearHeight * perPixel },
    padding: insets,
  }
}
