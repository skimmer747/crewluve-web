import { useEffect, useRef, useState } from 'preact/hooks'
import { appleCamera, appleMapPlan, offDateLine, slideIntoView, type PlannedMark } from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline } from '../map/mapkitApi'
import { LAYER_ALPHA, nightLayers, SUN_DEPTHS } from '../map/nightShade'
import { framingPoints } from '../map/tripMap'
import { nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { TripMapSvg, type TripMapSvgProps } from './TripMapSvg'

export interface AppleTripMapProps extends TripMapSvgProps {
  mapStyle: AppleMapStyle
  /** The full map pans and zooms; the card's doesn't. */
  interactive: boolean
  /** Bumped by the full map's Recenter: frame automatically again. */
  recenter?: number
  /** The person panned or zoomed. */
  onUserMove?: () => void
}

/**
 * The trip map on Apple's map (Apple Maps spec §4, §5, §8), or the SVG map while MapKit loads and after any failure
 * (§7). The map is made once; each render moves its lines, night and marks in place.
 */
export function AppleTripMap(props: AppleTripMapProps) {
  const kit = useAppleMapKit()
  if (kit.status !== 'ready') return <TripMapSvg {...props} />
  return <AppleMapView mapkit={kit.mapkit} {...props} />
}

/** Each route style's look, as on the SVG map: colours come from the page's CSS, so dark mode follows. */
const LINES: Record<SegmentStyle, { color: '--trip-route' | '--trip-flown'; width: number; dash: number[] }> = {
  upcoming: { color: '--trip-route', width: 2, dash: [6, 6] },
  flying: { color: '--trip-route', width: 3, dash: [] },
  flown: { color: '--trip-flown', width: 2.5, dash: [] },
  drive: { color: '--trip-flown', width: 3, dash: [1, 6] },
}

const PRIORITY: Record<PlannedMark['priority'], number> = { lowest: 100, low: 250, high: 750, required: 1000 }

interface Live {
  map: MkMap
  lines: Map<string, { overlay: MkPolyline; key: string }>
  night: MkPolygon[]
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; priority: PlannedMark['priority'] }>
  framed: string
  /**
   * The latest framing, whether it was animated, until it has slid once to show the pilot's marker: each time MapKit
   * settles, its view is checked for the marker.
   */
  settling: { animated: boolean } | null
  moved: boolean
  /** The Recenter count the camera last framed for. */
  recenterSeen: number
}

/** What the check after a framing needs, as of the latest render. */
interface Latest {
  pilot: GeoPoint | null
  width: number
  height: number
  insets: Insets
}

/**
 * MapKit won't zoom out past its own limit: on a wide trip in a small view, the card's above all, it settles closer in
 * than it was asked, on the middle of the trip, sometimes only in a second change after reporting the view it was asked
 * for, and the pilot's marker near the trip's edge can fall outside. So each time MapKit settles after a framing, while
 * the view is still the camera's, it slides the shortest way that shows the marker (the app's TripMapSlide), once:
 * should MapKit not settle where it's asked, the camera never chases it.
 */
function slideToPilot(mapkit: MapKitApi, state: Live, now: Latest | undefined) {
  const settling = state.settling
  if (!settling || state.moved || !now?.pilot) return
  const m = state.map
  const { origin, size } = m.visibleMapRect
  const { top, right, bottom, left } = m.padding
  const shown = { rect: { x: origin.x, y: origin.y, width: size.width, height: size.height }, padding: { top, right, bottom, left } }
  const slide = slideIntoView(shown, now.pilot, now.width, now.height, now.insets)
  if (!slide) return
  state.settling = null
  const { rect, padding } = slide
  m.padding = new mapkit.Padding(padding.top, padding.right, padding.bottom, padding.left)
  m.setVisibleMapRectAnimated(new mapkit.MapRect(rect.x, rect.y, rect.width, rect.height), settling.animated)
}

function AppleMapView({ mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove }: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<Live | null>(null)
  const userMove = useRef(onUserMove)
  userMove.current = onUserMove
  const latest = useRef<Latest>()
  // Bumped when the system turns light or dark, to draw the lines again in the new colours.
  const [, repaint] = useState(0)
  const types: Record<AppleMapStyle, string> = { hybrid: mapkit.MapType.Hybrid, standard: mapkit.MapType.Standard, satellite: mapkit.MapType.Satellite }
  const color = (name: string, fallback: string) => (box.current ? getComputedStyle(box.current).getPropertyValue(name).trim() : '') || fallback
  const C = (p: GeoPoint) => new mapkit.Coordinate(p.lat, p.lng)

  // The map, made once. `interactive` is read here only: the card's map is never the full map's.
  useEffect(() => {
    const scheme = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
    const colorScheme = () => (scheme?.matches ? mapkit.ColorScheme.Dark : mapkit.ColorScheme.Light)
    const m = new mapkit.Map(box.current!, {
      mapType: types[mapStyle],
      colorScheme: colorScheme(),
      isScrollEnabled: interactive,
      isZoomEnabled: interactive,
      isRotationEnabled: false,
      showsZoomControl: interactive,
      showsMapTypeControl: false,
      showsCompass: mapkit.FeatureVisibility.Hidden,
      showsPointsOfInterest: false,
    })
    const nightStyle = () => new mapkit.Style({ fillColor: color('--trip-night', '#050d29'), fillOpacity: LAYER_ALPHA, lineWidth: 0, strokeOpacity: 0 })
    const night = SUN_DEPTHS.map(() => {
      const layer = new mapkit.PolygonOverlay([], { style: nightStyle() })
      m.addOverlay(layer)
      return layer
    })
    const state: Live = { map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), framed: '', settling: null, moved: false, recenterSeen: recenter }
    const moved = () => {
      if (state.moved) return
      state.moved = true
      userMove.current?.()
    }
    m.addEventListener('scroll-start', moved)
    m.addEventListener('zoom-start', moved)
    m.addEventListener('region-change-end', () => slideToPilot(mapkit, state, latest.current))
    // The system turned light or dark while the map is open: Apple's tiles follow, the night takes its new colour, and
    // every line is drawn again in its own (the marks are styled by the page's CSS, which follows by itself).
    const onScheme = () => {
      m.colorScheme = colorScheme()
      for (const layer of night) layer.style = nightStyle()
      for (const kept of state.lines.values()) kept.key = ''
      repaint((n) => n + 1)
    }
    scheme?.addEventListener('change', onScheme)
    live.current = state
    return () => {
      scheme?.removeEventListener('change', onScheme)
      m.destroy()
      live.current = null
    }
  }, [mapkit])

  // The style, on the same map.
  useEffect(() => {
    if (live.current) live.current.map.mapType = types[mapStyle]
  }, [mapStyle])

  const drawing = tripMapDrawing(map, t)

  // The trip at time t: lines, night and marks, in place.
  useEffect(() => {
    const state = live.current
    if (!state) return
    const plan = appleMapPlan(drawing, focus)
    // A line's style is made only when the line is new or has changed.
    const lineStyle = (style: SegmentStyle) => {
      const look = LINES[style]
      return new mapkit.Style({ strokeColor: color(look.color, '#0a84ff'), lineWidth: look.width, lineDash: look.dash, lineCap: 'round' })
    }
    const seen = new Set<string>()
    for (const line of plan.lines) {
      seen.add(line.id)
      const key = `${line.style}:${line.points.map((p) => `${p.lat},${p.lng}`).join(';')}`
      const kept = state.lines.get(line.id)
      if (!kept) {
        const overlay = new mapkit.PolylineOverlay(line.points.map(C), { style: lineStyle(line.style) })
        state.map.addOverlay(overlay)
        state.lines.set(line.id, { overlay, key })
      } else if (kept.key !== key) {
        kept.overlay.points = line.points.map(C)
        kept.overlay.style = lineStyle(line.style)
        kept.key = key
      }
    }
    for (const [id, kept] of state.lines) {
      if (!seen.has(id)) {
        state.map.removeOverlay(kept.overlay)
        state.lines.delete(id)
      }
    }
    const at = nightTime(t, nightStep)
    if (at !== state.nightAt) {
      nightLayers(at).forEach((shapes, i) => {
        state.night[i].points = shapes.map((shape) => offDateLine(shape).map(C))
      })
      state.nightAt = at
    }
    const marked = new Set<string>()
    for (const mark of plan.marks) {
      marked.add(mark.id)
      let kept = state.marks.get(mark.id)
      if (!kept) {
        const { element, turn } = markElement(mark.kind, mark.label, mark.activity)
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
        // airport by design, so they take no part: they hide nothing and are never hidden.
        const annotation = new mapkit.Annotation(C(mark.place), () => element, {
          displayPriority: PRIORITY[mark.priority],
          collisionMode: mark.kind === 'airport' ? mapkit.AnnotationCollisionMode.Circle : mapkit.AnnotationCollisionMode.None,
        })
        state.map.addAnnotation(annotation)
        kept = { annotation, turn, priority: mark.priority }
        state.marks.set(mark.id, kept)
      } else {
        kept.annotation.coordinate = C(mark.place)
        // An airport outranks the rest only while its leg is in focus, so its rank moves on with the replay.
        if (kept.priority !== mark.priority) {
          kept.annotation.displayPriority = PRIORITY[mark.priority]
          kept.priority = mark.priority
        }
      }
      kept.turn(mark.degrees)
    }
    for (const [id, kept] of state.marks) {
      if (!marked.has(id)) {
        state.map.removeAnnotation(kept.annotation)
        state.marks.delete(id)
      }
    }
  })

  // The camera: the view the SVG map takes (the leg or the whole trip, clear of the panel or the chips, with the pilot's
  // marker in view), until the person moves the map (§5).
  const pilot = drawing.pilot?.place.place ?? null
  latest.current = { pilot, width, height, insets }
  const { rect, padding } = appleCamera(framingPoints(map, focus), pilot, width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
  useEffect(() => {
    const state = live.current
    if (!state) return
    // Recenter pressed since the last framing: frame automatically again.
    if (state.recenterSeen !== recenter) {
      state.moved = false
      state.recenterSeen = recenter
    }
    if (state.moved || state.framed === frame) return
    state.map.padding = new mapkit.Padding(padding.top, padding.right, padding.bottom, padding.left)
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const animated = state.framed !== '' && !still
    state.framed = frame
    state.settling = { animated }
    state.map.setVisibleMapRectAnimated(new mapkit.MapRect(rect.x, rect.y, rect.width, rect.height), animated)
  }, [frame])

  // The card's map is a picture inside the card's button: it's kept from screen readers and out of the Tab order, so
  // Apple's Legal link isn't a link inside a button. The full map's controls and Legal link stay reachable.
  return <div ref={box} class={`apple-trip-map${interactive ? '' : ' still'}`} {...(interactive ? {} : { 'aria-hidden': 'true', inert: true })} />
}
