import { DAY, MINUTE } from '../time/zoned'
import { isHomecomingMove, isMove, schedEndOf, type Leg } from './legs'
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

/** The trip being flown, else one that ended ≤24 h ago, else one starting ≤24 h from now (spec §6.5 step 3). */
export function currentTripId(status: Status, t: number): string | null {
  if (status.current?.tripId) return status.current.tripId
  if (status.previous?.tripId && t - status.previous.end <= DAY) return status.previous.tripId
  if (status.next?.tripId && status.next.start - t <= DAY) return status.next.tripId
  return null
}

/** What the away countdown counts to (spec §6.5), or null for no countdown. Never call it while the status is Home. */
export function arrivalTarget(legs: Leg[], pilot: Pilot, status: Status, t: number): ArrivalTarget | null {
  const current = status.current
  if (current && (current.kind === 'reserve' || current.kind === 'hotStandby' || current.kind === 'training')) {
    return { label: 'released', time: current.end, schedTime: current.end, airport: current.airport ?? pilot.base, delayMin: 0 }
  }
  const home = pilot.effHome
  if (!home) return null
  if (current && !current.tripId && isHomecomingMove(current, home)) return toTarget('home', current, home)

  const trip = currentTripId(status, t)
  const nextTripStart = legs.reduce(
    (min, l) => (l.tripId && l.tripId !== trip && l.start > t ? Math.min(min, l.start) : min),
    Infinity,
  )
  const ride = (from: number, startBy: number) =>
    legs.find((l) => !l.tripId && isHomecomingMove(l, home) && l.end > t && l.start >= from && l.start < nextTripStart && l.start <= startBy)

  if (!trip) {
    const r = ride(-Infinity, t + RIDE_WINDOW)
    return r ? toTarget('home', r, home) : null
  }

  const tripLegs = legs.filter((l) => l.tripId === trip)
  const finalHome = tripLegs.filter(
    (l) => isHomecomingMove(l, home) && l.end > t && !tripLegs.some((m) => m !== l && m.start >= l.end),
  )
  if (finalHome.length > 0) return toTarget('home', finalHome.reduce((a, b) => (b.end > a.end ? b : a)), home)

  const flights = tripLegs.filter(isMove)
  if (flights.length === 0) return null
  const last = flights.reduce((a, b) => (b.end > a.end ? b : a))
  const r = ride(last.start, last.end + RIDE_WINDOW)
  if (r) return toTarget('home', r, home)
  if (last.end > t) return toTarget(last.arr === pilot.base ? 'base' : 'city', last, last.arr)
  return null
}
