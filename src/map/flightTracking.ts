import { scheduledTakeoff } from './flightProgress'
import { isNotLive, mapFlightProgress, seenAtDeparture } from './mapFlight'
import { isMoving, type MapLeg } from './tripMap'

/**
 * How the flight between its gates is known now (live or scheduled design §2), as the app's FlightTracking:
 * - live: Crewlu Cloud saw the plane in the last 3 minutes: at its gate, in the air, landed or down somewhere else;
 * - bestGuess: last seen in the air over 3 minutes ago, the faded plane;
 * - notTracked: no live data, never seen, or seen on the ground over 3 minutes ago: the schedule's plane alone;
 * - waiting: no live data yet, as Crewlu Cloud hasn't answered since the page opened. It reads as notTracked, but the
 *   pill, the card's bar and the facts say nothing of where it comes from, so nothing flips from "Not tracked live" to
 *   "Live" in the first second. Hedged words ("Should be flying", "By the schedule", "about") still show: they're true
 *   either way.
 * It reads the live data at `now`, so it's for now only: a replay's moment shows the plane the map draws.
 */
export type FlightTracking = 'live' | 'bestGuess' | 'notTracked' | 'waiting'

export function legTracking(leg: MapLeg, now: number): FlightTracking {
  if (!leg.flight) return leg.isAwaitingLive ? 'waiting' : 'notTracked'
  switch (mapFlightProgress(leg.flight, now).phase) {
    case 'notLive':
      return 'notTracked'
    case 'estimated':
      return 'bestGuess'
    case 'onGround':
    case 'inAir':
    case 'landed':
    case 'elsewhere':
    case 'returned':
      return 'live'
  }
}

/** Whether the flight is known by the schedule alone: not tracked live, or waiting to hear (§2). */
export const isBySchedule = (tracking: FlightTracking): boolean => tracking === 'notTracked' || tracking === 'waiting'

/**
 * How a flight on the ground at its departure airport is told (§3, §4.2):
 * - due: known by the schedule alone, before the schedule's takeoff: "Scheduled to take off about 3:14 PM L";
 * - atGate: its real plane seen there before the plan's takeoff: "On the ground in Louisville";
 * - stillAtGate: seen there after it: "Still on the ground in Louisville" (which plane design §4);
 * - returned: back there after an air return: "Returned to Rockford" (air return design §3).
 */
export type AtDeparture = 'due' | 'atGate' | 'stillAtGate' | 'returned'

/**
 * Whether `leg`, between its gates at `now`, is on the ground at its departure airport, and how that's told. Null in the
 * air, out of sight, down, outside its gate times, and for a drive. A plane on the ground at departure never reads
 * "Over …", "In the air now" or "Flying into the night", and has passed nothing yet. Now only, as `legTracking` is.
 */
export function legAtDeparture(leg: MapLeg, now: number): AtDeparture | null {
  if (leg.kind !== 'flight' || !isMoving(leg, now)) return null
  const isDue = now < scheduledTakeoff(leg.start, leg.end)
  if (!leg.flight || isNotLive(leg.flight, now)) return isDue ? 'due' : null
  return seenAtDeparture(leg.flight, now)
}

/**
 * Whether `at` is the real plane seen at its departure airport, not the schedule's: the list leaves it out until it
 * takes off.
 */
export const isSeenAtDeparture = (at: AtDeparture | null): boolean => at != null && at !== 'due'
