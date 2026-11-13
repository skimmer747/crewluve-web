import { useEffect, useRef, useState } from 'preact/hooks'
import { panelHeadline, topPill } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
import { clockTime, finishesAt, isPlaying, liveClock, REPLAY_BASE_RATE } from '../map/replayClock'
import { currentLeg, legInMotion, type TripMap } from '../map/tripMap'
import { useFrameClock } from './hooks/useFrameClock'
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
}

/**
 * The full map at #map (moving map spec §6, §11): the trip, filling the screen, framed on the leg in motion or the whole trip, with a
 * timeline to replay it. Back, the close button and Escape all close it. It doesn't pan or zoom in Stage 1.
 */
export function TripMapPage({ map, now, viewerTz, h24, day, days, land, onBack }: TripMapPageProps) {
  const [kept, setClock] = useState(() => liveClock(map.span))
  // The span always follows the map, so the slider's range is right if the trip changes while the page is open.
  const clock = { ...kept, span: map.span }
  const frameNow = useFrameClock(isPlaying(clock), now, finishesAt(clock) ?? Infinity)
  const t = clockTime(clock, frameNow)
  const box = useRef<HTMLDivElement>(null)
  const { width, height } = useSize(box, { width: 390, height: 520 })
  const heading = useRef<HTMLHeadingElement>(null)
  const focus = legInMotion(map, t) ?? (t === now ? currentLeg(map) : null)

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
        <TripMapSvg map={map} t={t} width={width} height={height} focus={focus} land={land} nightStep={nightStep} />
      </div>
      <section class="trip-map-panel" aria-label="Timeline">
        <h2 class="trip-map-headline">{panelHeadline(map, t, viewerTz, h24)}</h2>
        <TripTimeline clock={clock} onChange={setClock} now={frameNow} viewerTz={viewerTz} h24={h24} />
      </section>
    </main>
  )
}
