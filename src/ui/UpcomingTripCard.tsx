import { Fragment } from 'preact'
import { daysText, tripCardDepartsText } from '../copy/format'
import { routeLabel } from '../copy/trips'
import type { AirportIndex } from '../data/airports'
import type { UpcomingTrip } from '../engine/trips'
import { Icon } from './Icon'

interface UpcomingTripCardProps {
  trip: UpcomingTrip
  now: number
  /** The pilot's home time zone, like the other cards' subtitles. */
  timeZone: string
  h24: boolean
  airports: AirportIndex
}

/** UpcomingTripCard: the type badge, departure and length, a delay badge when late or early, then the route dots. */
export function UpcomingTripCard({ trip, now, timeZone, h24, airports }: UpcomingTripCardProps) {
  const early = trip.delayMinutes != null && trip.delayMinutes < 0
  const last = trip.route.length - 1
  return (
    <section class="card glass trip-card">
      <div class="trip-head">
        <span class="badge" style={{ background: 'var(--blue)' }}>
          <Icon name="Airplane" size={11} />
          Line Trip
        </span>
        <div class="trip-when">
          <p class="trip-departs">{tripCardDepartsText(trip.departs, now, timeZone, h24)}</p>
          <p class="trip-days">{daysText(trip.days)}</p>
        </div>
        {trip.delayMinutes != null && (
          <span class="badge" style={{ background: early ? 'var(--green)' : 'var(--orange)' }}>
            <Icon name={early ? 'Clock' : 'ClockCountdown'} size={11} />
            {early ? 'Early' : 'Delayed'}
          </span>
        )}
      </div>
      {trip.route.length > 0 && (
        <div class="route">
          <p class="sr-only">{routeLabel(trip.route, airports)}</p>
          <div class="route-stops" aria-hidden="true">
            {trip.route.map((code, i) => (
              <Fragment key={`${i}-${code}`}>
                {i > 0 && <span class="route-line" />}
                <span class={i === 0 || i === last ? 'route-stop end' : 'route-stop'}>
                  <span class="route-dot" />
                  <span class="route-code">{code}</span>
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
