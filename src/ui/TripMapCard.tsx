import type { Ref } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { cardSummary, headline, recapLongestLine, recapTiles, type TripFacts } from '../facts/tripFacts'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, cardHeading, flightStatus, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
import { NO_INSETS, type Insets } from '../map/mapFit'
import { currentLeg, type MapLeg, type TripMap } from '../map/tripMap'
import { showsPlaneKey, tripMapDrawing } from '../map/tripMapDrawing'
import { AppleTripMap } from './AppleTripMap'
import { useHeightOf } from './hooks/useHeightOf'
import { useMapStyle } from './hooks/useMapStyle'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { PlaneKey } from './PlaneKey'
import { TripRecapBar } from './TripRecapBar'

export interface TripMapCardProps {
  map: TripMap
  now: number
  viewerTz: string
  h24: boolean
  /** The pilot's name, for the spoken summary. */
  name: string
  day: number | null
  days: number | null
  /** The departure's delay when it's 15 minutes or more, shown under the map in flight, as the in-flight card did. */
  delayMinutes: number | null
  land: GeoPoint[][] | null
  /** The facts (Stage 2 spec §6.4, §6.5): the headline on the chip in flight, the recap's numbers and the spoken summary. */
  facts?: TripFacts | null
  /** Opens the full map from the card's map. The status page remounts, so focus finds the map again by `data-trip-map-open`. */
  onOpenMap: () => void
  /** Opens the tracking popup from the flight number, when the flight has tracking. */
  onOpenTracking?: (button: HTMLButtonElement) => void
  /** The card's heading, which takes focus when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
}

const MAP_HEIGHT = 220

/** How far the chips sit in from the map's top and bottom edges (`.trip-map-chip` in tripMap.css). */
const CHIP_EDGE = 10

/** The room the camera leaves between a chip and the trip. */
const CHIP_GAP = 4

/**
 * The part of the map each chip covers, measured from the map's edge, for the camera to keep the trip clear of. A chip
 * with no height (none shown, or not yet laid out) covers nothing. On Apple's map it's the map's padding too, which
 * keeps Apple's logo and Legal link above the bottom chip, as Apple requires them to show (Apple Maps spec §4.2).
 */
export function chipInsets(topChipHeight: number, bottomChipHeight: number): Insets {
  const covered = (height: number) => (height > 0 ? CHIP_EDGE + height + CHIP_GAP : 0)
  return { ...NO_INSETS, top: covered(topChipHeight), bottom: covered(bottomChipHeight) }
}

/**
 * The trip map on the status page (moving map spec §5). In flight it takes the in-flight card's place. On the ground it
 * sits above the location card, which keeps its weather and sun dial. Tapping the map opens the full map at #map.
 */
export function TripMapCard(p: TripMapCardProps) {
  const box = useRef<HTMLSpanElement>(null)
  const width = useWidth(box, 343)
  const [mapStyle] = useMapStyle()
  const leg = currentLeg(p.map)
  const isRecap = p.map.mode.kind === 'recap'
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  // In flight the bottom chip is the facts' headline, which falls back to the landing countdown (§6.4).
  const bottom = (leg && p.facts ? headline(p.facts, p.now) : null) ?? chips.bottom
  const summary = p.facts ? cardSummary(p.facts, p.now, p.name) : tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)
  // The key to the real plane and its ghost, while both show (which plane design §2), at the map's top right.
  const showsKey = showsPlaneKey(tripMapDrawing(p.map, p.now))
  // The camera keeps the trip in the band between the chips, so neither covers the pilot's marker or a route. The key
  // is kept clear as the top chip is.
  const [topChip, setTopChip] = useState<HTMLElement | null>(null)
  const [bottomChip, setBottomChip] = useState<HTMLElement | null>(null)
  const [key, setKey] = useState<HTMLElement | null>(null)
  const insets = chipInsets(Math.max(useHeightOf(topChip), useHeightOf(key)), useHeightOf(bottomChip))
  return (
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{cardHeading(p.map, p.now)}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={summary} onClick={() => p.onOpenMap()}>
        <span ref={box} class="trip-map-frame">
          <AppleTripMap map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} insets={insets}
            mapStyle={mapStyle} interactive={false} />
        </span>
        {chips.top && <span ref={setTopChip} class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {showsKey && <PlaneKey boxRef={setKey} />}
        {bottom && (
          <span ref={setBottomChip} class="trip-map-chip bottom" aria-hidden="true">
            {isRecap && <PlayMark />}
            {bottom}
          </span>
        )}
      </button>
      {leg && p.delayMinutes != null && (
        <p class={p.delayMinutes < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={p.delayMinutes < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          <span aria-hidden="true">{delayBannerText(p.delayMinutes)}</span>
          <span class="sr-only">{spokenDelayBanner(p.delayMinutes)}</span>
        </p>
      )}
      {leg ? <InFlightBar leg={leg} {...p} />
        : isRecap && p.facts ? <TripRecapBar tiles={recapTiles(p.facts)} longest={recapLongestLine(p.facts)} />
        : <StatsBar items={statsItems(p.map, p.now, p.day, p.days, p.viewerTz)} />}
    </section>
  )
}

function InFlightBar({ leg, now, viewerTz, h24, onOpenTracking }: TripMapCardProps & { leg: MapLeg }) {
  const local = arrivalLocalTime(leg, viewerTz, h24)
  return (
    <div class="inflight-bar">
      <div class="inflight-flight">
        {leg.flightNumber && onOpenTracking ? (
          <button type="button" class="inflight-number" aria-label={`${leg.flightNumber}. Opens flight tracking.`} aria-haspopup="dialog"
            onClick={(e) => onOpenTracking(e.currentTarget)}>
            {leg.flightNumber}
          </button>
        ) : leg.flightNumber && <span class="inflight-number">{leg.flightNumber}</span>}
        {/* The real plane's label, or "In flight" (Stage 3 spec §9). */}
        <span class="inflight-status">{flightStatus(leg, now)}</span>
      </div>
      <div class="inflight-arrival">
        <p class="inflight-time">{landsAt(leg, viewerTz, h24)}</p>
        {local && <span class="inflight-code">{local}</span>}
      </div>
    </div>
  )
}

function StatsBar({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul class="trip-map-stats">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

/** The recap chip's play mark, drawn as the timeline's Replay button draws it (Stage 2 spec §6.5). */
function PlayMark() {
  return (
    <svg class="trip-map-chip-play" width="10" height="10" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 3l11 7-11 7z" />
    </svg>
  )
}
