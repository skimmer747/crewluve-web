import type { AirportIndex } from '../data/airports'
import type { LeaveTarget } from '../engine/home'
import { DRIVE_TITLE, type DutyLeg, type MoveLeg } from '../engine/legs'
import { DELAY_THRESHOLD_MIN, type Snapshot } from '../engine/snapshot'
import type { ArrivalTarget } from '../engine/targets'
import type { IconName } from '../icons/iconPaths'
import { airlineColor, airlineIcon } from './airlines'
import type { ColorToken } from './colors'

export interface Visual {
  icon: IconName
  color: ColorToken
}

export interface CardVisual extends Visual {
  title: string
}

/** Status icon and color (NarrativeCardView.swift:772-806). */
export function statusVisual(s: Snapshot): Visual {
  const late = s.delay != null && s.delay.minutes > 0
  const early = s.delay != null && s.delay.minutes < 0
  switch (s.status.kind) {
    case 'home':
      return { icon: 'House', color: 'green' }
    case 'commutingHome':
      return { icon: 'Airplane', color: 'blue' }
    case 'drivingHome':
      return { icon: 'Car', color: 'green' }
    case 'drivingToWork':
    case 'ground':
      return { icon: 'Car', color: 'blue' }
    case 'inFlight': {
      const airline = (s.status.current as MoveLeg | null)?.airline ?? null
      return { icon: airlineIcon(airline), color: early ? 'green' : late ? 'orange' : airlineColor(airline) }
    }
    case 'turn':
      return { icon: 'ArrowsClockwise', color: early ? 'green' : 'orange' }
    case 'layover':
      return { icon: 'Bed', color: early ? 'green' : late ? 'orange' : 'purple' }
    case 'base':
      return { icon: 'Buildings', color: 'purple' }
    case 'reserve':
      return { icon: 'ClockCountdown', color: 'red' }
    case 'hotStandby':
      return { icon: 'Lightning', color: 'orange' }
    case 'training':
    case 'event': {
      const title = (s.status.current as DutyLeg | null)?.title ?? ''
      return { icon: DRIVE_TITLE.test(title) ? 'Car' : 'BookOpen', color: 'purple' }
    }
    case 'off':
      return { icon: 'MapPin', color: 'secondary' }
    default:
      return { icon: 'Circle', color: 'gray' }
  }
}

/** The away countdown card (PilotStatusView.swift:133-150, plus the web-only "Released In"). */
export function arrivalCard(s: Snapshot, a: ArrivalTarget, airports: AirportIndex): CardVisual {
  if (a.label === 'released') return { title: 'Released In', ...statusVisual(s) }
  const title =
    a.label === 'home' ? 'Back Home In'
      : a.label === 'base' ? 'Back at Base In'
        : `${airports.city(a.airport) ?? 'Trip End'} In`
  return { title, icon: a.label === 'home' ? 'House' : 'AirplaneLanding', color: a.delayMin >= DELAY_THRESHOLD_MIN ? 'red' : 'green' }
}

/** The at-home countdown card (PilotStatusView.swift:102-114, 306-317). */
export function leaveCard(l: LeaveTarget): CardVisual {
  const color: ColorToken =
    l.viaDrive ? 'blue'
      : l.delayMin >= DELAY_THRESHOLD_MIN ? 'orange'
        : l.delayMin <= -DELAY_THRESHOLD_MIN ? 'green'
          : 'blue'
  return { title: l.label === 'leavesHome' ? 'Leaves Home In' : 'Leaves In', icon: l.viaDrive ? 'Car' : 'AirplaneTakeoff', color }
}

export interface BadgeVisual extends Visual {
  label: string
}

/** The upcoming trip card's type badge. CrewLu Cloud data only ever makes a line trip (UpcomingTripCard.typeBadge; slice 2A §4). */
export const LINE_TRIP_BADGE: Readonly<BadgeVisual> = { label: 'Line Trip', icon: 'Airplane', color: 'blue' }

/** The upcoming trip card's delay badge: "Delayed" in orange, or "Early" in green (UpcomingTripCard.delayBadge). */
export function delayBadge(minutes: number): BadgeVisual {
  return minutes < 0 ? { label: 'Early', icon: 'Clock', color: 'green' } : { label: 'Delayed', icon: 'ClockCountdown', color: 'orange' }
}
