import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import { pointsAlong, type GeoPoint } from '../map/greatCircle'
import { fitClear, fitRect, NO_INSETS, slideToShow, type Insets } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
import { linePath, placeAt, polygonsPath, type Viewport } from '../map/svgPaths'
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, PILOT_RADIUS, tripMapDrawing } from '../map/tripMapDrawing'

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
   * Room to keep clear for what lies over the map: the full map's panel (Stage 2 spec §10), or the card's chips. The
   * trip is framed in the rest when there's room, and the pilot's marker is always kept there (`slideToShow`).
   */
  insets?: Insets
}

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

/**
 * The trip map (moving map spec §7.1, §11): ocean, land, night, routes, airports, cars, the pilot's marker and the plane,
 * drawn by the site in SVG. The card and the full map describe it in words, so to screen readers it's hidden.
 */
export function TripMapSvg({ map, t, width, height, focus, land, nightStep, insets = NO_INSETS }: TripMapSvgProps) {
  const { top, right, bottom, left } = insets
  const framed = useMemo(
    () => fitClear(fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [map, focus, width, height, top, right, bottom, left],
  )
  const drawing = tripMapDrawing(map, t)
  // The trip is framed in the clear part when there's room. Then, if the pilot's marker still lies outside it (the
  // card's chips at large text sizes), the view slides the shortest way that shows it (the app's card framing §4.2).
  const pilot = drawing.pilot ? placeAt(drawing.pilot.place.place, { rect: framed, width, height }) : null
  const rect = pilot ? slideToShow(framed, width, height, pilot, PILOT_RADIUS, { top, right, bottom, left }) : framed
  const view: Viewport = { rect, width, height }
  // Keyed on the rect's numbers: the map is a new object every second, and so is the rect fitted to it.
  const { x, y, width: rectWidth, height: rectHeight } = rect
  const landPath = useMemo(() => (land ? polygonsPath(land, view) : ''), [land, x, y, rectWidth, rectHeight, width, height])
  const night = nightTime(t, nightStep)
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, x, y, rectWidth, rectHeight, width, height])
  const airportMarks = placeAirports(drawing.airports.map((a) => ({ code: a.code, at: placeAt(a.place, view), driveOnly: a.driveOnly })))
  return (
    <svg class="trip-map-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <rect class="trip-map-ocean" width={width} height={height} />
      {landPath && <path class="trip-map-land" d={landPath} />}
      {nightPaths.map((d, i) => <path key={i} class="trip-map-night" d={d} fill-opacity={LAYER_ALPHA} />)}
      {drawing.segments.map((s) => (
        <path key={s.id} class={`trip-map-route ${s.style}`} d={linePath(s.geodesic ? pointsAlong(s.from, s.to, 101) : [s.from, s.to], view)} />
      ))}
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
    </svg>
  )
}
