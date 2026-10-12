import { useId, useMemo, useRef } from 'preact/hooks'
import { distanceText, flightDurationText, flightMapLabel } from '../copy/flight'
import { mapAirportTimeText } from '../copy/format'
import { ICON_PATHS } from '../icons/iconPaths'
import { isSunUp } from '../time/sun'
import { DEFAULT_MAP_WIDTH, distanceNm, MAP_HEIGHT, mapBounds, planePose, project, routeArrow, routePoints, type GeoPoint, type MapPoint } from './flightMapGeometry'
import { flightSky, solarTransition, type Sky } from './flightSky'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { flightProgress, type FlightEnd, type InFlightFacts } from './inFlightFacts'

export interface FlightMapProps {
  facts: InFlightFacts
  now: number
  h24: boolean
}

/** The plane is 20 px. The site's plane icon points up where the app's points right, so it turns 90° more (§4.6). */
const PLANE_SIZE = 20
const ICON_TURN = 90

const pointsAttr = (points: MapPoint[]) => points.map((p) => `${p.x},${p.y}`).join(' ')

/**
 * The in-flight map (slice 2C §4): FlightRouteMapView. It's one image to screen readers, described in words. Without
 * both airports' places it shows the app's fallback: a plane and the two codes.
 */
export function FlightMap({ facts, now, h24 }: FlightMapProps) {
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box, DEFAULT_MAP_WIDTH)
  const { dep, arr } = facts
  const progress = flightProgress(facts, now)
  const nm = dep.place && arr.place ? distanceNm(dep.place, arr.place) : null
  const label = flightMapLabel({ from: dep.city, to: arr.city, nm, durationMs: facts.blockMs, progress })
  return (
    <div ref={box} class="flight-map" role="img" aria-label={label}>
      {dep.place && arr.place && nm != null ? (
        <MapDrawing facts={facts} depPlace={dep.place} arrPlace={arr.place} nm={nm} width={width} progress={progress} h24={h24} />
      ) : (
        <div class="flight-map-fallback" aria-hidden="true">
          <Icon name="Airplane" size={24} />
          <span>{`${dep.code} → ${arr.code}`}</span>
        </div>
      )}
    </div>
  )
}

interface MapDrawingProps {
  facts: InFlightFacts
  depPlace: GeoPoint
  arrPlace: GeoPoint
  nm: number
  width: number
  progress: number | null
  h24: boolean
}

function MapDrawing({ facts, depPlace, arrPlace, nm, width, progress, h24 }: MapDrawingProps) {
  const id = useId()
  // The route, the box and the sky change only with the flight, its times or the width; the plane moves every second.
  const layout = useMemo(() => {
    const bounds = mapBounds(depPlace, arrPlace)
    const points = routePoints(depPlace, arrPlace).map((p) => project(p, bounds, width))
    const depAt = project(depPlace, bounds, width)
    const arrAt = project(arrPlace, bounds, width)
    const depDay = isSunUp(facts.start, depPlace.lat, depPlace.lon)
    const arrDay = isSunUp(facts.end, arrPlace.lat, arrPlace.lon)
    const sky = flightSky(depDay, arrDay, depAt.x / width, arrAt.x / width, solarTransition(depPlace, arrPlace, facts.start, facts.end))
    return { bounds, line: pointsAttr(points), arrow: routeArrow(points), depAt, arrAt, depDay, arrDay, sky }
  }, [depPlace.lat, depPlace.lon, arrPlace.lat, arrPlace.lon, facts.start, facts.end, width])
  const plane = progress == null ? null : planePose(depPlace, arrPlace, layout.bounds, width, progress)
  const chevron = pointsAttr([layout.arrow.left, layout.arrow.tip, layout.arrow.right])
  return (
    <>
      <svg class="flight-map-art" width={width} height={MAP_HEIGHT} viewBox={`0 0 ${width} ${MAP_HEIGHT}`} aria-hidden="true">
        <defs>
          <SkyGradient id={`${id}-sky`} sky={layout.sky} />
          {/* Across the map's whole width, as the app's stroke gradient; userSpaceOnUse also keeps it on a level route. */}
          <linearGradient id={`${id}-route`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
            <stop offset="0" class="flight-route-edge" />
            <stop offset="0.5" class="flight-route-middle" />
            <stop offset="1" class="flight-route-edge" />
          </linearGradient>
          {/* Over the whole map, so a route that runs straight up the map, with no width of its own, keeps its glow. */}
          <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={MAP_HEIGHT}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <rect class="flight-sky" width={width} height={MAP_HEIGHT} fill={`url(#${id}-sky)`} />
        {/* The route's glow is the line itself, fade and all, at half strength, as the app's shadow takes the line's. */}
        <polyline class="flight-route-glow" points={layout.line} stroke={`url(#${id}-route)`} filter={`url(#${id}-glow)`} />
        <polyline class="flight-route" points={layout.line} stroke={`url(#${id}-route)`} />
        <polyline class="flight-arrow-glow" points={chevron} filter={`url(#${id}-glow)`} />
        <polyline class="flight-arrow" points={chevron} />
      </svg>
      <Airport end={facts.dep} at={layout.depAt} day={layout.depDay} time={facts.start} h24={h24} />
      <Airport end={facts.arr} at={layout.arrAt} day={layout.arrDay} time={facts.end} h24={h24} />
      {/* The app draws the plane over the airports' columns, so it's a second drawing, laid over them. */}
      {plane && (
        <svg class="flight-map-plane" width={width} height={MAP_HEIGHT} viewBox={`0 0 ${width} ${MAP_HEIGHT}`} aria-hidden="true">
          <defs>
            <filter id={`${id}-plane-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            <filter id={`${id}-halo`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g class="flight-plane" transform={`translate(${plane.at.x} ${plane.at.y})`}>
            <circle class="flight-plane-halo" r="15" filter={`url(#${id}-halo)`} />
            <g filter={`url(#${id}-plane-glow)`}>
              <PlaneIcon heading={plane.heading} glow />
            </g>
            <PlaneIcon heading={plane.heading} />
          </g>
        </svg>
      )}
      <p class="flight-distance" style={{ left: `${width / 2}px` }}>
        {facts.blockMs > 0 && (
          <span class="flight-distance-part">
            <Icon name="Timer" size={10} color="var(--blue)" />
            {flightDurationText(facts.blockMs)}
          </span>
        )}
        <span class="flight-distance-part">
          <Icon name="ArrowsHorizontal" size={10} color="var(--blue)" />
          {distanceText(nm)}
        </span>
      </p>
    </>
  )
}

/** The sky's gradient (§4.3): the day or night pair top to bottom, or the ends' first colors split across. */
function SkyGradient({ id, sky }: { id: string; sky: Sky }) {
  if (sky.direction === 'down') {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class={`sky-${sky.time}-1`} />
        <stop offset="1" class={`sky-${sky.time}-2`} />
      </linearGradient>
    )
  }
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" class={`sky-${sky.left}-1`} />
      <stop offset={sky.leftUntil} class={`sky-${sky.left}-1`} />
      <stop offset={sky.rightFrom} class={`sky-${sky.right}-1`} />
      <stop offset="1" class={`sky-${sky.right}-1`} />
    </linearGradient>
  )
}

/** The plane icon, 20 px, centered on the group's origin and turned to the route's heading. */
function PlaneIcon({ heading, glow = false }: { heading: number; glow?: boolean }) {
  return (
    <g class={glow ? 'flight-plane-glow' : 'flight-plane-icon'} transform={`rotate(${heading + ICON_TURN}) scale(${PLANE_SIZE / 256}) translate(-128 -128)`}>
      {ICON_PATHS.Airplane.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  )
}

interface AirportProps {
  end: FlightEnd
  at: MapPoint
  day: boolean
  time: number
  h24: boolean
}

/** An airport's column, centered on its place (§4.5): a sun or a moon with its glow, the code, the city and the time. */
function Airport({ end, at, day, time, h24 }: AirportProps) {
  const icon = day ? 'Sun' : 'Moon'
  return (
    <div class="flight-airport" style={{ left: `${at.x}px`, top: `${at.y}px` }}>
      <span class={day ? 'flight-airport-icon day' : 'flight-airport-icon night'}>
        <Icon name={icon} size={14} />
        <Icon name={icon} size={14} />
      </span>
      <span class="flight-airport-code">{end.code}</span>
      <span class="flight-airport-city">{end.city}</span>
      {end.timeZone && <span class="flight-airport-time">{mapAirportTimeText(time, end.timeZone, h24)}</span>}
    </div>
  )
}
