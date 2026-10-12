import { delayBannerText } from '../copy/flight'
import { shortTimeText } from '../copy/format'
import { FlightMap } from './FlightMap'
import { Icon } from './Icon'
import type { InFlightFacts } from './inFlightFacts'

export interface InFlightCardProps {
  facts: InFlightFacts
  now: number
  h24: boolean
  /** Opens the tracking popup. The flight number hands itself over, so focus can go back to it afterwards. */
  onOpenTracking: (button: HTMLButtonElement) => void
}

/**
 * LocationCardView while the pilot is in the air (slice 2C §5): the map, a delay banner when the departure is 15
 * minutes or more off, and the info bar with the flight number, "In Flight", and the arrival's local time and code.
 */
export function InFlightCard({ facts, now, h24, onOpenTracking }: InFlightCardProps) {
  const zone = facts.arr.timeZone ?? facts.dep.timeZone
  const offset = facts.delayMinutes
  return (
    <section class="card glass inflight">
      <h2 class="sr-only">In flight</h2>
      <FlightMap facts={facts} now={now} h24={h24} />
      {offset != null && (
        <p class={offset < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={offset < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          {delayBannerText(offset)}
        </p>
      )}
      <div class="inflight-bar">
        <div class="inflight-flight">
          {facts.flightNumber && (
            <button type="button" class="inflight-number" aria-haspopup="dialog" onClick={(e) => onOpenTracking(e.currentTarget)}>
              {facts.flightNumber}
            </button>
          )}
          <span class="inflight-status">In Flight</span>
        </div>
        <div class="inflight-arrival">
          <p class="inflight-time">
            <Icon name="NavigationArrow" size={12} />
            <span class="sr-only">Time in {facts.arr.city} </span>
            {zone ? shortTimeText(now, zone, h24) : ''}
          </p>
          <span class="inflight-code">{facts.arr.code}</span>
        </div>
      </div>
    </section>
  )
}
