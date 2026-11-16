import type { FlightPath } from './flightPath'
import { airborneWindow } from './flightProgress'
import { METERS_PER_NM } from './greatCircle'

/**
 * The schedule's flight plan (Stage 3 spec §4), as the app's FlightPlan: when an on-schedule plane takes off and
 * touches down, and how fast it flies in between. The real plane is measured against it, flown at the plane's own
 * speed once that's known. The constants are written down in tests/fixtures/trip-map/live-cases.json, a copy of the
 * app's. Times are epoch ms, distances meters, and speeds meters a second.
 */

/** The last stretch before touchdown, flown at DESCENT_SPEED: 120 nautical miles. */
export const DESCENT_DISTANCE = 120 * METERS_PER_NM
/** 280 knots, in meters a second. */
export const DESCENT_SPEED = (280 * METERS_PER_NM) / 3600
/** How long the descent takes, in seconds: 25.7 minutes. */
const DESCENT_SECONDS = DESCENT_DISTANCE / DESCENT_SPEED
/** A plane's own speed is believed from 0.7 of the plan's speed to 1.5 of it, which the strongest winds stay inside. */
export const OWN_SPEED_LEAST_SHARE = 0.7
export const OWN_SPEED_MOST_SHARE = 1.5

export interface FlightPlan {
  /** Leaving the gate and reaching it, both moved by any reported delay. */
  departure: number
  arrival: number
  /** Wheels up and wheels down, as the schedule's plane has them (`airborneWindow`). */
  takeoff: number
  touchdown: number
  /** The great-circle distance between the leg's airports. */
  distance: number
  /** The speed before the descent: the cruise, or a short leg's one speed. The schedule's, or the plane's own in a plan from `flownPlan`. */
  speed: number
  /** Whether the whole leg is flown at `speed`, with no faster cruise before a descent: a short leg, or a slow one. */
  isSteady: boolean
}

/** The plan of a leg between airports `distance` meters apart, or null when it arrives no later than it leaves. */
export function makeFlightPlan(departure: number, arrival: number, distance: number): FlightPlan | null {
  const window = airborneWindow(departure, arrival)
  if (!window) return null
  const inAir = (window.end - window.start) / 1000
  // A leg has a cruise of its own only when it's longer than the descent, in distance and in time.
  const hasRoomToCruise = distance > DESCENT_DISTANCE && inAir > DESCENT_SECONDS
  const cruise = hasRoomToCruise ? (distance - DESCENT_DISTANCE) / (inAir - DESCENT_SECONDS) : 0
  const plan = { departure, arrival, takeoff: window.start, touchdown: window.end, distance }
  if (cruise > DESCENT_SPEED) return { ...plan, speed: cruise, isSteady: false }
  // A leg that goes nowhere has no speed of its own: the descent's stands in.
  const steady = distance / inAir
  return { ...plan, speed: steady > 0 ? steady : DESCENT_SPEED, isSteady: true }
}

/**
 * `plan` as the plane flies it: with the plane's own speed over its cruise so far in place of the schedule's, once
 * `path` has one that could be right. The takeoff and the touchdown stay the schedule's, and a leg flown at one steady
 * speed keeps it. The landing estimate, the estimated plane and the ghost all fly this plan, so the gap between the
 * two planes is still the label.
 */
export function flownPlan(plan: FlightPlan, path: FlightPath): FlightPlan {
  const own = path.ownSpeed
  if (plan.isSteady || own == null) return plan
  // Written so that a speed that isn't a number is no speed, as the app's range has it.
  if (!(own >= plan.speed * OWN_SPEED_LEAST_SHARE && own <= plan.speed * OWN_SPEED_MOST_SHARE)) return plan
  return { ...plan, speed: own }
}

/** The plan's time in the air, in ms. */
export const timeInAir = (plan: FlightPlan) => plan.touchdown - plan.takeoff
/** From the gate to wheels up: the schedule plane's allowance, or nothing on a block too short for it. */
export const taxiOut = (plan: FlightPlan) => plan.takeoff - plan.departure
/** From wheels down to the gate. */
export const taxiIn = (plan: FlightPlan) => plan.arrival - plan.touchdown

/** How long, in ms, a plane flying `plan` needs to fly `distance` meters to touchdown. Further than the whole leg, the extra is flown at its speed. */
export function timeToFly(plan: FlightPlan, distance: number): number {
  const far = Math.max(distance, 0)
  if (plan.isSteady) return (far / plan.speed) * 1000
  if (far <= DESCENT_DISTANCE) return (far / DESCENT_SPEED) * 1000
  return (DESCENT_SECONDS + (far - DESCENT_DISTANCE) / plan.speed) * 1000
}

/** How far from touchdown a plane flying `plan` is, `ms` before it: `timeToFly`'s inverse. */
export function distanceLeft(plan: FlightPlan, ms: number): number {
  const left = Math.max(ms, 0) / 1000
  if (plan.isSteady) return left * plan.speed
  if (left <= DESCENT_SECONDS) return left * DESCENT_SPEED
  return DESCENT_DISTANCE + (left - DESCENT_SECONDS) * plan.speed
}
