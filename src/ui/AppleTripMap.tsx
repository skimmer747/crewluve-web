import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { PlaneKind } from '../copy/planePopup'
import { appleCamera, appleMapPlan, isSameView, keepInView, offDateLine, slideIntoView, type AppleCamera, type PlannedMark } from '../map/appleMapPlan'
import type { AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import type { MapKitApi, MkAnnotation, MkMap, MkPolygon, MkPolyline } from '../map/mapkitApi'
import { LAYER_ALPHA, nightLayers, SUN_DEPTHS } from '../map/nightShade'
import { framingPoints, framingSubject } from '../map/tripMap'
import { keptInView, nightTime, tripMapDrawing, type SegmentStyle } from '../map/tripMapDrawing'
import { markElement } from './appleMarks'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { useSteadyFraming } from './hooks/useSteadyFraming'
import { PlanePopup, popupPlacement } from './PlanePopup'
import { isOnPlane, pointingAt, TripMapSvg, type TripMapSvgProps } from './TripMapSvg'

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
const LINES: Record<SegmentStyle, { color: '--trip-route' | '--trip-flown' | '--trip-seen'; width: number; dash: number[] }> = {
  upcoming: { color: '--trip-route', width: 2, dash: [6, 6] },
  flying: { color: '--trip-route', width: 3, dash: [] },
  flown: { color: '--trip-flown', width: 2.5, dash: [] },
  drive: { color: '--trip-flown', width: 3, dash: [1, 6] },
  seen: { color: '--trip-seen', width: 3, dash: [] },
  unseen: { color: '--trip-seen', width: 2.5, dash: [1, 6] },
}

const PRIORITY: Record<PlannedMark['priority'], number> = { lowest: 100, low: 250, high: 750, required: 1000 }

/**
 * MapKit stacks each line and mark over the ones added before it, and keeps one where it is when it's moved. So when
 * one is made, every one the plan puts after it is added again, in the plan's order: the real plane stays over its
 * ghost when the ghost comes back after a replay, and the seen path over a line made later (Stage 3 spec §5.4, §6.2).
 */
function restack(order: string[], made: Set<string>, addAgain: (id: string) => void) {
  const after = order.slice(order.findIndex((id) => made.has(id)) + 1)
  // Nothing made, or nothing kept after what was: all is in order already, as on the first draw.
  if (made.size === 0 || after.every((id) => made.has(id))) return
  for (const id of after) addAgain(id)
}

interface Live {
  map: MkMap
  lines: Map<string, { overlay: MkPolyline; key: string }>
  night: MkPolygon[]
  nightAt: number
  marks: Map<string, { annotation: MkAnnotation; turn: (degrees: number) => void; fade: (faded: boolean) => void; priority: PlannedMark['priority'] }>
  /** The open plane's popup, a mark of its own over the rest (which plane design §3). */
  popup: { annotation: MkAnnotation; element: HTMLElement } | null
  framed: string
  /**
   * The latest framing, whether it was animated, until it has slid once to show what's kept in view (the pilot's
   * marker, or the plane and its ghost): each time MapKit settles, its view is checked for them.
   */
  settling: { animated: boolean } | null
  /**
   * The views last asked of MapKit, the newest last, and whether each was a framing or a slide: MapKit's report that it
   * has settled can come late, after a newer one is asked, and is judged against the ask it belongs to.
   */
  asks: { camera: AppleCamera; isFraming: boolean }[]
  /**
   * The view the camera keeps what's in view in between framings, as the plane flies on (`keepInView`): the one asked
   * for, or the one MapKit settled on closer in where it couldn't show a framing. None while MapKit hasn't taken the
   * slide last asked for: the camera never chases it.
   */
  view: AppleCamera | null
  /** The camera framed in this commit: what's kept in view isn't kept up with until the next. */
  justFramed: boolean
  moved: boolean
  /** The Recenter count the camera last framed for. */
  recenterSeen: number
}

/** How many of the latest asks a late report from MapKit is matched against. */
const ASKS_KEPT = 8

/** Asks MapKit for `camera`, a framing or a slide, and keeps between framings what's kept in view in it. */
function ask(mapkit: MapKitApi, state: Live, camera: AppleCamera, animated: boolean, isFraming: boolean) {
  const { rect, padding } = camera
  state.map.padding = new mapkit.Padding(padding.top, padding.right, padding.bottom, padding.left)
  state.map.setVisibleMapRectAnimated(new mapkit.MapRect(rect.x, rect.y, rect.width, rect.height), animated)
  state.asks = [...state.asks.slice(1 - ASKS_KEPT), { camera, isFraming }]
  state.view = camera
}

/** What the check after a framing needs, as of the latest render. */
interface Latest {
  /** The pilot's marker, or in flight the plane and its ghost (`keptInView`). */
  kept: GeoPoint[]
  width: number
  height: number
  insets: Insets
}

/**
 * MapKit won't zoom out past its own limit: on a wide trip in a small view, the card's above all, it settles closer in
 * than it was asked, on the middle of the trip, sometimes only in a second change after reporting the view it was asked
 * for, and the pilot's marker near the trip's edge can fall outside, as can the plane in flight. So each time MapKit
 * settles after a framing, while the view is still the camera's, it slides the shortest way that shows them (the app's
 * TripMapSlide), once: should MapKit not settle where it's asked, the camera never chases it.
 */
function slideToKept(mapkit: MapKitApi, state: Live, now: Latest | undefined) {
  if (state.moved || !now) return
  const m = state.map
  const { origin, size } = m.visibleMapRect
  const { top, right, bottom, left } = m.padding
  const shown = { rect: { x: origin.x, y: origin.y, width: size.width, height: size.height }, padding: { top, right, bottom, left } }
  // Which ask MapKit has settled for: the newest it shows, taken. A late report on an earlier one changes nothing. A view
  // of its own answers the newest: one it couldn't show as a framing is kept in from now on, and a slide it didn't
  // take leaves nothing to keep in, until it reports taking one.
  const newest = state.asks.at(-1)
  if (!newest) return
  const taken = state.asks.map((a) => isSameView(shown, a.camera, now.width, now.height)).lastIndexOf(true)
  if (taken === state.asks.length - 1) state.view = newest.camera
  else if (taken >= 0) return
  else state.view = newest.isFraming ? shown : null
  const settling = state.settling
  if (!settling || now.kept.length === 0) return
  const slide = slideIntoView(shown, now.kept, now.width, now.height, now.insets)
  if (!slide) return
  state.settling = null
  ask(mapkit, state, slide, settling.animated, false)
}

function AppleMapView({
  mapkit, map, t, width, height, focus, nightStep, insets = NO_INSETS, mapStyle, interactive, recenter = 0, onUserMove, isReplay = false, planeWords,
}: AppleTripMapProps & { mapkit: MapKitApi }) {
  const box = useRef<HTMLDivElement>(null)
  const live = useRef<Live | null>(null)
  const userMove = useRef(onUserMove)
  userMove.current = onUserMove
  const latest = useRef<Latest>()
  // Bumped when the system turns light or dark, to draw the lines again in the new colours.
  const [, repaint] = useState(0)
  // The plane whose popup is open (which plane design §3). It closes when its plane goes, and as a replay starts or stops.
  const [open, setOpen] = useState<PlaneKind | null>(null)
  useEffect(() => setOpen(null), [isReplay])
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
    const state: Live = {
      map: m, lines: new Map(), night, nightAt: NaN, marks: new Map(), popup: null, framed: '', settling: null, asks: [], view: null,
      justFramed: false, moved: false, recenterSeen: recenter,
    }
    const moved = () => {
      if (state.moved) return
      state.moved = true
      userMove.current?.()
    }
    m.addEventListener('scroll-start', moved)
    m.addEventListener('zoom-start', moved)
    m.addEventListener('region-change-end', () => slideToKept(mapkit, state, latest.current))
    // The system turned light or dark while the map is open: Apple's tiles follow, the night takes its new colour, and
    // every line is drawn again in its own (the marks are styled by the page's CSS, which follows by itself).
    const onScheme = () => {
      m.colorScheme = colorScheme()
      for (const layer of night) layer.style = nightStyle()
      for (const kept of state.lines.values()) kept.key = ''
      repaint((n) => n + 1)
    }
    scheme?.addEventListener('change', onScheme)
    // A press anywhere but on a plane closes its popup. It's heard on its way in, before MapKit's own handling of the
    // map's gestures can stop it.
    const frame = box.current!
    const onPress = (e: PointerEvent) => {
      if (!isOnPlane(e.target)) setOpen(null)
    }
    frame.addEventListener('pointerdown', onPress, { capture: true })
    live.current = state
    return () => {
      scheme?.removeEventListener('change', onScheme)
      frame.removeEventListener('pointerdown', onPress, { capture: true })
      if (state.popup) render(null, state.popup.element)
      m.destroy()
      live.current = null
    }
  }, [mapkit])

  // The style, on the same map.
  useEffect(() => {
    const state = live.current
    if (!state) return
    state.map.mapType = types[mapStyle]
    // The real path's colour follows the style (tripMap.css): restyle the lines.
    for (const kept of state.lines.values()) kept.key = ''
    repaint((n) => n + 1)
  }, [mapStyle])

  const drawing = tripMapDrawing(map, t, isReplay)

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
    const madeLines = new Set<string>()
    for (const line of plan.lines) {
      seen.add(line.id)
      const key = `${line.style}:${line.points.map((p) => `${p.lat},${p.lng}`).join(';')}`
      const kept = state.lines.get(line.id)
      if (!kept) {
        const overlay = new mapkit.PolylineOverlay(line.points.map(C), { style: lineStyle(line.style) })
        state.map.addOverlay(overlay)
        state.lines.set(line.id, { overlay, key })
        madeLines.add(line.id)
      } else if (kept.key !== key) {
        kept.overlay.points = line.points.map(C)
        kept.overlay.style = lineStyle(line.style)
        kept.key = key
      }
    }
    restack(plan.lines.map((l) => l.id), madeLines, (id) => {
      const { overlay } = state.lines.get(id)!
      state.map.removeOverlay(overlay)
      state.map.addOverlay(overlay)
    })
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
    const madeMarks = new Set<string>()
    for (const mark of plan.marks) {
      marked.add(mark.id)
      let kept = state.marks.get(mark.id)
      if (!kept) {
        const { element, turn, fade } = markElement(mark.kind, mark.label, mark.activity)
        // On the full map the real plane and its ghost open their popups when pointed at or tapped.
        if (planeWords && (mark.kind === 'realPlane' || mark.kind === 'ghost')) {
          const pointing = pointingAt(mark.kind, setOpen)
          element.addEventListener('pointerenter', pointing.onPointerEnter)
          element.addEventListener('pointerleave', pointing.onPointerLeave)
          element.addEventListener('click', pointing.onClick)
        }
        // Airports give way to each other where they crowd. The pilot's marker, the plane and a car sit on top of an
        // airport by design, so they take no part: they hide nothing and are never hidden.
        const annotation = new mapkit.Annotation(C(mark.place), () => element, {
          displayPriority: PRIORITY[mark.priority],
          collisionMode: mark.kind === 'airport' ? mapkit.AnnotationCollisionMode.Circle : mapkit.AnnotationCollisionMode.None,
        })
        state.map.addAnnotation(annotation)
        kept = { annotation, turn, fade, priority: mark.priority }
        state.marks.set(mark.id, kept)
        madeMarks.add(mark.id)
      } else {
        kept.annotation.coordinate = C(mark.place)
        // An airport outranks the rest only while its leg is in focus, so its rank moves on with the replay.
        if (kept.priority !== mark.priority) {
          kept.annotation.displayPriority = PRIORITY[mark.priority]
          kept.priority = mark.priority
        }
      }
      kept.turn(mark.degrees)
      kept.fade(mark.faded ?? false)
    }
    restack(plan.marks.map((m) => m.id), madeMarks, (id) => {
      const { annotation } = state.marks.get(id)!
      state.map.removeAnnotation(annotation)
      state.map.addAnnotation(annotation)
    })
    for (const [id, kept] of state.marks) {
      if (!marked.has(id)) {
        state.map.removeAnnotation(kept.annotation)
        state.marks.delete(id)
      }
    }
    // The open plane's popup, moving with its plane, over every mark: a mark made since goes under it again.
    const opened = planeWords && open && drawing.liveLeg ? drawing[open] : null
    if (opened) {
      if (!state.popup) {
        const element = document.createElement('div')
        element.className = 'apple-popup'
        const annotation = new mapkit.Annotation(C(opened.place), () => element, {
          displayPriority: PRIORITY.required, collisionMode: mapkit.AnnotationCollisionMode.None,
        })
        state.map.addAnnotation(annotation)
        state.popup = { annotation, element }
      } else {
        state.popup.annotation.coordinate = C(opened.place)
        if (madeMarks.size > 0) {
          state.map.removeAnnotation(state.popup.annotation)
          state.map.addAnnotation(state.popup.annotation)
        }
      }
      // MapKit gives the plane's place on the page, which scrolls; the map's box is measured in the window.
      const page = state.map.convertCoordinateToPointOnPage(C(opened.place))
      const frame = box.current!.getBoundingClientRect()
      const placement = popupPlacement({ x: page.x - frame.left - scrollX, y: page.y - frame.top - scrollY }, width)
      render(<PlanePopup words={planeWords!(drawing.liveLeg!, open!)} at={{ x: 0, y: 0 }} placement={placement} />, state.popup.element)
    } else if (state.popup) {
      render(null, state.popup.element)
      state.map.removeAnnotation(state.popup.annotation)
      state.popup = null
    }
    if (open && !opened) setOpen(null)
  })

  // The camera: the view the SVG map takes (the leg or the whole trip, clear of the panel or the chips and the banner,
  // with the pilot's marker, or the plane and its ghost, in view), until the person moves the map (§5).
  const kept = keptInView(drawing)
  latest.current = { kept, width, height, insets }
  const framing = useSteadyFraming(framingPoints(map, focus), framingSubject(map, focus))
  // The framing is asked for again only when what it frames, the view's size or what lies over it changes, or on
  // Recenter: not as the plane moves, which would ask MapKit again for every pixel it flies (the review's fixes).
  const { rect, padding } = appleCamera(framing, [], width, height, insets)
  const frame = `${rect.x},${rect.y},${rect.width},${rect.height}|${padding.top},${padding.right},${padding.bottom},${padding.left}|${recenter}`
  const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    const state = live.current
    if (!state) return
    // Recenter pressed since the last framing: frame automatically again.
    if (state.recenterSeen !== recenter) {
      state.moved = false
      state.recenterSeen = recenter
    }
    if (state.moved || state.framed === frame) return
    const animated = state.framed !== '' && !still()
    state.framed = frame
    state.settling = { animated }
    state.justFramed = true
    // The framing with what's kept in view slid in, as the SVG map takes it.
    ask(mapkit, state, appleCamera(framing, kept, width, height, insets), animated, true)
  }, [frame])
  // Between framings, the view slides from where it is, at its zoom, once the plane has flown to the clear part's edge:
  // from the commit after a framing, so as not to cancel the check once it has settled. A replay at up to 10× would
  // outrun an animated slide, so there it jumps.
  useEffect(() => {
    const state = live.current
    if (!state) return
    if (state.justFramed) {
      state.justFramed = false
      return
    }
    if (state.moved || !state.view) return
    const slide = keepInView(state.view, kept, width, height, insets)
    if (!slide) return
    // The framing has settled by now: the camera is keeping up with the plane.
    state.settling = null
    ask(mapkit, state, slide, !isReplay && !still(), false)
  })

  // The card's map is a picture inside the card's button: it's kept from screen readers and out of the Tab order, so
  // Apple's Legal link isn't a link inside a button. The full map's controls and Legal link stay reachable.
  return <div ref={box} class={`apple-trip-map ${mapStyle}${interactive ? '' : ' still'}`} {...(interactive ? {} : { 'aria-hidden': 'true', inert: true })} />
}
