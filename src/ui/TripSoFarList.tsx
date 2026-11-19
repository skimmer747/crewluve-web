import type { TripSoFar, TripSoFarEvent } from '../facts/factRow'
import { ClockText } from './ClockText'

/**
 * The trip so far (Stage 2 spec §5.2, §5.5; best guesses design §3, §4): each flight's events under its name, newest
 * first, then the trip's totals. The flight between its gates has a border, and its tag beside its name (or under it,
 * where they don't fit on one line), so it stands out from the flights before it. A best guess is drawn lighter, and
 * slanted. The newest event of the flight between its gates is bold, and "latest" to a screen reader (time labels
 * design §3.4). Each time says whose it is.
 *
 * With nothing to list, as on a layover whose rows say "Trip so far" before any flight has an event, it's left out
 * altogether: an empty box would add a second gap between the rows and the footer.
 */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
  if (tripSoFar.flights.length === 0 && !tripSoFar.totals) return null
  return (
    <div class="trip-so-far">
      {tripSoFar.flights.map((flight) => (
        <section key={flight.id} class={flight.tag ? 'trip-so-far-flight in-the-air' : 'trip-so-far-flight'}>
          <h3>
            <span>{flight.title}</span>
            {flight.tag && <> <span class="trip-so-far-tag">{flight.tag}</span></>}
          </h3>
          {flight.events.length > 0 && (
            <ul>
              {flight.events.map((event, i) => (
                <li key={i} class={eventClass(event)}>
                  <ClockText text={event.text} />
                  {event.isCurrent && <span class="sr-only">, latest</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {tripSoFar.totals && (
        <section class="trip-so-far-totals">
          <h3>{tripSoFar.totalsTitle}</h3>
          <p>{tripSoFar.totals}</p>
        </section>
      )}
    </div>
  )
}

/** "estimate" for a best guess, "current" for the newest event, both, or none. */
const eventClass = (event: TripSoFarEvent) => [event.isEstimate && 'estimate', event.isCurrent && 'current'].filter(Boolean).join(' ') || undefined
