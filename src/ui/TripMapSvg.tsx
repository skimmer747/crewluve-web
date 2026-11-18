import { useEffect, useMemo, useState } from 'preact/hooks'
import type { PlaneKind, PopupWords } from '../copy/planePopup'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import type { GeoPoint } from '../map/greatCircle'
import { fitClear, fitRect, NO_INSETS, slideToShow, type Insets } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
import { linePath, placeAt, polygonsPath, type Viewport } from '../map/svgPaths'
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, framingSubject, type MapLeg, type TripMap } from '../map/tripMap'
import { followingFrame } from '../map/tripMapFollow'
import { keptInView, nightTime, PILOT_RADIUS, routePoints, tripMapDrawing, type PlaneMark } from '../map/tripMapDrawing'
import { useGlide } from './hooks/useGlide'
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { PlanePopup, popupPlacement } from './PlanePopup'

export interface TripMapSvgProps {
  map: TripMap
  /** The trip time to draw. */
  t: number
  width: number
  height: number
  /** The leg the view frames, or null for the whole trip and home. */
  focus: MapLeg | null
  land: GeoPoint[][] | null
  /** How often the night is redrawn, in ms of trip time (`nightTime`). */
  nightStep: number
  /**
   * Room to keep clear for what lies over the map: the full map's panel (Stage 2 spec §10), or the card's chips and the
   * latest event's banner. The trip is framed in the rest when there's room, and the pilot's marker, or in flight the
   * plane and its ghost, are always kept there (`keptInView`, `slideToShow`).
   */
  insets?: Insets
  /** `t` is a moment of the replay, not now: a flight with a record shows its real plane alone (Stage 3 spec §7.3). */
  isReplay?: boolean
  /**
   * What a plane's popup says, on the full map (which plane design §3): the real plane and its ghost then open one when
   * pointed at or tapped. The card's map has none, and its planes take no pointer.
   */
  planeWords?: (leg: MapLeg, plane: PlaneKind) => PopupWords
  /**
   * The map follows the plane (follow the plane design §3): while a flight between its gates has a plane that has left,
   * the view frames the plane, a tail behind it and the way ahead, and glides there (§4). Else it frames as before.
   */
  followsPlane?: boolean
}

/** What a plane does with the pointer and taps on the full map (which plane design §3), with `setOpen` for its popup. */
export const pointingAt = (kind: PlaneKind, setOpen: (open: (was: PlaneKind | null) => PlaneKind | null) => void) => ({
  onPointerEnter: () => setOpen(() => kind),
  // A finger lifted leaves the plane too: a tapped popup stays until the next tap.
  onPointerLeave: (e: PointerEvent) => {
    if (e.pointerType !== 'touch') setOpen((was) => (was === kind ? null : was))
  },
  onClick: () => setOpen(() => kind),
})

/** Whether a press on the map, at `target`, is on one of the two planes: a press anywhere else closes the popup. */
export const isOnPlane = (target: EventTarget | null) =>
  target instanceof Element && target.closest('.trip-map-ghost, .trip-map-real-plane, .apple-mark.ghost, .apple-mark.realPlane') != null

/** A Phosphor icon (256 units, pointing up) centred on `at`, `size` px wide, turned `degrees` clockwise. */
function Mark({ name, at, size, degrees = 0, class: cls }: { name: IconName; at: { x: number; y: number }; size: number; degrees?: number; class: string }) {
  return (
    <g class={cls} transform={`translate(${at.x} ${at.y}) rotate(${degrees}) scale(${size / 256}) translate(-128 -128)`}>
      {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </g>
  )
}

/** How close, in px, two airports' labels may sit before the later one is left out and only its dot is drawn. */
const LABEL_CLEARANCE = { x: 28, y: 14 }

/** How close, in px, an airport only drives reach may sit to one drawn, dot and code, before it gives way. */
const AIRPORT_CLEARANCE = { x: 28, y: 24 }

type Point = { x: number; y: number }

const isNear = (a: Point, b: Point, clearance: Point) => Math.abs(a.x - b.x) < clearance.x && Math.abs(a.y - b.y) < clearance.y

/**
 * The airports drawn, each with whether its code fits (tidy markers design §2):
 * - every airport a flight uses, with its code left out, and its dot kept, where it would print over an earlier one's;
 * - then each airport only drives reach, such as a commuter's home, where it crowds none already drawn. Zoomed in on
 *   the drive, it has room again.
 */
function placeAirports(airports: { code: string; at: Point; driveOnly: boolean }[]) {
  const shown: Point[] = []
  const labels: Point[] = []
  const placed: { code: string; at: Point; labelled: boolean }[] = []
  for (const a of [...airports.filter((x) => !x.driveOnly), ...airports.filter((x) => x.driveOnly)]) {
    if (a.driveOnly && shown.some((s) => isNear(s, a.at, AIRPORT_CLEARANCE))) continue
    const labelled = !labels.some((l) => isNear(l, a.at, LABEL_CLEARANCE))
    if (labelled) labels.push(a.at)
    shown.push(a.at)
    placed.push({ code: a.code, at: a.at, labelled })
  }
  return placed
}

/** Each ground marker's icon (activity markers design §2.1): Phosphor's match for the app's SF Symbol. */
export const PILOT_ICONS: Record<GroundKind, IconName> = { layover: 'Bed', turn: 'Hourglass', base: 'Briefcase', home: 'House' }

/** The pilot's marker: a white icon on the color of what they're doing, in a white ring, the size of the old heart. */
function PilotMarker({ kind, at }: { kind: GroundKind; at: { x: number; y: number } }) {
  return (
    <g class={`trip-map-pilot activity-${kind}`}>
      <circle cx={at.x} cy={at.y} r={PILOT_RADIUS} />
      <Mark name={PILOT_ICONS[kind]} at={at} size={13} class="trip-map-pilot-icon" />
    </g>
  )
}

/** The real plane and its ghost (Stage 3 spec §5.4): a plane in a circle, the pilot's marker's size. */
function PlaneBadge({ plane, at, class: cls, ...pointing }: { plane: PlaneMark; at: { x: number; y: number }; class: string } & Partial<ReturnType<typeof pointingAt>>) {
  return (
    <g class={cls} {...pointing}>
      <circle cx={at.x} cy={at.y} r={PILOT_RADIUS} />
      {/* The site's plane icon points up, so it turns a quarter more than the screen angle. */}
      <Mark name="Airplane" at={at} size={14} degrees={(plane.angle * 180) / Math.PI + 90} class="trip-map-badge-icon" />
    </g>
  )
}

/**
 * The trip map (moving map spec §7.1, §11): ocean, land, night, routes, airports, cars, the pilot's marker and the plane,
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({
  map, t, width, height, focus, land, nightStep, insets = NO_INSETS, isReplay = false, planeWords, followsPlane = false,
}: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  const whole = useMemo(
    () => fitClear(fitRect(framing) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [framing, width, height, top, right, bottom, left],
  )
  // Following the plane, the view glides to the frame the setting gives it, the plane, its tail and the way ahead in the
  // air, and between legs too (follow the plane design §3 to §5); else it's the leg's or the trip's, as before.
  const follow = followsPlane ? followingFrame(map, t, isReplay) : null
  const framed = useGlide(follow ? fitClear(follow, width, height, { top, right, bottom, left }) : whole, follow != null)
  const drawing = tripMapDrawing(map, t, isReplay)
  // The real path where the plane was seen goes over every other line.
  const segments = [...drawing.segments.filter((s) => s.style !== 'seen'), ...drawing.segments.filter((s) => s.style === 'seen')]
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker, or in flight the plane, still
  // lies outside it (the card's chips at large text sizes, or the banner with the key under it), the view slides the
  // shortest way that shows it, and the ghost too where both fit (the app's card framing §4.2; latest event design §2).
  const kept = keptInView(drawing).map((place) => placeAt(place, { rect: framed, width, height }))
  const rect = slideToShow(framed, width, height, kept, PILOT_RADIUS, { top, right, bottom, left })
  const view: Viewport = { rect, width, height }
  // Keyed on the rect's numbers: the map is a new object every second, and so is the rect fitted to it.
  const { x, y, width: rectWidth, height: rectHeight } = rect
  const landPath = useMemo(() => (land ? polygonsPath(land, view) : ''), [land, x, y, rectWidth, rectHeight, width, height])
  const night = nightTime(t, nightStep)
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, x, y, rectWidth, rectHeight, width, height])
  const airportMarks = placeAirports(drawing.airports.map((a) => ({ code: a.code, at: placeAt(a.place, view), driveOnly: a.driveOnly })))
  // The plane whose popup is open (which plane design §3). It closes when its plane goes, and as a replay starts or stops.
  const [open, setOpen] = useState<PlaneKind | null>(null)
  useEffect(() => setOpen(null), [isReplay])
  const opened = planeWords && open && drawing.liveLeg ? drawing[open] : null
  useEffect(() => {
    if (open && !opened) setOpen(null)
  })
  const pointing = (kind: PlaneKind) => (planeWords ? pointingAt(kind, setOpen) : {})
  const popupAt = opened ? placeAt(opened.place, view) : null
  const svg = (
    <svg class={`trip-map-svg${planeWords ? ' points' : ''}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true"
      onPointerDown={planeWords ? (e) => { if (!isOnPlane(e.target)) setOpen(null) } : undefined}>
      <rect class="trip-map-ocean" width={width} height={height} />
      {landPath && <path class="trip-map-land" d={landPath} />}
      {nightPaths.map((d, i) => <path key={i} class="trip-map-night" d={d} fill-opacity={LAYER_ALPHA} />)}
      {segments.map((s) => <path key={s.id} class={`trip-map-route ${s.style}`} d={linePath(routePoints(s), view)} />)}
      {airportMarks.map(({ code, at, labelled }) => (
        <g key={code} class="trip-map-airport">
          <circle cx={at.x} cy={at.y} r={3.5} />
          {labelled && <text x={at.x} y={at.y + 16}>{code}</text>}
        </g>
      ))}
      {drawing.cars.map((c) => <Mark key={c.id} name="Car" at={placeAt(c.place, view)} size={16} class="trip-map-car" />)}
      {drawing.pilot && <PilotMarker kind={drawing.pilot.kind} at={placeAt(drawing.pilot.place.place, view)} />}
      {drawing.plane && (
        // The site's plane icon points up, so it turns a quarter more than the screen angle.
        <Mark name="Airplane" at={placeAt(drawing.plane.place, view)} size={22} degrees={(drawing.plane.angle * 180) / Math.PI + 90} class="trip-map-plane" />
      )}
      {/* The ghost just under the real plane, which is drawn on top. */}
      {drawing.ghost && <PlaneBadge plane={drawing.ghost} at={placeAt(drawing.ghost.place, view)} class="trip-map-ghost" {...pointing('ghost')} />}
      {drawing.realPlane && (
        <PlaneBadge plane={drawing.realPlane} at={placeAt(drawing.realPlane.place, view)}
          class={`trip-map-real-plane${drawing.realPlane.isEstimated ? ' estimated' : ''}`} {...pointing('realPlane')} />
      )}
    </svg>
  )
  if (!popupAt) return svg
  return (
    <>
      {svg}
      <PlanePopup words={planeWords!(drawing.liveLeg!, open!)} at={popupAt} placement={popupPlacement(popupAt, width)} />
    </>
  )
}
