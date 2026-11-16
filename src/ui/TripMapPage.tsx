import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { planePopupWords } from '../copy/planePopup'
import { MAP_STYLE_NAMES, panelHeadline, topPill } from '../copy/tripMap'
import type { FactsAtMoment } from '../facts/factRow'
import type { IconName } from '../icons/iconPaths'
import { nextMapStyle, type AppleMapStyle } from '../map/appleMapStyle'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import { carried, clockTime, finishesAt, hasTimes, isLive, isPlaying, liveClock, scrub, setQuickLayovers } from '../map/replayClock'
import { tripWaits } from '../map/tripActivity'
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { showsPlaneKey, tripMapDrawing } from '../map/tripMapDrawing'
import { AppleTripMap } from './AppleTripMap'
import { Chevron } from './Chevron'
import { FactsBody } from './FactsBody'
import { useAppleMapKit } from './hooks/useAppleMapKit'
import { useFrameClock } from './hooks/useFrameClock'
import { useMapStyle } from './hooks/useMapStyle'
import { useQuickLayovers } from './hooks/useQuickLayovers'
import { useSidePanel } from './hooks/useSidePanel'
import { useSize } from './hooks/useSize'
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
import { TripTimeline } from './TripTimeline'

export interface TripMapPageProps {
  map: TripMap
  now: number
  viewerTz: string
  h24: boolean
  day: number | null
  days: number | null
  land: GeoPoint[][] | null
  onBack: () => void
  /**
   * The facts at a moment on the timeline, with `now` the real time (Stage 2 spec §5). `isReplay` while the clock isn't
   * live: a replay's facts are the replay's (Stage 3 spec §7.3). Without it the panel is Stage 1B's.
   */
  factsAt?: (t: number, now: number, isReplay: boolean) => FactsAtMoment
}

/** The side panel's gap from the screen's edge, and from the clear part of the map (Stage 2 spec §10). */
const PANEL_MARGIN = 16

/** The style button's icon for each style (Apple Maps spec §4.1). */
const STYLE_ICONS: Record<AppleMapStyle, IconName> = { hybrid: 'GlobeHemisphereWest', standard: 'MapPinArea', satellite: 'GlobeHemisphereEast' }

/**
 * The full map at #map (moving map spec §6, §11; Stage 2 spec §10): the trip, filling the screen, framed on the leg in
 * motion or the whole trip, with a timeline to replay it and the facts at the moment it shows. Back, the close button
 * and Escape all close it. It doesn't pan or zoom.
 */
export function TripMapPage({ map, now, viewerTz, h24, day, days, land, onBack, factsAt }: TripMapPageProps) {
  // A recap opens paused at its trip's start, ready to play; Live jumps to now, after the trip (Stage 2 spec §6.5).
  const [kept, setClock] = useState(() => (map.mode.kind === 'recap' ? scrub(liveClock(map.span), map.span.start) : liveClock(map.span)))
  const [quickLayovers, rememberQuickLayovers] = useQuickLayovers()
  const waits = useMemo(() => tripWaits(map), [map])
  // The span, legs and waits always follow the map, so the slider's range and the replay's pace are right if the trip
  // changes while the page is open. A new landing estimate changes them: a replay keeps its moment and plays on from it
  // (Stage 3 spec §7.3). Quick layovers is this browser's choice (activity markers design §3.1).
  const current = hasTimes(kept, map.span, map.legs, waits) ? kept : carried(kept, map.span, map.legs, waits, Date.now())
  useEffect(() => {
    if (current !== kept) setClock(current)
  })
  const clock = { ...current, quickLayovers }
  // A moment of the replay shows the real plane alone, and the pill says "In flight".
  const isReplay = !isLive(clock)
  // Switching keeps the moment shown, and a replay carries on from it at the new pace.
  const onQuickLayovers = (on: boolean) => {
    setClock(setQuickLayovers(clock, on, Date.now()))
    rememberQuickLayovers(on)
  }
  const frameNow = useFrameClock(isPlaying(clock), now, finishesAt(clock) ?? Infinity)
  const t = clockTime(clock, frameNow)
  const box = useRef<HTMLDivElement>(null)
  const { width, height } = useSize(box, { width: 390, height: 520 })
  const panel = useRef<HTMLElement>(null)
  const panelSize = useSize(panel, { width: 0, height: 0 })
  const heading = useRef<HTMLHeadingElement>(null)
  const focus = legInMotion(map, t) ?? (t === now ? currentLeg(map) : null)
  const side = useSidePanel()
  const apple = useAppleMapKit().status === 'ready'
  const [mapStyle, setMapStyle] = useMapStyle()
  // Once the person pans or zooms, the camera stops framing and Recenter appears (Apple Maps spec §5).
  const [moved, setMoved] = useState(false)
  const [recenter, setRecenter] = useState(0)
  const styleButton = useRef<HTMLButtonElement>(null)
  // The side panel opens with its facts showing; the bottom panel opens small, with "More facts" (§10).
  const [open, setOpen] = useState(side)
  useEffect(() => setOpen(side), [side])
  // A replay's moment has a replay's facts: the real plane where its record has it, with no height or speed (Stage 3
  // spec §7.3).
  const facts = factsAt ? factsAt(t, now, isReplay) : null
  const showsFacts = facts != null && open

  // Focus the heading once, as the page opens. The page re-renders every second, so this must not depend on onBack.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  // A side panel lies over the map, so the camera keeps the trip clear of it: its width while open, its height while
  // folded to the corner. The bottom panel sits under the map, which shrinks to make room (§10).
  const insets: Insets = !side || panelSize.width === 0 ? NO_INSETS
    : showsFacts ? { ...NO_INSETS, left: panelSize.width + 2 * PANEL_MARGIN }
    : { ...NO_INSETS, bottom: panelSize.height + 2 * PANEL_MARGIN }

  // Night moves about a degree every four minutes. Live it's redrawn each minute. In replay it's drawn at the very time
  // shown, every frame, as the planes are: a 3-minute step made its edge jump about 11 px on a trip, and over half the
  // screen zoomed in on a drive. Drawing it costs about 2 ms.
  const nightStep = isPlaying(clock) ? 0 : 60_000
  return (
    <main class="trip-map-page">
      <header class="trip-map-top">
        <button type="button" class="trip-map-close" aria-label="Close map" onClick={onBack}>
          <Icon name="XCircle" size={28} />
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days, isReplay)}</h1>
        {apple && moved && (
          // Recenter leaves the page as it's pressed, so focus moves to the style button beside it.
          <button type="button" class="trip-map-round" aria-label="Recenter map"
            onClick={() => { setMoved(false); setRecenter((n) => n + 1); styleButton.current?.focus() }}>
            <Icon name="GpsFix" size={20} />
          </button>
        )}
        {apple && (
          <button ref={styleButton} type="button" class="trip-map-style" aria-label={`Map style: ${MAP_STYLE_NAMES[mapStyle]}`} onClick={() => setMapStyle(nextMapStyle(mapStyle))}>
            <Icon name={STYLE_ICONS[mapStyle]} size={18} />
            <span aria-hidden="true">{MAP_STYLE_NAMES[mapStyle]}</span>
          </button>
        )}
      </header>
      <div ref={box} class="trip-map-full">
        <AppleTripMap map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets}
          mapStyle={mapStyle} interactive recenter={recenter} onUserMove={() => setMoved(true)} isReplay={isReplay}
          planeWords={(leg, plane) => planePopupWords(leg, plane, t, isReplay, viewerTz, h24)} />
        {/* The key to the real plane and its ghost, while both show: now, not in a replay (which plane design §2). */}
        {!isReplay && showsPlaneKey(tripMapDrawing(map, t)) && <PlaneKey />}
      </div>
      <section ref={panel} class={`trip-map-panel ${side ? 'side' : 'bottom'}${showsFacts ? ' open' : ''}`}
        aria-label={facts ? 'Trip facts and timeline' : 'Timeline'}>
        <div class="trip-map-panel-top">
          <h2 class="trip-map-headline">{facts ? facts.headline : panelHeadline(map, t, viewerTz, h24)}</h2>
          {facts && side && (
            <button type="button" class="facts-toggle chevron-toggle" aria-expanded={open} aria-controls="trip-facts"
              aria-label={open ? 'Hide facts' : 'Show facts'} onClick={() => setOpen(!open)}>
              <Chevron direction="right" size={16} />
            </button>
          )}
          {facts && !side && (
            <button type="button" class="facts-toggle" aria-expanded={open} aria-controls="trip-facts" onClick={() => setOpen(!open)}>
              {open ? 'Fewer facts' : 'More facts'}
            </button>
          )}
        </div>
        {facts && (
          <div id="trip-facts" class="trip-facts" hidden={!open}>
            <FactsBody rows={facts.rows} tripSoFar={facts.tripSoFar} showsLiveCredit={facts.showsLiveCredit} />
          </div>
        )}
        <TripTimeline map={map} clock={clock} onChange={setClock} onQuickLayovers={onQuickLayovers} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
    </main>
  )
}
