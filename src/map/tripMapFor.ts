import type { AirportIndex } from '../data/airports'
import { isMove, type Leg } from '../engine/legs'
import type { Snapshot } from '../engine/snapshot'
import { HOUR } from '../time/zoned'
import { makeTripMap, type TripMap } from './tripMap'

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

/** A trip's own flights and jumpseats, and the drives and standalone jumpseats within 12 hours of them. */
export function tripLegs(legs: Leg[], tripId: string): Leg[] {
  const own = legs.filter((l) => isMove(l) && l.tripId === tripId)
  if (own.length === 0) return []
  const first = Math.min(...own.map((l) => l.start)) - COMMUTE_WINDOW
  const last = Math.max(...own.map((l) => l.end)) + COMMUTE_WINDOW
  const commutes = legs.filter((l) => (l.kind === 'drive' || (isMove(l) && l.tripId == null)) && l.start >= first && l.end <= last)
  return [...own, ...commutes].sort((a, b) => a.start - b.start)
}

/** The status page's trip map, or null when there's nothing to draw. */
export function tripMapFor(snap: Snapshot, legs: Leg[], airports: AirportIndex): TripMap | null {
  const options = (isNextTrip: boolean) => ({ isNextTrip, home: snap.pilot.effHome, now: snap.t, airports })
  const kind = snap.status.kind
  if (kind === 'home' || kind === 'base') {
    if (snap.recap) return makeTripMap(tripLegs(legs, snap.recap.tripId), { ...options(false), isRecap: true, days: snap.recap.days })
    // A night at home in the middle of a trip is still that trip, under way: its upcoming trip is the rest of it.
    const upcoming = snap.upcomingTrip
    return upcoming ? makeTripMap(tripLegs(legs, upcoming.tripId), { ...options(!snap.midTripAtHome), days: upcoming.days }) : null
  }
  const progress = snap.tripProgress
  const chosen = progress ? tripLegs(legs, progress.tripId) : []
  if (progress && chosen.length > 0) return makeTripMap(chosen, { ...options(false), days: progress.days })
  const current = snap.status.current
  return current && (isMove(current) || current.kind === 'drive') ? makeTripMap([current], options(false)) : null
}
