import { calendarDay, HOUR } from '../time/zoned'
import { nextTripFlight } from './home'
import { isMove, type Leg, type MoveLeg } from './legs'
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
  /** Up to 6 airports: each remaining departure and arrival once, in order, with home first when a commute was found, unless the route already has it. */
  route: Iata[]
  /** The departure delay on this trip's flight when it's 15+ minutes off schedule; negative means early. */
  delayMinutes: number | null
}

/** A flight's departure delay: `minutes` off its scheduled out time, positive when late and negative when early. */
export interface FlightDelay {
  flight: MoveLeg
  minutes: number
}

export interface UpcomingTripInputs {
  /** The logged commute jumpseat from home to the trip's first airport (Snapshot.nextCommute). */
  commute: MoveLeg | null
  /** The relevant flight's departure delay when it is 15+ minutes off schedule (Snapshot.delay). */
  delay: FlightDelay | null
}

/**
 * UpcomingTripInfo.from on CrewLu Cloud data: the trip of the next trip flight after t. Its route is each remaining flight's
 * departure and arrival once, in order. Home goes first when a commute was found, unless the route already has it.
 */
export function upcomingTrip(schedule: Schedule, legs: Leg[], t: number, baseTz: string, inputs: UpcomingTripInputs): UpcomingTrip | null {
  const first = nextTripFlight(legs, t)
  const trip = first?.tripId ? schedule.trips.find((tr) => tr.id === first.tripId) : undefined
  if (!first || !trip) return null
  const route: Iata[] = []
  for (const l of legs) {
    if (l.kind !== 'flight' || l.tripId !== trip.id || l.start <= t) continue
    if (!route.includes(l.dep)) route.push(l.dep)
    if (!route.includes(l.arr)) route.push(l.arr)
  }
  const { commute, delay } = inputs
  if (commute && !route.includes(commute.dep)) route.unshift(commute.dep)
  return {
    tripId: trip.id,
    departs: commute ? commute.start : first.start,
    days: tripDays(trip, baseTz),
    route: route.slice(0, ROUTE_STOPS),
    delayMinutes: delay && delay.flight.tripId === trip.id ? delay.minutes : null,
  }
}

export interface TripProgress {
  tripId: string
  /** 1…days */
  day: number
  days: number
  /** Arrival airports of the trip's flights still to depart, in order, each once. The copy layer matches cities and keeps 3. */
  upcoming: Iata[]
}

/** trips.end_date, or later while the trip's last visible flight runs late: Duty keeps the release time when flights move (slice 2A §3). */
function tripEnd(trip: Trip): number {
  let end = trip.end
  for (const dp of trip.dutyPeriods) for (const f of dp.flights) if (f.end > end) end = f.end
  return end
}

/**
 * calculateTripOverview on CrewLu Cloud data: the trip covering t, its day number and length, and the airports its
 * remaining flights land at. Covering means start ≤ t < end, where end is trips.end_date or, when later, the last
 * flight's landing.
 */
export function tripProgress(schedule: Schedule, legs: Leg[], t: number, baseTz: string): TripProgress | null {
  const trip = schedule.trips.find((tr) => tr.start <= t && t < tripEnd(tr))
  if (!trip) return null
  const upcoming: Iata[] = []
  for (const l of legs) {
    if (l.kind === 'flight' && l.tripId === trip.id && l.start > t && !upcoming.includes(l.arr)) upcoming.push(l.arr)
  }
  return { tripId: trip.id, day: tripDayNumber(trip, t, baseTz), days: tripDays(trip, baseTz), upcoming }
}

/** The trip just finished, which the trip map recaps (Stage 2 spec §8). */
export interface RecapTrip {
  tripId: string
  /** CrewLu's count of the trip's days, else the calendar days it spans in the base's zone. */
  days: number
}

/** A recap shows this long after its trip's last flight lands (Stage 2 spec §8.1). */
export const RECAP_MS = 24 * HOUR
/** A next trip leaving this soon takes over from the recap. */
export const RECAP_YIELDS_WITHIN_MS = 12 * HOUR

/**
 * The trip whose last flight landed in the past 24 hours, as the app's TripMap+Status picks it (Stage 2 spec §8.1):
 * the latest to end, unless another trip is under way (a night at home in the middle of it) or the next trip's first
 * flight leaves within 12 hours. Flights without a trip, like a standalone jumpseat, aren't a trip. The snapshot asks
 * only at home: a commuter at base still has the way home ahead.
 */
export function recapTrip(schedule: Schedule, legs: Leg[], t: number, baseTz: string): RecapTrip | null {
  const spans = new Map<string, { start: number; end: number }>()
  for (const leg of legs) {
    if (!isMove(leg) || leg.tripId == null) continue
    const span = spans.get(leg.tripId)
    spans.set(leg.tripId, span ? { start: Math.min(span.start, leg.start), end: Math.max(span.end, leg.end) } : { start: leg.start, end: leg.end })
  }
  // A trip whose first flight has left and last hasn't landed is under way, whatever the pilot is doing between flights.
  for (const span of spans.values()) {
    if (span.start <= t && span.end > t) return null
  }
  let latest: { tripId: string; start: number; end: number } | null = null
  for (const [tripId, span] of spans) {
    if (span.end <= t && t - span.end < RECAP_MS && (!latest || span.end > latest.end)) latest = { tripId, ...span }
  }
  if (!latest) return null
  // Taken apart here: TypeScript doesn't carry the null check on a `let` into the `find` callback below.
  const { tripId, start, end } = latest
  const nextDeparture = Math.min(...legs.filter((l) => isMove(l) && l.tripId != null && l.start > t).map((l) => l.start))
  if (nextDeparture - t <= RECAP_YIELDS_WITHIN_MS) return null
  const trip = schedule.trips.find((tr) => tr.id === tripId)
  const days = trip ? tripDays(trip, baseTz) : calendarDay(end, baseTz) - calendarDay(start, baseTz) + 1
  return { tripId, days }
}
