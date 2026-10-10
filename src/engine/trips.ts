import { calendarDay } from '../time/zoned'
import { nextTripFlight } from './home'
import type { Leg, MoveLeg } from './legs'
import type { Iata, Schedule, Trip } from './types'

/** Trip length in days: trips.days when it is above 0 (Duty writes 0 for a trip under 24 hours), else the inclusive calendar-day count in `timeZone`. */
export function tripDays(trip: Trip, timeZone: string): number {
  return trip.days != null && trip.days > 0 ? trip.days : calendarDay(trip.end, timeZone) - calendarDay(trip.start, timeZone) + 1
}

/**
 * "Day N" of a trip: calendar days since it started, plus one, counted in `timeZone` (the base's) and kept between 1 and
 * tripDays. Duty counts in UTC, which late on a US evening reads "Day 5 of 4" (slice 2A spec §5).
 */
export function tripDayNumber(trip: Trip, t: number, timeZone: string): number {
  const day = calendarDay(t, timeZone) - calendarDay(trip.start, timeZone) + 1
  return Math.min(Math.max(day, 1), tripDays(trip, timeZone))
}

/** The most stops the upcoming trip card's route shows (UpcomingTripCard.displayRoute). */
export const ROUTE_STOPS = 6

export interface UpcomingTrip {
  tripId: string
  /** When the pilot leaves for it: the logged commute jumpseat's start, else the first flight's start. */
  departs: number
  days: number
  /** Up to 6 airports: each remaining departure and arrival once, in order, with home first when a commute was found. */
  route: Iata[]
  /** The departure delay on this trip's flight when it's 15+ minutes off schedule; negative means early. */
  delayMinutes: number | null
}

export interface TripExtras {
  /** The logged commute jumpseat from home to the trip's first airport (Snapshot.nextCommute). */
  commute: MoveLeg | null
  /** The relevant flight's departure delay when it is 15+ minutes off schedule (Snapshot.delay). */
  delay: { flight: MoveLeg; minutes: number } | null
}

/**
 * UpcomingTripInfo.from on CrewLu Cloud data: the trip of the next trip flight after t. Its route is each remaining flight's
 * departure and arrival once, in order. Home goes first when a commute was found, unless the route already has it.
 */
export function upcomingTrip(schedule: Schedule, legs: Leg[], t: number, baseTz: string, extras: TripExtras): UpcomingTrip | null {
  const first = nextTripFlight(legs, t)
  const trip = first?.tripId ? schedule.trips.find((tr) => tr.id === first.tripId) : undefined
  if (!first || !trip) return null
  const route: Iata[] = []
  for (const l of legs) {
    if (l.kind !== 'flight' || l.tripId !== trip.id || l.start <= t) continue
    if (!route.includes(l.dep)) route.push(l.dep)
    if (!route.includes(l.arr)) route.push(l.arr)
  }
  const { commute, delay } = extras
  if (commute && !route.includes(commute.dep)) route.unshift(commute.dep)
  return {
    tripId: trip.id,
    departs: commute ? commute.start : first.start,
    days: tripDays(trip, baseTz),
    route: route.slice(0, ROUTE_STOPS),
    delayMinutes: delay && delay.flight.tripId === trip.id ? delay.minutes : null,
  }
}
