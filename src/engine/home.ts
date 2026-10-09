import { MINUTE } from '../time/zoned'
import { departureOf, isHomecomingMove, type Leg, type MoveLeg } from './legs'
import { resolveStatus } from './status'
import { arrivalTarget, type ArrivalTarget } from './targets'
import type { Iata, Pilot } from './types'

export interface LeaveTarget {
  label: 'leavesHome' | 'leaves'
  time: number
  schedTime: number
  viaDrive: boolean
  /** A commuter whose next trip leaves from somewhere other than home, with no commute logged. */
  commuterUnlogged: boolean
  /** Where the departure happens. */
  airport: Iata | null
  /** time − schedTime in minutes; positive means late. */
  delayMin: number
}

/** The first trip flight (not a standalone jumpseat) departing after t. */
export function nextTripFlight(legs: Leg[], t: number): MoveLeg | null {
  return (legs.find((l) => l.kind === 'flight' && l.start > t) as MoveLeg | undefined) ?? null
}

/** When the pilot next leaves home (spec §6.6). Only meaningful while the status is Home. */
export function leaveTarget(legs: Leg[], pilot: Pilot, t: number): LeaveTarget | null {
  const home = pilot.effHome
  const nf = nextTripFlight(legs, t)
  const candidate = legs.find(
    (l) =>
      l.start > t &&
      (!nf || l.start < nf.start) &&
      ((l.kind === 'drive' && !l.toHome) ||
        (l.kind === 'jumpseat' && l.dep === home) ||
        ((l.kind === 'hotStandby' || l.kind === 'training' || l.kind === 'event') && l.airport != null && l.airport === pilot.base)),
  )
  if (candidate) {
    const viaDrive = candidate.kind === 'drive'
    const departsHome = viaDrive || (candidate.kind === 'jumpseat' && candidate.dep === home)
    return {
      label: departsHome ? 'leavesHome' : 'leaves',
      time: candidate.start,
      schedTime: candidate.start,
      viaDrive,
      commuterUnlogged: false,
      airport: departureOf(candidate),
      delayMin: 0,
    }
  }
  if (!nf) return null
  return {
    label: nf.dep === home ? 'leavesHome' : 'leaves',
    time: nf.start,
    schedTime: nf.schedStart,
    viaDrive: false,
    commuterUnlogged: home != null && nf.dep !== home,
    airport: nf.dep,
    delayMin: Math.round((nf.start - nf.schedStart) / MINUTE),
  }
}

/** {HB}: when the next trip brings the pilot home, if that is known (spec §6.6 step 8). */
export function nextTripHomecoming(legs: Leg[], pilot: Pilot, t: number): ArrivalTarget | null {
  const nf = nextTripFlight(legs, t)
  if (!nf) return null
  const target = arrivalTarget(legs, pilot, resolveStatus(legs, pilot, nf.start), nf.start)
  return target?.label === 'home' ? target : null
}

/** End of the last real arrival home at or before t (spec §6.8), skipping passes through home mid-trip. */
export function lastHomeArrival(legs: Leg[], pilot: Pilot, t: number): number | null {
  let best: number | null = null
  for (const l of legs) {
    if (l.end > t || !isHomecomingMove(l, pilot.effHome)) continue
    if (l.tripId && legs.some((m) => m !== l && m.tripId === l.tripId && m.start >= l.end)) continue
    if (best == null || l.end > best) best = l.end
  }
  return best
}
