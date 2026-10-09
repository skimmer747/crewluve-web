import type { DutyEventKind, Iata, Move, Schedule } from './types'

export type PlaceKind = 'report' | 'turn' | 'layover' | 'base' | 'home'

export interface MoveLeg extends Move {
  kind: 'flight' | 'jumpseat'
}

export interface DriveLeg {
  kind: 'drive'
  id: string
  tripId: null
  from: Iata
  to: Iata
  toHome: boolean
  start: number
  end: number
  schedEnd: number
}

export interface PlaceLeg {
  kind: PlaceKind
  id: string
  tripId: string
  airport: Iata
  start: number
  end: number
}

export interface DutyLeg {
  kind: DutyEventKind
  id: string
  tripId: null
  title: string
  airport: Iata | null
  start: number
  end: number
  /** An event titled like a drive ("Driving the truck home") counts as a drive for homecomings. */
  driveLike: boolean
}

export type Leg = MoveLeg | DriveLeg | PlaceLeg | DutyLeg

export const isMove = (l: Leg): l is MoveLeg => l.kind === 'flight' || l.kind === 'jumpseat'

export const isDuty = (l: Leg): l is DutyLeg =>
  l.kind === 'reserve' || l.kind === 'hotStandby' || l.kind === 'training' || l.kind === 'event'

/** Where the pilot is once this leg ends. */
export function arrivalOf(l: Leg): Iata | null {
  if (isMove(l)) return l.arr
  if (l.kind === 'drive') return l.to
  return l.airport
}

/** Where this leg begins. */
export function departureOf(l: Leg): Iata | null {
  if (isMove(l)) return l.dep
  if (l.kind === 'drive') return l.from
  return l.airport
}

/**
 * A flight, jumpseat, drive, or drive-titled event that arrives at the pilot's home.
 * A drive uses its own `toHome` flag, the same rule the status uses, so the two can't disagree.
 */
export function isHomecomingMove(l: Leg, effHome: Iata | null): boolean {
  if (!effHome) return false
  if (l.kind === 'drive') return l.toHome
  const moving = isMove(l) || (l.kind === 'event' && l.driveLike)
  return moving && arrivalOf(l) === effHome
}

/** Scheduled end, for delay colors. Moves and drives keep one; other legs never shift. */
export function schedEndOf(l: Leg): number {
  return isMove(l) || l.kind === 'drive' ? l.schedEnd : l.end
}

/** Whole words only: "Drive home" and "Truck to SDF" are drives, "Daycare pickup" and "Card night" are not. */
export const DRIVE_TITLE = /\b(driv\w*|truck|car)\b/i

/** Duty's leg builder (PartnerStatusGenerator.swift:707-1065) on CrewLu Cloud data, sorted by start. */
export function buildLegs(s: Schedule): Leg[] {
  const legs: Leg[] = []
  const { base, effHome } = s.pilot // the pilot's own base, not the trips table's

  for (const trip of s.trips) {
    const flown = trip.dutyPeriods.filter((dp) => dp.flights.length > 0)
    flown.forEach((dp, i) => {
      const flights = dp.flights
      for (const f of flights) legs.push({ ...f, kind: 'flight' })
      for (let j = 1; j < flights.length; j++) {
        const prev = flights[j - 1]
        const next = flights[j]
        if (next.start > prev.end) {
          legs.push({ kind: 'turn', id: `${dp.id}|turn|${j}`, tripId: trip.id, airport: prev.arr, start: prev.end, end: next.start })
        }
      }
      // Report (show) time to the first departure: "at base", not "home" (fixes PartnerStatusGenerator.swift:1327).
      if (i === 0 && dp.start < flights[0].start) {
        legs.push({ kind: 'report', id: `${trip.id}|report`, tripId: trip.id, airport: flights[0].dep, start: dp.start, end: flights[0].start })
      }
      if (i > 0) {
        const previous = flown[i - 1].flights
        const landed = previous[previous.length - 1]
        if (flights[0].start > landed.end) {
          const kind: PlaceKind = landed.arr === effHome ? 'home' : landed.arr === base ? 'base' : 'layover'
          legs.push({ kind, id: `${dp.id}|gap`, tripId: trip.id, airport: landed.arr, start: landed.end, end: flights[0].start })
        }
      }
    })
  }

  for (const j of s.jumpseats) legs.push({ ...j, kind: 'jumpseat' })
  for (const c of s.commutes) {
    legs.push({ kind: 'drive', id: c.id, tripId: null, from: c.from, to: c.to, toHome: c.toHome, start: c.start, end: c.end, schedEnd: c.schedEnd })
  }
  for (const e of s.events) {
    legs.push({
      kind: e.kind, id: e.id, tripId: null, title: e.title, airport: e.airport, start: e.start, end: e.end,
      driveLike: e.kind === 'event' && DRIVE_TITLE.test(e.title),
    })
  }

  trimPlacesAtMoves(legs)
  return legs.filter((l) => l.end > l.start).sort((a, b) => a.start - b.start || a.end - b.end)
}

/** A layover/base/home/turn/report leg stops where a move begins inside it (SharedPilotStatus.swift:199-236). */
function trimPlacesAtMoves(legs: Leg[]): void {
  const moveStarts = legs.filter(isMove).map((m) => m.start)
  for (const leg of legs) {
    if (isMove(leg) || isDuty(leg) || leg.kind === 'drive') continue
    for (const start of moveStarts) {
      if (start > leg.start && start < leg.end) leg.end = start
    }
  }
}
