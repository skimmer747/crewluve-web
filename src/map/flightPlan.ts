import type { FlightPath } from './flightPath'
import { airborneWindow } from './flightProgress'
import { METERS_PER_NM } from './greatCircle'

/**
 * The schedule's flight plan (Stage 3 spec §4), as the app's FlightPlan: when an on-schedule plane takes off and
 * touches down, and how fast it flies in between. The real plane is measured against it, flown at the plane's own
 * speed for the next 2 hours once that's known, and at the schedule's after that (long gap design §2). The constants
 * are written down in tests/fixtures/trip-map/live-cases.json, a copy of the app's. Times are epoch ms, distances
 * meters, and speeds meters a second.
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
/**
 * How far ahead of the last place the plane was seen its own speed is trusted: 2 hours of its cruise, in ms. Past that,
 * the winds it meets are the schedule's to know, and so is its speed (long gap design §2).
 */
export const OWN_SPEED_AHEAD_MS = 2 * 60 * 60_000

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
 * `plan` as the plane flies it, once `path` has an own speed that could be right: that speed for the next
 * `OWN_SPEED_AHEAD_MS` of the cruise left from the last place the plane was seen, and the schedule's after, made into the
 * one speed that flies the cruise left in the same time (long gap design §2). The takeoff and the touchdown stay the
 * schedule's, and a leg flown at one steady speed keeps it. The landing estimate, the estimated plane, the ghost and the
 * record all fly this plan, so the gap between the two planes is still the label. Only the time is meant: inside the
 * gap, the estimated plane is a little off where a plane flying the two speeds would be.
 */
export function flownPlan(plan: FlightPlan, path: FlightPath): FlightPlan {
  const own = path.ownSpeed
  if (plan.isSteady || own == null) return plan
  // Written so that a speed that isn't a number is no speed, as the app's range has it.
  if (!(own >= plan.speed * OWN_SPEED_LEAST_SHARE && own <= plan.speed * OWN_SPEED_MOST_SHARE)) return plan
  // The way left from the last place it was seen is the great circle, and its last 120 nm the descent.
  const cruiseLeft = path.length - path.flownLength - DESCENT_DISTANCE
  return { ...plan, speed: cruiseSpeed(cruiseLeft, own, plan.speed) }
}

/**
 * The one speed that flies `cruise` meters in the time it takes at `own` for `OWN_SPEED_AHEAD_MS`, or all the way when
 * that's further, and at `planned` for the rest. With no cruise left, `own`. Speeds are meters a second.
 */
export function cruiseSpeed(cruise: number, own: number, planned: number): number {
  if (!(cruise > 0)) return own
  const atOwnSpeed = Math.min(cruise, (own * OWN_SPEED_AHEAD_MS) / 1000)
  return cruise / (atOwnSpeed / own + (cruise - atOwnSpeed) / planned)
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
