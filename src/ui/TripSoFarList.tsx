import type { TripSoFar } from '../facts/factRow'

/**
 * The trip so far (Stage 2 spec §5.2, §5.5; best guesses design §3, §4): each flight's events under its name, newest
 * first, then the trip's totals. The flight between its gates has a border, and its tag beside its name (or under it,
 * where they don't fit on one line), so it stands out from the flights before it. A best guess is drawn lighter, and
 * slanted.
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
              {flight.events.map((event, i) => <li key={i} class={event.isEstimate ? 'estimate' : undefined}>{event.text}</li>)}
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
