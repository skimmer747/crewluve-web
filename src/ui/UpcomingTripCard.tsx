import { Fragment } from 'preact'
import { daysText, tripCardDepartsText } from '../copy/format'
import { routeLabel } from '../copy/trips'
import { delayBadge, LINE_TRIP_BADGE, type BadgeVisual } from '../copy/visuals'
import type { AirportIndex } from '../data/airports'
import type { UpcomingTrip } from '../engine/trips'
import { cssColor } from './colors'
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
  const last = trip.route.length - 1
  return (
    <section class="card glass trip-card">
      {/* The app's card has no title; screen-reader users jumping between headings still land here. */}
      <h2 class="sr-only">Upcoming trip</h2>
      <div class="trip-head">
        <Badge badge={LINE_TRIP_BADGE} />
        <div class="trip-when">
          <p class="trip-departs">{tripCardDepartsText(trip.departs, now, timeZone, h24)}</p>
          <p class="trip-days">{daysText(trip.days)}</p>
        </div>
        {trip.delayMinutes != null && <Badge badge={delayBadge(trip.delayMinutes)} />}
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

/** A capsule badge: white text and icon on the badge's color. */
function Badge({ badge }: { badge: BadgeVisual }) {
  return (
    <span class="badge" style={{ background: cssColor(badge.color) }}>
      <Icon name={badge.icon} size={11} />
      {badge.label}
    </span>
  )
}
