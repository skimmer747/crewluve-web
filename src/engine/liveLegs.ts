import type { GeoPoint } from '../map/greatCircle'
import type { LiveFlight } from '../map/liveFlight'
import { isEstimate, makeMapFlight, mapFlightProgress, type MapFlight } from '../map/mapFlight'
import { isMove, type Leg } from './legs'
import type { DutyPeriod, Iata, Move, Schedule, Trip } from './types'

/**
 * One landing time (Stage 3 spec §7.1, §12), as the app's LiveLegs. The status page builds every leg, the status, the
 * map, the countdown, the narrative and the trip cards from one Schedule. Before it does, each flight with live data
 * gets its real times here in place of the schedule's, so no card works them out itself. The waits either side follow
 * by themselves: `buildLegs` makes the turns, the layovers and the time at base or home from the flights' times.
 */

/** A wait's edge counts as a flight's when it's within this of it. */
const MEETS_WITHIN_MS = 60_000

/** The schedule's flights: each trip's and each jumpseat. A van or bus between airports (`ground`) goes by road. */
function flightsOf(schedule: Schedule): Move[] {
  return [...schedule.trips.flatMap((t) => t.dutyPeriods.flatMap((dp) => dp.flights)), ...schedule.jumpseats].filter((m) => !m.ground)
}

/** What makes two legs one flight: the same airline and number, departure airport and scheduled departure. */
const flightKey = (m: Move) => `${m.airline ?? ''}|${m.number ?? ''}|${m.dep}|${m.schedStart}`

/** Of the legs that are each flight, the first by its id in text order: the one Crewlu Cloud answers under. */
function firstOfEachFlight(schedule: Schedule): Map<string, Move> {
  const first = new Map<string, Move>()
  for (const move of flightsOf(schedule)) {
    const key = flightKey(move)
    const kept = first.get(key)
    if (!kept || move.id < kept.id) first.set(key, move)
  }
  return first
}

/**
 * The schedule's flights for the live source to watch: each one's id, and its gate times moved by its delay. Legs that
 * are one flight are answered once by Crewlu Cloud, under the first of their ids in text order: only that one is
 * watched, or the others' windows would stay open after the flight had landed.
 */
export function watchedFlights(schedule: Schedule): { id: string; departure: number; arrival: number }[] {
  return [...firstOfEachFlight(schedule).values()]
    .sort((a, b) => a.schedStart - b.schedStart || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((m) => ({ id: m.id, departure: m.start, arrival: m.end }))
}

/**
 * Each flight of `schedule` that Crewlu Cloud answered, by its leg's id: its plan, from its gate times moved by its own
 * delay, with the path and the record made from the answer. Legs that are one flight share its answer, so each shows the
 * real plane and none is left on the schedule beside it. `schedule` is the summary's, before `withLiveTimes`.
 */
export function liveMapFlights(
  schedule: Schedule, answered: ReadonlyMap<string, LiveFlight>, clockOffset: number, placeOf: (code: Iata) => GeoPoint | null,
): Map<string, MapFlight> {
  const flights = new Map<string, MapFlight>()
  if (answered.size === 0) return flights
  const answeredUnder = firstOfEachFlight(schedule)
  for (const move of flightsOf(schedule)) {
    const first = answeredUnder.get(flightKey(move))
    const live = first ? answered.get(first.id) : undefined
    const origin = placeOf(move.dep)
    const destination = placeOf(move.arr)
    if (!live || !origin || !destination) continue
    const flight = makeMapFlight(move.start, move.end, origin, destination, live, clockOffset)
    if (flight) flights.set(move.id, flight)
  }
  return flights
}

/** Whether a wait's or a period's `edge` is where its flight's was: at its scheduled time, or at that time moved by its delay. */
const meets = (edge: number, scheduled: number, delayed: number) =>
  Math.abs(edge - scheduled) <= MEETS_WITHIN_MS || Math.abs(edge - delayed) <= MEETS_WITHIN_MS

/** The flight's times by the real plane at `now`: what changes, or null when the real plane has moved neither. */
function realTimes(flight: MapFlight | undefined, now: number): { start: number | null; end: number | null } | null {
  if (!flight) return null
  const progress = mapFlightProgress(flight, now)
  const start = progress.start !== flight.plan.departure ? progress.start : null
  const end = progress.end !== flight.plan.arrival ? progress.end : null
  if ((start == null && end == null) || !(progress.end > progress.start)) return null
  return { start, end }
}

/**
 * The flight at its real times. Its reported delay stays inside them: the scheduled times move with the real ones, so
 * every reader that measures a delay from the two still finds the one CrewLu reported (spec §13: the real plane wins for
 * the times, and the delay stays the pilot's).
 */
function moved(move: Move, real: { start: number | null; end: number | null }): Move {
  return {
    ...move,
    start: real.start ?? move.start,
    schedStart: real.start == null ? move.schedStart : real.start - (move.start - move.schedStart),
    end: real.end ?? move.end,
    schedEnd: real.end == null ? move.schedEnd : real.end - (move.end - move.schedEnd),
  }
}

/** A flight before and after its real times. */
interface Moved {
  from: Move
  to: Move
}

/**
 * `edge`, a duty period's or a trip's start or end, moved with the first of `flights` whose same edge the real plane
 * moved and that it met: at that edge's scheduled time or its delayed one, within a minute.
 */
function shifted(edge: number, side: 'start' | 'end', flights: Moved[]): number {
  for (const { from, to } of flights) {
    if (to[side] === from[side]) continue
    if (meets(edge, side === 'start' ? from.schedStart : from.schedEnd, from[side])) return to[side]
  }
  return edge
}

/**
 * `schedule` with each live flight's real times at `now`, this browser's time, in place of the schedule's
 * (`LiveProgress.start` and `.end`). A duty period or a trip that began where the flight did, or ended where it did,
 * within a minute, begins or ends where it now does: one that begins with a report time, or ends after another leg, is
 * left alone. The same schedule comes back when no flight has anything real.
 */
export function withLiveTimes(schedule: Schedule, flights: ReadonlyMap<string, MapFlight>, now: number): Schedule {
  if (flights.size === 0) return schedule
  let changed = false
  const move = (m: Move): Move => {
    const real = realTimes(flights.get(m.id), now)
    if (!real) return m
    changed = true
    return moved(m, real)
  }
  const trips = schedule.trips.map((trip): Trip => {
    const inTrip: Moved[] = []
    const dutyPeriods = trip.dutyPeriods.map((dp): DutyPeriod => {
      const own = dp.flights.map((from) => ({ from, to: move(from) })).filter(({ from, to }) => to !== from)
      if (own.length === 0) return dp
      inTrip.push(...own)
      const flightsNow = dp.flights.map((m) => own.find(({ from }) => from === m)?.to ?? m)
      return { ...dp, flights: flightsNow, start: shifted(dp.start, 'start', own), end: shifted(dp.end, 'end', own) }
    })
    if (inTrip.length === 0) return trip
    return { ...trip, dutyPeriods, start: shifted(trip.start, 'start', inTrip), end: shifted(trip.end, 'end', inTrip) }
  })
  const jumpseats = schedule.jumpseats.map(move)
  return changed ? { ...schedule, trips, jumpseats } : schedule
}

/**
 * Whether the gate arrival a leg shows is the real plane's estimate, which the words mark with "about" (spec §9): a
 * schedule's leg, by its id. The map's own legs say so themselves (`isArrivalEstimated` in `src/map/tripMap.ts`).
 */
export function isEstimatedArrival(leg: { id: string; end: number }, flights: ReadonlyMap<string, MapFlight>): boolean {
  const flight = flights.get(leg.id)
  return flight != null && isEstimate(flight, leg.end)
}

/**
 * When the flight between its gates at `now` reaches its gate, while that time is the real plane's estimate: the time
 * the countdown and the narrative say "about" of (spec §9). Null with no such flight.
 */
export function estimatedArrival(legs: Leg[], flights: ReadonlyMap<string, MapFlight>, now: number): number | null {
  if (flights.size === 0) return null
  const leg = legs.find((l) => isMove(l) && l.start <= now && now < l.end && isEstimatedArrival(l, flights))
  return leg ? leg.end : null
}
