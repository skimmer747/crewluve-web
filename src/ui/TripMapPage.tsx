import { useEffect, useRef, useState } from 'preact/hooks'
import { panelHeadline, topPill } from '../copy/tripMap'
import type { FactsAtMoment } from '../facts/factRow'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import { clockTime, finishesAt, isPlaying, liveClock, REPLAY_BASE_RATE } from '../map/replayClock'
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { Chevron } from './Chevron'
import { FactsBody } from './FactsBody'
import { useFrameClock } from './hooks/useFrameClock'
import { useSidePanel } from './hooks/useSidePanel'
import { useSize } from './hooks/useSize'
import { Icon } from './Icon'
import { TripMapSvg } from './TripMapSvg'
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
  /** The facts at a moment on the timeline, with `now` the real time (Stage 2 spec §5). Without it the panel is Stage 1B's. */
  factsAt?: (t: number, now: number) => FactsAtMoment
}

/** The side panel's gap from the screen's edge, and from the clear part of the map (Stage 2 spec §10). */
const PANEL_MARGIN = 16

/**
 * The full map at #map (moving map spec §6, §11; Stage 2 spec §10): the trip, filling the screen, framed on the leg in
 * motion or the whole trip, with a timeline to replay it and the facts at the moment it shows. Back, the close button
 * and Escape all close it. It doesn't pan or zoom.
 */
export function TripMapPage({ map, now, viewerTz, h24, day, days, land, onBack, factsAt }: TripMapPageProps) {
  const [kept, setClock] = useState(() => liveClock(map.span))
  // The span always follows the map, so the slider's range is right if the trip changes while the page is open.
  const clock = { ...kept, span: map.span }
  const frameNow = useFrameClock(isPlaying(clock), now, finishesAt(clock) ?? Infinity)
  const t = clockTime(clock, frameNow)
  const box = useRef<HTMLDivElement>(null)
  const { width, height } = useSize(box, { width: 390, height: 520 })
  const panel = useRef<HTMLElement>(null)
  const panelSize = useSize(panel, { width: 0, height: 0 })
  const heading = useRef<HTMLHeadingElement>(null)
  const focus = legInMotion(map, t) ?? (t === now ? currentLeg(map) : null)
  const side = useSidePanel()
  // The side panel opens with its facts showing; the bottom panel opens small, with "More facts" (§10).
  const [open, setOpen] = useState(side)
  useEffect(() => setOpen(side), [side])
  const facts = factsAt ? factsAt(t, now) : null
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

  // Night moves about a degree every four minutes: live it's redrawn each minute; in replay about ten times a second.
  const nightStep = isPlaying(clock) ? (REPLAY_BASE_RATE / 10) * clock.speed * 1000 : 60_000
  return (
    <main class="trip-map-page">
      <header class="trip-map-top">
        <button type="button" class="trip-map-close" aria-label="Close map" onClick={onBack}>
          <Icon name="XCircle" size={28} />
        </button>
        <h1 ref={heading} class="trip-map-pill" tabIndex={-1}>{topPill(map, t, day, days)}</h1>
      </header>
      <div ref={box} class="trip-map-full">
        <TripMapSvg map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} insets={insets} />
      </div>
      <section ref={panel} class={`trip-map-panel ${side ? 'side' : 'bottom'}${showsFacts ? ' open' : ''}`}
        aria-label={facts ? 'Trip facts' : 'Timeline'}>
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
            <FactsBody rows={facts.rows} tripSoFar={facts.tripSoFar} />
          </div>
        )}
        <TripTimeline clock={clock} onChange={setClock} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
    </main>
  )
}
