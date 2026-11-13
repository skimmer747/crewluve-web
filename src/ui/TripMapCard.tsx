import type { Ref } from 'preact'
import { useRef } from 'preact/hooks'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
import { arrivalLocalTime, cardChips, landsAt, statsItems, tripMapSummary } from '../copy/tripMap'
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, type MapLeg, type TripMap } from '../map/tripMap'
import { useWidth } from './hooks/useWidth'
import { Icon } from './Icon'
import { TripMapSvg } from './TripMapSvg'

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
  /** Opens the full map from the card's map. The status page remounts, so focus finds the map again by `data-trip-map-open`. */
  onOpenMap: () => void
  /** Opens the tracking popup from the flight number, when the flight has tracking. */
  onOpenTracking?: (button: HTMLButtonElement) => void
  /** The card's heading, which takes focus when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
}

const MAP_HEIGHT = 220

/**
 * The trip map on the status page (moving map spec §5). In flight it takes the in-flight card's place. On the ground it
 * sits above the location card, which keeps its weather and sun dial. Tapping the map opens the full map at #map.
 */
export function TripMapCard(p: TripMapCardProps) {
  const box = useRef<HTMLSpanElement>(null)
  const width = useWidth(box, 343)
  const leg = currentLeg(p.map)
  const chips = cardChips(p.map, p.now, p.viewerTz, p.h24)
  return (
    <section class="card glass trip-map-card">
      <h2 ref={p.headingRef} class="sr-only" tabIndex={-1}>{leg ? 'In flight' : 'Trip map'}</h2>
      <button type="button" class="trip-map-open" data-trip-map-open aria-label={tripMapSummary(p.map, p.now, p.name, p.viewerTz, p.h24)}
        onClick={() => p.onOpenMap()}>
        <span ref={box} class="trip-map-frame">
          <TripMapSvg map={p.map} t={p.now} width={width} height={MAP_HEIGHT} focus={leg} land={p.land} nightStep={60_000} />
        </span>
        {chips.top && <span class="trip-map-chip top" aria-hidden="true">{chips.top}</span>}
        {chips.bottom && <span class="trip-map-chip bottom" aria-hidden="true">{chips.bottom}</span>}
      </button>
      {leg && p.delayMinutes != null && (
        <p class={p.delayMinutes < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={p.delayMinutes < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          <span aria-hidden="true">{delayBannerText(p.delayMinutes)}</span>
          <span class="sr-only">{spokenDelayBanner(p.delayMinutes)}</span>
        </p>
      )}
      {leg ? <InFlightBar leg={leg} {...p} /> : <StatsBar items={statsItems(p.map, p.now, p.day, p.days, p.viewerTz)} />}
    </section>
  )
}

function InFlightBar({ leg, viewerTz, h24, onOpenTracking }: TripMapCardProps & { leg: MapLeg }) {
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
        <span class="inflight-status">In flight</span>
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
