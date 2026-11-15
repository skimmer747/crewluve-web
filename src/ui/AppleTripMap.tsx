import { useEffect, useRef } from 'preact/hooks'
import { appleMapPlan, type PlannedMark } from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { fitRect, NO_INSETS } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline, MkStyle } from '../map/mapkitApi'
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

const PRIORITY: Record<PlannedMark['priority'], number> = { low: 250, high: 750, required: 1000 }

interface Live {
  map: MkMap
  lines: Map<string, { overlay: MkPolyline; key: string }>
  night: MkPolygon[]
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void }>
  framed: string
  moved: boolean
}

function AppleMapView({ mapkit, map, t, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove }: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<Live | null>(null)
  const userMove = useRef(onUserMove)
  userMove.current = onUserMove
  const types: Record<AppleMapStyle, string> = { hybrid: mapkit.MapType.Hybrid, standard: mapkit.MapType.Standard, satellite: mapkit.MapType.Satellite }
  const color = (name: string, fallback: string) => (box.current ? getComputedStyle(box.current).getPropertyValue(name).trim() : '') || fallback
  const C = (p: GeoPoint) => new mapkit.Coordinate(p.lat, p.lng)

  // The map, made once.
  useEffect(() => {
    const dark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
    const m = new mapkit.Map(box.current!, {
      mapType: types[mapStyle],
      colorScheme: dark ? mapkit.ColorScheme.Dark : mapkit.ColorScheme.Light,
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
    const state: Live = { map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), framed: '', moved: false }
    const moved = () => {
      if (state.moved) return
      state.moved = true
      userMove.current?.()
    }
    m.addEventListener('scroll-start', moved)
    m.addEventListener('zoom-start', moved)
    live.current = state
    return () => {
      m.destroy()
      live.current = null
    }
  }, [mapkit])

  // The style, on the same map.
  useEffect(() => {
    if (live.current) live.current.map.mapType = types[mapStyle]
  }, [mapStyle])

  // The trip at time t: lines, night and marks, in place.
  useEffect(() => {
    const state = live.current
    if (!state) return
    const plan = appleMapPlan(tripMapDrawing(map, t), focus)
    const seen = new Set<string>()
    for (const line of plan.lines) {
      seen.add(line.id)
      const look = LINES[line.style]
      const key = `${line.style}:${line.points.map((p) => `${p.lat},${p.lng}`).join(';')}`
      const style: MkStyle = new mapkit.Style({ strokeColor: color(look.color, '#0a84ff'), lineWidth: look.width, lineDash: look.dash, lineCap: 'round' })
      const kept = state.lines.get(line.id)
      if (!kept) {
        const overlay = new mapkit.PolylineOverlay(line.points.map(C), { style })
        state.map.addOverlay(overlay)
        state.lines.set(line.id, { overlay, key })
      } else if (kept.key !== key) {
        kept.overlay.points = line.points.map(C)
        kept.overlay.style = style
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
        state.night[i].points = shapes.map((shape) => shape.map(C))
      })
      state.nightAt = at
    }
    const marked = new Set<string>()
    for (const mark of plan.marks) {
      marked.add(mark.id)
      let kept = state.marks.get(mark.id)
      if (!kept) {
        const { element, turn } = markElement(mark.kind, mark.label)
        const annotation = new mapkit.Annotation(C(mark.place), () => element, {
          displayPriority: PRIORITY[mark.priority],
          collisionMode: mapkit.Annotation.CollisionMode.Circle,
        })
        state.map.addAnnotation(annotation)
        kept = { annotation, turn }
        state.marks.set(mark.id, kept)
      } else {
        kept.annotation.coordinate = C(mark.place)
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

  // The camera: the leg or the whole trip, kept clear of the side panel, until the person moves the map (§5).
  const rect = fitRect(framingPoints(map, focus)) ?? { x: 0, y: 0, width: 1, height: 1 }
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${insets.top},${insets.right},${insets.bottom},${insets.left}|${recenter}`
  useEffect(() => {
    const state = live.current
    if (!state) return
    // Recenter pressed since the last framing: frame automatically again.
    if (state.framed.split('|')[2] !== String(recenter)) state.moved = false
    if (state.moved || state.framed === frame) return
    state.map.padding = new mapkit.Padding(insets.top, insets.right, insets.bottom, insets.left)
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    state.map.setVisibleMapRectAnimated(new mapkit.MapRect(rect.x, rect.y, rect.width, rect.height), state.framed !== '' && !still)
    state.framed = frame
  }, [frame])

  return <div ref={box} class={`apple-trip-map${interactive ? '' : ' still'}`} />
}
