import { enteredAirline, normalizeFlightNumber, toIata } from '../engine/normalize'
import type { Commute, DutyEvent, DutyEventKind, DutyPeriod, Move, Schedule, Trip } from '../engine/types'
import type { StoredSummary } from './store'
import { readSummary, type PartnerSummary, type SummaryLeg } from './summary'

const MINUTE = 60_000
/** "UPS2961", "DL1180", "5X2961" or "2961": an airline's code, if any, then the number. */
const FLIGHT_NUMBER = /^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])?(\d+)$/
/** Where CrewLu puts the time between two of a trip's duty periods; a turn is the time inside one. */
const BETWEEN_DUTY_PERIODS: ReadonlySet<string> = new Set(['layover', 'home', 'base'])
const EVENT_TITLES: Record<DutyEventKind, string> = { reserve: 'Reserve', hotStandby: 'Hot Standby', training: 'Training', event: 'Manual Event' }

/**
 * One summary as the Schedule the website's engine reads (piece 5a §6), so the live page and the demo share one
 * engine: buildLegs makes the turns and the nights between duty periods again from the flights, by the rules CrewLu
 * used to write them (PartnerStatusGenerator.swift, buildTripLegs).
 */
export function toSchedule(summary: PartnerSummary, fetchedAt: number): Schedule {
  const base = toIata(summary.base)
  const home = toIata(summary.home)
  const effHome = home ?? base
  const byTrip = new Map<string, SummaryLeg[]>()
  const jumpseats: Move[] = []
  const commutes: Commute[] = []
  const events: DutyEvent[] = []
  for (const leg of summary.legs) {
    if (leg.end <= leg.start) continue
    if (leg.tripId && (leg.type === 'flight' || leg.type === 'turn' || BETWEEN_DUTY_PERIODS.has(leg.type))) {
      byTrip.set(leg.tripId, [...(byTrip.get(leg.tripId) ?? []), leg])
    } else if (leg.type === 'flight') {
      const move = toMove(leg, null)
      if (move) jumpseats.push(move)
    } else if (leg.type === 'drive') {
      const commute = toCommute(leg, effHome)
      if (commute) commutes.push(commute)
    } else if (leg.type === 'reserve' || leg.type === 'hotStandby' || leg.type === 'event') {
      events.push(toEvent(leg, leg.type))
    }
  }
  const trips = [...byTrip].map(([id, legs]) => toTrip(id, legs)).filter((t): t is Trip => t != null).sort((a, b) => a.start - b.start)
  return {
    pilot: { firstName: summary.name, base, home, effHome },
    trips,
    jumpseats,
    commutes,
    events,
    fetchedAt,
    newestUpdatedAt: summary.lastUpdated,
    empty: false,
  }
}

/** Before the pilot's first summary: nothing to show, which the page tells as waiting (piece 5a §5). */
export function waitingSchedule(fetchedAt: number): Schedule {
  return {
    pilot: { firstName: null, base: null, home: null, effHome: null },
    trips: [],
    jumpseats: [],
    commutes: [],
    events: [],
    fetchedAt,
    newestUpdatedAt: null,
    empty: true,
  }
}

/** What a stored answer shows: the pilot's summary, or waiting before their first. Throws for one this site can't read. */
export function scheduleFromStored(stored: StoredSummary): { schedule: Schedule; summary: PartnerSummary | null } {
  if (stored.status == null) return { schedule: waitingSchedule(stored.checkedAt), summary: null }
  const summary = readSummary(stored.status, stored.partnerId)
  if (!summary) throw new Error('This summary could not be read')
  return { schedule: toSchedule(summary, stored.checkedAt), summary }
}

/**
 * A trip's flights, in duty periods split wherever CrewLu put a layover, home or base between two of them. Each duty
 * period starts with its first flight, so no report leg is made (as in Crewluve). The trip runs from its first leg's
 * start to its last leg's end; its length is CrewLu's, and tripDays counts one under a day (0) from the dates.
 */
function toTrip(id: string, legs: SummaryLeg[]): Trip | null {
  const flights = legs.filter((l) => l.type === 'flight').sort((a, b) => a.start - b.start)
  const nights = legs.filter((l) => BETWEEN_DUTY_PERIODS.has(l.type))
  const groups: SummaryLeg[][] = []
  flights.forEach((flight, i) => {
    const prev = flights[i - 1]
    const night = prev != null && nights.some((n) => n.start < flight.start && n.end > prev.end)
    if (!prev || night) groups.push([flight])
    else groups[groups.length - 1].push(flight)
  })
  const dutyPeriods: DutyPeriod[] = []
  for (const group of groups) {
    const moves = group.map((l) => toMove(l, id)).filter((m): m is Move => m != null)
    if (moves.length === 0) continue
    dutyPeriods.push({ id: `${id}|dp|${dutyPeriods.length}`, tripId: id, start: moves[0].start, end: moves[moves.length - 1].end, flights: moves })
  }
  if (dutyPeriods.length === 0) return null
  const moves = dutyPeriods.flatMap((dp) => dp.flights)
  return {
    id,
    start: Math.min(...legs.map((l) => l.start), ...moves.map((m) => m.start)),
    end: Math.max(...legs.map((l) => l.end), ...moves.map((m) => m.end)),
    days: Math.max(0, ...legs.map((l) => l.tripTotalDays ?? 0)),
    dutyPeriods,
  }
}

/**
 * A flight leg as a Move. Its delay moves both ends, as Crewluve moves them (TripStateResolver.effectiveStart and
 * effectiveEnd), and the times CrewLu wrote are the schedule. CrewLu writes a company flight's number as "UPS" and the
 * digits, and an airline's as its code and the digits (formatFlightNumber, displayFlightNumber).
 */
function toMove(leg: SummaryLeg, tripId: string | null): Move | null {
  const dep = toIata(leg.departureAirport)
  const arr = toIata(leg.arrivalAirport)
  if (!dep || !arr) return null
  const shift = (leg.delayMinutes ?? 0) * MINUTE
  const raw = (leg.flightNumber ?? '').toUpperCase()
  const entered = enteredAirline(leg.airlineCode)
  const match = FLIGHT_NUMBER.exec(entered && raw.startsWith(entered) ? raw.slice(entered.length) : raw)
  const prefix = match?.[1] ?? null
  return {
    id: leg.id,
    tripId,
    dep,
    arr,
    start: leg.start + shift,
    end: leg.end + shift,
    schedStart: leg.start,
    schedEnd: leg.end,
    // An all-digit number with no airline is a company flight, as the rows' rule has it (resolveAirline).
    airline: entered ?? (match ? (prefix == null || prefix === 'UPS' ? '5X' : prefix) : null),
    enteredAirline: entered,
    number: match ? normalizeFlightNumber(match[2]) : null,
    // A jumpseat always rides; in a trip, a commercial deadhead has an airline code, and a company one may say CML.
    deadhead: tripId == null || entered != null || raw.endsWith('CML'),
    ground: raw === 'GND',
  }
}

/** A drive, home when it ends at home or CrewLu called it the drive home: the rows' rule (normalize.ts). */
function toCommute(leg: SummaryLeg, effHome: string | null): Commute | null {
  const from = toIata(leg.departureAirport)
  const to = toIata(leg.arrivalAirport)
  if (!from || !to) return null
  const toHome = to === effHome || leg.label === 'Driving home'
  return { id: leg.id, from, to, toHome, start: leg.start, end: leg.end, schedEnd: leg.end, sourceTripId: null }
}

/** A reserve, hot standby or event. CrewLu sends training as an event whose id starts te-. */
function toEvent(leg: SummaryLeg, type: 'reserve' | 'hotStandby' | 'event'): DutyEvent {
  const kind: DutyEventKind = type === 'event' && leg.id.startsWith('te-') ? 'training' : type
  return {
    id: leg.id,
    kind,
    title: leg.label ?? EVENT_TITLES[kind],
    airport: toIata(leg.airportCode),
    location: leg.airportCode,
    start: leg.start,
    end: leg.end,
  }
}
