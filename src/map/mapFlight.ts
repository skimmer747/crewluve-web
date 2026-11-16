import { makeFlightPath, type FlightPath } from './flightPath'
import { makeFlightPlan, type FlightPlan } from './flightPlan'
import { makeFlightRecord, type FlightRecord } from './flightRecord'
import { distanceMeters, type GeoPoint } from './greatCircle'
import type { LiveFlight } from './liveFlight'
import { liveProgress, type LiveProgress } from './liveProgress'

/**
 * A flight leg as the trip map measures and draws it (Stage 3 spec §11), as the app's MapFlight: the schedule's plan,
 * the path, and once the plane has been seen in the air, its record. The three are made together from one answer of
 * Crewlu Cloud's, so they always agree.
 */
export interface MapFlight {
  /** The schedule's plan, from the leg's gate times moved by its reported delay and by nothing else. */
  plan: FlightPlan
  /** The real path once the plane has been seen in the air, else the great circle between the airports. */
  path: FlightPath
  /** Where the plane was at any moment. Null without a real path. */
  record: FlightRecord | null
  /** The flight's live data, or null when Crewlu Cloud answered none for its leg. */
  live: LiveFlight | null
  /** Crewlu Cloud's clock minus this browser's, in ms, as of the answer `live` came in. */
  clockOffset: number
}

/**
 * The flight from `origin` to `destination` between its gate times, `departure` and `arrival`, both moved by any
 * reported delay. Null for a leg that arrives no later than it leaves.
 */
export function makeMapFlight(
  departure: number, arrival: number, origin: GeoPoint, destination: GeoPoint, live: LiveFlight | null = null, clockOffset = 0,
): MapFlight | null {
  const plan = makeFlightPlan(departure, arrival, distanceMeters(origin, destination))
  if (!plan) return null
  const path = makeFlightPath(origin, destination, live)
  return { plan, path, record: makeFlightRecord(path, plan), live, clockOffset }
}

/** The real plane when this browser's clock says `now`. A fix's age is measured by Crewlu Cloud's clock, so a wrong clock here doesn't age it. */
export const mapFlightProgress = (flight: MapFlight, now: number): LiveProgress =>
  liveProgress(flight.plan, flight.path, flight.record, flight.live, now + flight.clockOffset)

/**
 * Whether `arrival`, the leg's gate arrival as it's shown, is the real plane's estimate, which the words mark with
 * "about" (spec §9): it isn't the plan's, by a second or more, and the plane hasn't landed.
 */
export const isEstimate = (flight: MapFlight, arrival: number): boolean =>
  flight.live?.state !== 'landed' && Math.abs(arrival - flight.plan.arrival) >= 1000
