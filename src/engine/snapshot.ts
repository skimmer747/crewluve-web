import { reportOnce } from '../reportOnce'
import { DAY, MINUTE } from '../time/zoned'
import { lastHomeArrival, leaveTarget, nextTripFlight, nextTripHomecoming, type LeaveTarget } from './home'
import { isDuty, isHomecomingMove, isMove, type DriveLeg, type DutyLeg, type Leg, type MoveLeg } from './legs'
import { resolveStatus, type Status } from './status'
import { arrivalTarget, type ArrivalTarget } from './targets'
import { tripDayNumber, tripDays, tripProgress, upcomingTrip, type FlightDelay, type TripProgress, type UpcomingTrip } from './trips'
import type { Iata, Pilot, Schedule, Trip } from './types'

export const DELAY_THRESHOLD_MIN = 15

export interface Snapshot {
  t: number
  /** First name, or "Your pilot". */
  name: string
  hasName: boolean
  pilot: Pilot
  status: Status
  /** 0…1 progress for the icon ring, or null where Crewluve shows none. */
  ring: number | null
  /** The relevant flight's departure delay, when it is 15+ minutes off schedule. */
  delay: FlightDelay | null
  arrival: ArrivalTarget | null
  fallbackDaysRemaining: number | null
  leave: LeaveTarget | null
  /** {HB}: when the next trip brings the pilot home (Home status only). */
  homecoming: ArrivalTarget | null
  driveToWork: DriveLeg | null
  /** The jumpseat the pilot logged from home to the next trip's first airport, if it leaves before that trip does: the Home sentence's "Commuting to …". */
  nextCommute: MoveLeg | null
  nextFlight: MoveLeg | null
  nextMove: MoveLeg | null
  /** The next drive or event arriving home ("heads home to …" at base). */
  nextHomeTrip: DriveLeg | DutyLeg | null
  lastTripDays: number | null
  nextTripDays: number | null
  midTripAtHome: boolean
  daysHome: number | null
  /**
   * The next trip, for the upcoming trip card: shown at home or base, Crewluve's isSettled (slice 2A §3). Overnight at home
   * or base in the middle of a trip it is the rest of that trip, with the whole trip's length (slice 2A §10 item 9).
   */
  upcomingTrip: UpcomingTrip | null
  /** Day N of M and the cities still ahead, for the trip progress card: shown during a trip, away from home and base. */
  tripProgress: TripProgress | null
  celebrate: boolean
  empty: boolean
}

/** Everything the screen needs at time t. `legs` must come from buildLegs(schedule). */
export function makeSnapshot(schedule: Schedule, legs: Leg[], t: number, baseTz: string): Snapshot {
  const { pilot } = schedule
  const flightless = flightlessTrip(schedule, legs, t)
  let status = resolveStatus(legs, pilot, t)
  // On a trip whose flights are all hidden we can't tell where the pilot is: Crewluve's "On duty" (spec §4.4).
  // Only a standalone leg under way (a drive, an event) says anything, so it keeps its own status.
  if (flightless && !status.current) status = { ...status, kind: 'unknown', airport: null }

  const atHome = status.kind === 'home'
  const midTripAtHome = atHome && status.current?.kind === 'home'
  const nextFlight = nextTripFlight(legs, t)
  const nextTrip = nextFlight ? schedule.trips.find((tr) => tr.id === nextFlight.tripId) ?? null : null
  const lastTrip = schedule.trips.reduce<Trip | null>((best, tr) => (tr.end <= t && (!best || tr.end > best.end) ? tr : best), null)
  const arrival = atHome ? null : arrivalTarget(legs, pilot, status, t)
  const nextMove = (legs.find((l) => isMove(l) && l.start > t) as MoveLeg | undefined) ?? null
  // The same homecoming rule as the countdown: a drive home, or a drive-titled event, arriving home.
  const nextHomeTrip = pilot.effHome == null ? null
    : ((legs.find((l) => l.start > t && (l.kind === 'drive' || l.kind === 'event') && isHomecomingMove(l, pilot.effHome)) as DriveLeg | DutyLeg | undefined) ?? null)
  const delay = relevantDelay(status, nextFlight, nextMove)
  const nextCommute = atHome ? pendingCommute(legs, pilot.effHome, t, nextFlight) : null
  // Crewluve's isSettled: the upcoming trip shows at home or base, the trip's progress everywhere else (slice 2A §3).
  const settled = status.kind === 'home' || status.kind === 'base'

  return {
    t,
    name: pilot.firstName ?? 'Your pilot',
    hasName: pilot.firstName != null,
    pilot,
    status,
    ring: ringProgress(status, t),
    delay,
    arrival,
    fallbackDaysRemaining: !atHome && !arrival && flightless ? daysRemaining(flightless, t, baseTz) : null,
    leave: atHome ? leaveTarget(legs, pilot, t) : null,
    homecoming: atHome ? nextTripHomecoming(legs, pilot, t) : null,
    driveToWork: atHome ? pendingDriveToWork(legs, t, nextFlight) : null,
    nextCommute,
    nextFlight,
    nextMove,
    nextHomeTrip,
    lastTripDays: atHome && lastTrip && !midTripAtHome ? tripDays(lastTrip, baseTz) : null,
    nextTripDays: nextTrip ? tripDays(nextTrip, baseTz) : null,
    midTripAtHome,
    daysHome: atHome && !midTripAtHome ? daysSince(lastHomeArrival(legs, pilot, t), t) : null,
    upcomingTrip: settled ? upcomingTrip(schedule, legs, t, baseTz, { commute: nextCommute, delay }) : null,
    tripProgress: settled ? null : tripProgress(schedule, legs, t, baseTz),
    celebrate: arrival != null && status.kind !== 'base' && arrival.time - t > 0 && arrival.time - t <= DAY,
    empty: schedule.empty,
  }
}

const NO_PILOT: Pilot = { firstName: null, base: null, home: null, effHome: null }

/** makeSnapshot that can never take the page down: an engine error shows "On duty" (spec §8). */
export function safeSnapshot(schedule: Schedule, legs: Leg[], t: number, baseTz: string): Snapshot {
  try {
    return makeSnapshot(schedule, legs, t, baseTz)
  } catch (err) {
    reportOnce('Status engine failed; showing "On duty"', err)
    // The schedule itself may be what is broken, so read it defensively: nothing in here may throw.
    const pilot = schedule?.pilot ?? NO_PILOT
    return {
      t,
      name: pilot.firstName ?? 'Your pilot',
      hasName: pilot.firstName != null,
      pilot,
      status: { kind: 'unknown', airport: null, current: null, previous: null, next: null },
      ring: null, delay: null, arrival: null, fallbackDaysRemaining: null, leave: null, homecoming: null,
      driveToWork: null, nextCommute: null, nextFlight: null, nextMove: null, nextHomeTrip: null, lastTripDays: null,
      nextTripDays: null, midTripAtHome: false, daysHome: null, upcomingTrip: null, tripProgress: null, celebrate: false, empty: schedule?.empty ?? false,
    }
  }
}

function ringProgress(status: Status, t: number): number | null {
  const c = status.current
  if (!c) return null
  const placeRing = (status.kind === 'layover' || status.kind === 'base') && (c.kind === 'layover' || c.kind === 'base' || c.kind === 'report')
  if (!isMove(c) && !isDuty(c) && !placeRing) return null
  return Math.min(1, Math.max(0, (t - c.start) / (c.end - c.start)))
}

function relevantDelay(status: Status, nextFlight: MoveLeg | null, nextMove: MoveLeg | null): Snapshot['delay'] {
  const c = status.current
  const flight =
    c && isMove(c) ? c
      : status.kind === 'home' ? nextFlight
        : status.kind === 'turn' || status.kind === 'layover' || status.kind === 'base' || status.kind === 'off' ? nextMove
          : null
  if (!flight) return null
  const minutes = Math.round((flight.start - flight.schedStart) / MINUTE)
  return Math.abs(minutes) >= DELAY_THRESHOLD_MIN ? { flight, minutes } : null
}

function flightlessTrip(schedule: Schedule, legs: Leg[], t: number): Trip | null {
  const trip = schedule.trips.find((tr) => tr.start <= t && t < tr.end)
  return trip && !legs.some((l) => l.tripId === trip.id && isMove(l)) ? trip : null
}

/** EstimatedReturnCardView: max(total days − day number, 0), counting days in the base's zone. */
function daysRemaining(trip: Trip, t: number, timeZone: string): number {
  return Math.max(tripDays(trip, timeZone) - tripDayNumber(trip, t, timeZone), 0)
}

/**
 * The drive to work for the next trip. Bounded to that trip (spec §6.11: C7, C11, C22): it must leave within a day of the trip's
 * first flight, with no drive home in between. An earlier drive belongs to a reserve or training day, another trip, or is stale.
 */
function pendingDriveToWork(legs: Leg[], t: number, nextFlight: MoveLeg | null): DriveLeg | null {
  if (!nextFlight) return null
  const homeBetween = (from: number) => legs.some((m) => m.kind === 'drive' && m.toHome && m.start > from && m.start < nextFlight.start)
  const drive = legs.find(
    (l) => l.kind === 'drive' && !l.toHome && l.start > t && l.start < nextFlight.start && nextFlight.start - l.start <= DAY && !homeBetween(l.start),
  )
  return (drive as DriveLeg | undefined) ?? null
}

/**
 * UpcomingTripInfo.swift:67-93: a standalone jumpseat from home to the trip's first airport, leaving after t and before the trip's
 * first flight. The earliest one wins. A trip that leaves from home needs none, and none is guessed when none is logged.
 * Bounded to the next trip like the drive to work: within a day of its first flight, with no way home in between, so a
 * training day's jumpseat days earlier isn't told as the trip's commute (spec §6.11: C7).
 */
function pendingCommute(legs: Leg[], home: Iata | null, t: number, nextFlight: MoveLeg | null): MoveLeg | null {
  if (!nextFlight || nextFlight.dep === home) return null
  const homeBetween = (from: number) =>
    legs.some((m) => m.start > from && m.start < nextFlight.start && ((m.kind === 'drive' && m.toHome) || (m.kind === 'jumpseat' && m.arr === home)))
  const commute = legs.find(
    (l) =>
      l.kind === 'jumpseat' && l.tripId == null && l.dep === home && l.arr === nextFlight.dep && l.start > t && l.start < nextFlight.start &&
      nextFlight.start - l.start <= DAY && !homeBetween(l.start),
  )
  return (commute as MoveLeg | undefined) ?? null
}

const daysSince = (arrival: number | null, t: number) => (arrival == null ? null : Math.floor((t - arrival) / DAY))
