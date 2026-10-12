import { airlineColor, airlineIcon } from '../copy/airlines'
import type { ColorToken } from '../copy/colors'
import { flightNumberText } from '../copy/flight'
import type { GapKind, LegMoment } from '../copy/schedule'
import type { AirportIndex } from '../data/airports'
import type { Leg, MoveLeg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import type { IconName } from '../icons/iconPaths'
import { calendarDay } from '../time/zoned'

/** The legs the Schedule page lists: every leg but the report time, which Duty never sends the app (slice 3A §4.2). */
export function scheduleLegs(legs: readonly Leg[]): Leg[] {
  return legs.filter((l) => l.kind !== 'report')
}

/** What a row shows of its leg: TimelineRowView's title, icon and color, with slice 3A's three fixes (§4.5, §4.6). */
export interface RowLook {
  title: string
  icon: IconName
  color: ColorToken
  /** It ends at the pilot's home airport (the app's isHomebound): a green edge, and a hint for screen readers. */
  homeward: boolean
}

export function rowLook(leg: Leg, pilot: Pilot, airports: AirportIndex): RowLook {
  const homeward = endsAtHome(leg, pilot.effHome)
  switch (leg.kind) {
    case 'flight':
    case 'jumpseat':
      return { title: moveTitle(leg), ...moveLook(leg), homeward }
    case 'turn':
      return { title: `Turn ${where(leg.airport, airports)}`, icon: 'ClockCounterClockwise', color: 'orange', homeward }
    case 'layover':
      return { title: `Layover ${where(leg.airport, airports)}`, icon: 'Bed', color: 'yellow', homeward }
    case 'home':
      return { title: 'Home', icon: 'House', color: 'green', homeward }
    case 'base':
      // The app shows "On Duty" with a grey clock here. The site says what the status page says, with its buildings, in
      // the list's blue for things at base (decision 2).
      return { title: `At base in ${airports.city(leg.airport) ?? leg.airport}`, icon: 'Buildings', color: 'blue', homeward }
    case 'drive':
      return {
        title: `${leg.toHome ? 'Driving home' : 'Driving to work'}: ${leg.from} → ${leg.to}`,
        icon: 'Car',
        color: homeward ? 'green' : 'blue',
        homeward,
      }
    case 'reserve':
      return { title: labelled(leg.title, leg.airport, leg.location, airports), icon: 'ClockCountdown', color: 'red', homeward }
    case 'hotStandby':
      return { title: labelled(leg.title, leg.airport, leg.location, airports), icon: 'Lightning', color: 'orange', homeward }
    case 'training':
    case 'event': {
      const title = labelled(leg.title, leg.airport, leg.location, airports)
      if (homeward) return { title, icon: 'House', color: 'green', homeward }
      if (leg.airport != null && leg.airport === pilot.base) return { title, icon: 'Buildings', color: 'blue', homeward }
      return { title, icon: 'BookOpen', color: 'purple', homeward }
    }
    default:
      // The app's look for a leg it doesn't know. The report time never gets here: scheduleLegs leaves it out.
      return { title: 'On Duty', icon: 'Clock', color: 'gray', homeward }
  }
}

/**
 * The airline a row goes by: a trip flight's as the site works it out, UPS for a company flight, as the status page
 * does; a jumpseat's as entered for it, as in the app (§4.6).
 */
const rowAirline = (leg: MoveLeg) => (leg.kind === 'jumpseat' ? leg.enteredAirline : leg.airline)

/**
 * "UPS2961: RFD → SDF", "GND: SDF → IND" for ground transport, or just "RFD → SDF" when there's no usable flight
 * number. The flight is written as on the in-flight card (flightNumberText), in the form of Duty's formatFlightNumber.
 */
function moveTitle(leg: MoveLeg): string {
  const route = `${leg.dep} → ${leg.arr}`
  const flight = leg.ground ? 'GND' : flightNumberText(rowAirline(leg), leg.number)
  return flight ? `${flight}: ${route}` : route
}

/** The airline's icon and color, the app's green seat for a jumpseat without one, or the status page's blue car for ground transport. */
function moveLook(leg: MoveLeg): { icon: IconName; color: ColorToken } {
  if (leg.ground) return { icon: 'Car', color: 'blue' }
  const airline = rowAirline(leg)
  if (leg.kind === 'jumpseat' && !airline) return { icon: 'Seat', color: 'green' }
  return { icon: airlineIcon(airline), color: airlineColor(airline) }
}

/** "in Louisville" when the airport list has its city, else "at SDF", as the app picks the leg's city or its code. */
function where(airport: string, airports: AirportIndex): string {
  const city = airports.get(airport)?.city
  return city ? `in ${city}` : `at ${airport}`
}

/**
 * "RSV-A in Louisville" when the airport list has the city; else "at" the place as entered, an airport's code or free
 * text such as "Training Center", as the app writes it; else the label alone.
 */
function labelled(label: string, airport: string | null, location: string | null, airports: AirportIndex): string {
  const city = airport ? airports.get(airport)?.city : undefined
  if (city) return `${label} in ${city}`
  const place = location ?? airport
  return place ? `${label} at ${place}` : label
}

/**
 * The app's isHomebound: a flight or jumpseat that lands at home, or training or another event there. A drive goes by
 * the site's one rule for a drive home, its direction or its destination, as the status page does (§4.9).
 */
function endsAtHome(leg: Leg, home: string | null): boolean {
  if (leg.kind === 'drive') return leg.toHome
  if (!home) return false
  switch (leg.kind) {
    case 'flight':
    case 'jumpseat':
      return leg.arr === home
    case 'training':
    case 'event':
      return leg.airport === home
    default:
      return false
  }
}

/** One day of the list: the legs that start on that calendar day in the visitor's zone (slice 3A §4.3). */
export interface ScheduleDay {
  /** That calendar date as days since the epoch, as calendarDay gives it. */
  day: number
  legs: Leg[]
}

/** The list's days in order, each with its legs by start time (EventTimelineView.groupedSections). */
export function scheduleDays(legs: readonly Leg[], timeZone: string): ScheduleDay[] {
  const days: ScheduleDay[] = []
  for (const leg of [...legs].sort((a, b) => a.start - b.start)) {
    const day = calendarDay(leg.start, timeZone)
    const last = days[days.length - 1]
    if (last?.day === day) last.legs.push(leg)
    else days.push({ day, legs: [leg] })
  }
  return days
}

/** Whether a leg is happening at `now`: from its start to its end, both included (TimelineRowView's isActive). */
export const isHappening = (leg: Leg, now: number) => leg.start <= now && now <= leg.end

/** The next leg to start: the soonest that hasn't begun, the first of them on a tie (EventTimelineView.upNextLegID). */
export function nextLegId(legs: readonly Leg[], now: number): string | null {
  let next: Leg | null = null
  for (const leg of legs) if (leg.start > now && (!next || leg.start < next.start)) next = leg
  return next?.id ?? null
}

/** Where a leg stands at `now`: happening, the next leg, or neither (§4.9). */
export function legMoment(leg: Leg, now: number, nextId: string | null): LegMoment {
  if (isHappening(leg, now)) return 'happening'
  return leg.id === nextId ? 'next' : 'other'
}

/** A gap between two legs of a day, named by the leg after it (TimeGapView). */
export interface Gap {
  kind: GapKind
  ms: number
}

/** The gap before `next` when it starts a minute or more after `prev` ends (§4.10). */
export function gapBefore(prev: Leg, next: Leg): Gap | null {
  const ms = next.start - prev.end
  if (ms < 60_000) return null
  return { kind: next.kind === 'home' || next.kind === 'turn' || next.kind === 'layover' ? next.kind : 'gap', ms }
}

/**
 * The day the list opens at, as the app's screen scrolls when it opens: the next leg's day, else the happening leg's,
 * else today. Null when that day has no legs, and the list opens at the top (§4.11).
 */
export function openingDay(days: readonly ScheduleDay[], now: number, timeZone: string): number | null {
  const legs = days.flatMap((d) => d.legs)
  const leg = legs.find((l) => l.start > now) ?? legs.find((l) => isHappening(l, now))
  const target = calendarDay(leg?.start ?? now, timeZone)
  return days.some((d) => d.day === target) ? target : null
}
