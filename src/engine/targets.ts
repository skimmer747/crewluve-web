import { DAY, MINUTE } from '../time/zoned'
import { departureOf, isHomecomingMove, isMove, schedEndOf, type Leg, type MoveLeg } from './legs'
import type { Status } from './status'
import type { Iata, Pilot } from './types'

export type ArrivalLabel = 'home' | 'base' | 'city' | 'released'

export interface ArrivalTarget {
  label: ArrivalLabel
  time: number
  schedTime: number
  /** The airport the countdown arrives at (the city in the card subtitle). */
  airport: Iata | null
  /** time − schedTime in minutes; positive means late. */
  delayMin: number
}

const RIDE_WINDOW = 3 * DAY

function toTarget(label: ArrivalLabel, leg: Leg, airport: Iata | null): ArrivalTarget {
  const schedTime = schedEndOf(leg)
  return { label, time: leg.end, schedTime, airport, delayMin: Math.round((leg.end - schedTime) / MINUTE) }
}

/**
 * The trip being flown, else the latest trip leg that ended ≤24 h ago, else the next trip leg starting ≤24 h from now
 * (spec §6.5 step 3). Standalone legs (events, drives, jumpseats) belong to no trip, so they are skipped:
 * a meeting at base can't change which trip counts. `legs` must be sorted by start.
 */
export function currentTripId(legs: Leg[], status: Status, t: number): string | null {
  if (status.current?.tripId) return status.current.tripId
  let previous: Leg | null = null
  for (const l of legs) if (l.tripId && l.end <= t && (!previous || l.end >= previous.end)) previous = l
  if (previous && t - previous.end <= DAY) return previous.tripId
  const next = legs.find((l) => l.tripId && l.start > t)
  return next && next.start - t <= DAY ? next.tripId : null
}

/**
 * What the away countdown counts to (spec §6.5, with step 4.3 from the back-home spec §4.1), or null for no countdown.
 * Never call it while the status is Home. `legs` must be sorted by start.
 */
export function arrivalTarget(legs: Leg[], pilot: Pilot, status: Status, t: number): ArrivalTarget | null {
  const current = status.current
  if (current && (current.kind === 'reserve' || current.kind === 'hotStandby' || current.kind === 'training')) {
    return { label: 'released', time: current.end, schedTime: current.end, airport: current.airport ?? pilot.base, delayMin: 0 }
  }
  const home = pilot.effHome
  if (!home) return null
  if (current && !current.tripId && isHomecomingMove(current, home)) return toTarget('home', current, home)

  // The first leg of a trip other than `ofTrip` that starts after `from`: no ride home of `ofTrip` starts after it (C14).
  const nextTripLeg = (ofTrip: string | null, from: number) =>
    legs.find((l): l is Leg & { tripId: string } => !!l.tripId && l.tripId !== ofTrip && l.start > from)
  const ride = (from: number, startBy: number, before: number) =>
    legs.find((l) => !l.tripId && isHomecomingMove(l, home) && l.end > t && l.start >= from && l.start < before && l.start <= startBy)
  // A standalone leg from (or at) home, or a drive to work, in [from, to) means the pilot went home in between.
  const homeBetween = (from: number, to: number) =>
    legs.some((l) => !l.tripId && l.start >= from && l.start < to && (departureOf(l) === home || (l.kind === 'drive' && !l.toHome)))

  const trip = currentTripId(legs, status, t)
  if (!trip) {
    const r = ride(-Infinity, t + RIDE_WINDOW, nextTripLeg(null, t)?.start ?? Infinity)
    return r ? toTarget('home', r, home) : null
  }

  // Steps 4.1–4.3: the trip's homecoming, else straight on to the next trip's while the pilot stays away.
  let id = trip
  let after = t // the other trips' legs that start after this come after `id`; it only grows, so the loop ends
  let tripLast: MoveLeg | null = null
  for (;;) {
    const tripLegs = legs.filter((l) => l.tripId === id)
    const finalHome = tripLegs.filter(
      (l) => isHomecomingMove(l, home) && l.end > t && !tripLegs.some((m) => m !== l && m.start >= l.end),
    )
    if (finalHome.length > 0) return toTarget('home', finalHome.reduce((a, b) => (b.end > a.end ? b : a)), home)

    const flights = tripLegs.filter(isMove)
    if (flights.length === 0) break
    const last = flights.reduce((a, b) => (b.end > a.end ? b : a))
    tripLast ??= last
    const next = nextTripLeg(id, after)
    const r = ride(last.start, last.end + RIDE_WINDOW, next?.start ?? Infinity)
    if (r) return toTarget('home', r, home)
    // Signs of home before t are over: the status isn't Home, so he is away again.
    if (!next || next.start - last.end > DAY || departureOf(next) === home || homeBetween(Math.max(last.end, t), next.start)) break
    id = next.tripId
    after = next.start
  }

  // Step 4.4: the trip's own last flight, if it is still ahead.
  if (tripLast && tripLast.end > t) return toTarget(tripLast.arr === pilot.base ? 'base' : 'city', tripLast, tripLast.arr)
  return null
}
