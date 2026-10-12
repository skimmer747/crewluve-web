import type { Ref } from 'preact'
import { delayBannerText, spokenDelayBanner } from '../copy/flight'
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
  /** The card's heading, which takes focus from code when a popup closes by itself (popup follow-ups §4.2). */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * LocationCardView while the pilot is in the air (slice 2C §5): the map, a delay banner when the departure is 15
 * minutes or more off, and the info bar with the flight number, "In Flight", and the arrival's local time and code.
 */
export function InFlightCard({ facts, now, h24, onOpenTracking, headingRef }: InFlightCardProps) {
  // The arrival's local time, or the departure's when the arrival's zone isn't known (§5.2), named for screen readers.
  const { arr, dep } = facts
  const clock = arr.timeZone ? { city: arr.city, zone: arr.timeZone } : dep.timeZone ? { city: dep.city, zone: dep.timeZone } : null
  const offset = facts.delayMinutes
  return (
    <section class="card glass inflight">
      <h2 ref={headingRef} class="sr-only" tabIndex={-1}>In flight</h2>
      <FlightMap facts={facts} now={now} h24={h24} />
      {offset != null && (
        <p class={offset < 0 ? 'inflight-banner early' : 'inflight-banner late'}>
          <Icon name={offset < 0 ? 'CheckCircle' : 'Warning'} size={12} />
          <span aria-hidden="true">{delayBannerText(offset)}</span>
          <span class="sr-only">{spokenDelayBanner(offset)}</span>
        </p>
      )}
      <div class="inflight-bar">
        <div class="inflight-flight">
          {facts.flightNumber && (
            <button
              type="button"
              class="inflight-number"
              aria-label={`${facts.flightNumber}. Opens flight tracking.`}
              aria-haspopup="dialog"
              onClick={(e) => onOpenTracking(e.currentTarget)}
            >
              {facts.flightNumber}
            </button>
          )}
          <span class="inflight-status">In Flight</span>
        </div>
        <div class="inflight-arrival">
          <p class="inflight-time">
            <Icon name="NavigationArrow" size={12} />
            {clock && (
              <>
                <span class="sr-only">Time in {clock.city} </span>
                {shortTimeText(now, clock.zone, h24)}
              </>
            )}
          </p>
          <span class="inflight-code">{arr.code}</span>
        </div>
      </div>
    </section>
  )
}
