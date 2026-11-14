import { useMemo } from 'preact/hooks'
import { ICON_PATHS, type IconName } from '../icons/iconPaths'
import { pointsAlong, type GeoPoint } from '../map/greatCircle'
import { fitClear, fitRect, NO_INSETS, type Insets } from '../map/mapFit'
import { LAYER_ALPHA, nightLayers } from '../map/nightShade'
import { linePath, placeAt, polygonsPath, type Viewport } from '../map/svgPaths'
import type { GroundKind } from '../map/tripActivity'
import { framingPoints, type MapLeg, type TripMap } from '../map/tripMap'
import { nightTime, tripMapDrawing } from '../map/tripMapDrawing'

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
  /** Room to keep clear for a panel over the map (Stage 2 spec §10). */
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

/** Each airport with whether its label fits: one that would print over an earlier label (SDF and LEX, zoomed out) is left out. */
function withLabels(airports: { code: string; at: { x: number; y: number } }[]) {
  const drawn: { x: number; y: number }[] = []
  return airports.map((a) => {
    const labelled = !drawn.some((d) => Math.abs(d.x - a.at.x) < LABEL_CLEARANCE.x && Math.abs(d.y - a.at.y) < LABEL_CLEARANCE.y)
    if (labelled) drawn.push(a.at)
    return { ...a, labelled }
  })
}

/** Each ground marker's icon (activity markers design §2.1): Phosphor's match for the app's SF Symbol. */
export const PILOT_ICONS: Record<GroundKind, IconName> = { layover: 'Bed', turn: 'Hourglass', base: 'Briefcase', home: 'House' }

/** The pilot's marker: a white icon on the color of what they're doing, in a white ring, the size of the old heart. */
function PilotMarker({ kind, at }: { kind: GroundKind; at: { x: number; y: number } }) {
  return (
    <g class={`trip-map-pilot activity-${kind}`}>
      <circle cx={at.x} cy={at.y} r={12} />
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
  const rect = useMemo(
    () => fitClear(fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }, width, height, { top, right, bottom, left }),
    [map, focus, width, height, top, right, bottom, left],
  )
  const view: Viewport = { rect, width, height }
  // Keyed on the rect's numbers: the map is a new object every second, and so is the rect fitted to it.
  const { x, y, width: rectWidth, height: rectHeight } = rect
  const landPath = useMemo(() => (land ? polygonsPath(land, view) : ''), [land, x, y, rectWidth, rectHeight, width, height])
  const night = nightTime(t, nightStep)
  const nightPaths = useMemo(() => nightLayers(night).map((shapes) => polygonsPath(shapes, view)), [night, x, y, rectWidth, rectHeight, width, height])
  const drawing = tripMapDrawing(map, t)
  const airportMarks = withLabels(drawing.airports.map((a) => ({ code: a.code, at: placeAt(a.place, view) })))
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
