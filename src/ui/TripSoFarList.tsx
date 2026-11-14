import type { TripSoFar } from '../facts/factRow'

/** The trip so far (Stage 2 spec §5.2, §5.5): each flight's milestones under its name, newest flight first, then the totals. */
export function TripSoFarList({ tripSoFar }: { tripSoFar: TripSoFar }) {
  return (
    <div class="trip-so-far">
      {tripSoFar.flights.map((flight) => (
        <section key={flight.id} class="trip-so-far-flight">
          <h3>{flight.title}</h3>
          <ul>
            {flight.milestones.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
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
