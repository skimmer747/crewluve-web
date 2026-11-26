import type { AirportIndex } from '../data/airports'
import { isMove, type Leg } from '../engine/legs'
import type { Snapshot } from '../engine/snapshot'
import { HOUR } from '../time/zoned'
import type { MapFlight } from './mapFlight'
import { isGroundLeg, makeTripMap, type TripMap } from './tripMap'

/**
 * Which trip the status page's map shows (moving map spec §5.1, §12), as the app's TripMap+Status, on the site's own
 * model:
 * - at home or base, the next trip;
 * - at home or base for a day after a trip, its recap, unless the next trip leaves within 12 hours (Stage 2 spec §8.1);
 * - on a trip, the trip under way: the one the trip progress card shows;
 * - between trips, the leg in motion, such as a commute home.
 */

/** Commutes count as part of a trip when they fall within this long of its flights. */
const COMMUTE_WINDOW = 12 * HOUR

/**
 * A trip's own flights and jumpseats, the drives and standalone jumpseats within 12 hours of them, and its layovers,
 * turns and stays at base or home, which name the waits between them (activity markers design §2.2).
 */
export function tripLegs(legs: Leg[], tripId: string): Leg[] {
  const own = legs.filter((l) => isMove(l) && l.tripId === tripId)
  if (own.length === 0) return []
  const first = Math.min(...own.map((l) => l.start)) - COMMUTE_WINDOW
  const last = Math.max(...own.map((l) => l.end)) + COMMUTE_WINDOW
  const commutes = legs.filter((l) => (l.kind === 'drive' || (isMove(l) && l.tripId == null)) && l.start >= first && l.end <= last)
  const ground = legs.filter((l) => isGroundLeg(l) && l.tripId === tripId)
  return [...own, ...commutes, ...ground].sort((a, b) => a.start - b.start)
}

/**
 * The status page's trip map, or null when there's nothing to draw. `flights` are the flights Crewlu Cloud answered for,
 * by leg id: the map draws their real planes (Stage 3 spec §11).
 */
export function tripMapFor(
  snap: Snapshot, legs: Leg[], airports: AirportIndex, flights?: ReadonlyMap<string, MapFlight>, isAwaitingLive = false,
): TripMap | null {
  const options = (isNextTrip: boolean) => ({
    isNextTrip, home: snap.pilot.effHome, base: snap.pilot.base, now: snap.t, airports, flights, isAwaitingLive,
  })
  const kind = snap.status.kind
  if (kind === 'home' || kind === 'base') {
    // A recap is the trip as it happened: a drive or jumpseat logged for later, within 12 hours of it, stays off, so the
    // recap reads as over (Stage 2 spec §8.2).
    if (snap.recap) {
      const happened = tripLegs(legs, snap.recap.tripId).filter((l) => l.end <= snap.t)
      return makeTripMap(happened, { ...options(false), isRecap: true, days: snap.recap.days })
    }
    // A night at home in the middle of a trip is still that trip, under way: its upcoming trip is the rest of it.
    const upcoming = snap.upcomingTrip
    // Waiting for it at base, the pilot's marker and the chip say base (the app's base waits design §3).
    return upcoming
      ? makeTripMap(tripLegs(legs, upcoming.tripId), { ...options(!snap.midTripAtHome), isWaitingAtBase: kind === 'base', days: upcoming.days })
      : null
  }
  const progress = snap.tripProgress
  const chosen = progress ? tripLegs(legs, progress.tripId) : []
  if (progress && chosen.length > 0) return makeTripMap(chosen, { ...options(false), days: progress.days })
  const current = snap.status.current
  return current && (isMove(current) || current.kind === 'drive') ? makeTripMap([current], options(false)) : null
}
