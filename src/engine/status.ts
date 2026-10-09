import { arrivalOf, isMove, type Leg } from './legs'
import type { Iata, Pilot } from './types'

export type StatusKind =
  | 'home' | 'commutingHome' | 'drivingHome' | 'drivingToWork' | 'inFlight' | 'ground'
  | 'turn' | 'layover' | 'base' | 'reserve' | 'hotStandby' | 'training' | 'event' | 'off' | 'unknown'

export interface Status {
  kind: StatusKind
  /** Where the pilot is: the departure airport while moving, the arrival of the last leg that has one in a gap. */
  airport: Iata | null
  /** The leg covering now, if any. */
  current: Leg | null
  /** The last leg that ended at or before now. */
  previous: Leg | null
  /** The first leg starting after now. */
  next: Leg | null
}

// When legs overlap: a move beats a drive, a drive beats a place, a place beats a duty event (spec §6.4).
const RANK: Record<Leg['kind'], number> = {
  flight: 0, jumpseat: 0, drive: 1, report: 2, turn: 2, layover: 2, base: 2, home: 2,
  reserve: 3, hotStandby: 3, training: 3, event: 3,
}

/** Crewluve's TripStateResolver, delay-aware and with the off-trip fix. `legs` must be sorted by start. */
export function resolveStatus(legs: Leg[], pilot: Pilot, t: number): Status {
  let current: Leg | null = null
  let previous: Leg | null = null
  /** The last ended leg that says where the pilot is. An event with no airport doesn't move them anywhere (§6.4 rule 5). */
  let located: Leg | null = null
  let next: Leg | null = null
  for (const leg of legs) {
    if (leg.start <= t && t < leg.end) {
      if (!current || RANK[leg.kind] < RANK[current.kind]) current = leg
    } else if (leg.end <= t) {
      if (!previous || leg.end >= previous.end) previous = leg
      if (arrivalOf(leg) != null && (!located || leg.end >= located.end)) located = leg
    } else if (!next) {
      next = leg
    }
  }

  if (current) return { ...covering(current, pilot), current, previous, next }
  if (!previous || !located) return { kind: 'home', airport: pilot.effHome, current, previous, next }

  const loc = arrivalOf(located)
  const result = (kind: StatusKind): Status => ({ kind, airport: loc, current, previous, next })
  if (previous.tripId && next?.tripId === previous.tripId) return result('turn')
  if (loc != null && loc === pilot.effHome) return result('home')
  if (next?.kind === 'jumpseat' && next.arr === pilot.effHome) return result('commutingHome')
  if (loc != null && loc === pilot.base) return result('base')
  return result('off')
}

function covering(leg: Leg, pilot: Pilot): Pick<Status, 'kind' | 'airport'> {
  if (isMove(leg)) return { kind: leg.ground ? 'ground' : 'inFlight', airport: leg.dep }
  switch (leg.kind) {
    case 'drive':
      return { kind: leg.toHome ? 'drivingHome' : 'drivingToWork', airport: leg.from }
    case 'report':
      return { kind: leg.airport === pilot.base ? 'base' : 'off', airport: leg.airport }
    case 'turn':
    case 'layover':
    case 'base':
    case 'home':
      return { kind: leg.kind, airport: leg.airport }
    default:
      return { kind: leg.kind, airport: leg.airport ?? pilot.base }
  }
}
