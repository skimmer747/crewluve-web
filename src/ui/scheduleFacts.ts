import { airlineColor, airlineIcon } from '../copy/airlines'
import type { ColorToken } from '../copy/colors'
import type { AirportIndex } from '../data/airports'
import type { Leg, MoveLeg } from '../engine/legs'
import type { Pilot } from '../engine/types'
import type { IconName } from '../icons/iconPaths'

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
      // The app shows "On Duty" with a grey clock here; the site says what the status page says (decision 2).
      return { title: `At base in ${airports.city(leg.airport) ?? leg.airport}`, icon: 'Buildings', color: 'blue', homeward }
    case 'drive':
      return {
        title: `${leg.toHome ? 'Driving home' : 'Driving to work'}: ${leg.from} → ${leg.to}`,
        icon: 'Car',
        color: homeward ? 'green' : 'blue',
        homeward,
      }
    case 'reserve':
      return { title: labelled(leg.title, leg.airport, airports), icon: 'ClockCountdown', color: 'red', homeward }
    case 'hotStandby':
      return { title: labelled(leg.title, leg.airport, airports), icon: 'Lightning', color: 'orange', homeward }
    case 'training':
    case 'event': {
      const title = labelled(leg.title, leg.airport, airports)
      if (homeward) return { title, icon: 'House', color: 'green', homeward }
      if (leg.airport != null && leg.airport === pilot.base) return { title, icon: 'Buildings', color: 'blue', homeward }
      return { title, icon: 'BookOpen', color: 'purple', homeward }
    }
    default:
      // The app's look for a leg it doesn't know. The report time never gets here: scheduleLegs leaves it out.
      return { title: 'On Duty', icon: 'Clock', color: 'gray', homeward }
  }
}

/** "UPS2961: RFD → SDF", or just "RFD → SDF" when there's no usable flight number. */
function moveTitle(leg: MoveLeg): string {
  const route = `${leg.dep} → ${leg.arr}`
  const flight = flightLabel(leg)
  return flight ? `${flight}: ${route}` : route
}

/**
 * The flight as Duty writes it for the app (PartnerStatusGenerator.formatFlightNumber): "GND" for ground transport;
 * the airline as entered and the number, "AA1234"; "UPS2961" for a company flight; else a jumpseat's number alone.
 */
function flightLabel(leg: MoveLeg): string | null {
  if (leg.ground) return 'GND'
  if (leg.number == null) return null
  if (leg.enteredAirline) return `${leg.enteredAirline}${leg.number}`
  if (leg.kind === 'flight' && leg.airline === '5X') return `UPS${leg.number}`
  return leg.number
}

/**
 * A trip flight goes by the airline the site works out, as the status page does; a jumpseat by the airline entered
 * for it, else the app's green seat. Ground transport is the status page's blue car.
 */
function moveLook(leg: MoveLeg): { icon: IconName; color: ColorToken } {
  if (leg.ground) return { icon: 'Car', color: 'blue' }
  if (leg.kind === 'jumpseat') {
    return leg.enteredAirline
      ? { icon: airlineIcon(leg.enteredAirline), color: airlineColor(leg.enteredAirline) }
      : { icon: 'Seat', color: 'green' }
  }
  return { icon: airlineIcon(leg.airline), color: airlineColor(leg.airline) }
}

/** "in Louisville" when the airport list has its city, else "at SDF", as the app picks the leg's city or its code. */
function where(airport: string, airports: AirportIndex): string {
  const city = airports.get(airport)?.city
  return city ? `in ${city}` : `at ${airport}`
}

/** "RSV-A in Louisville", "RSV-A at XYZ", or the label alone when there's no airport. */
function labelled(label: string, airport: string | null, airports: AirportIndex): string {
  return airport ? `${label} ${where(airport, airports)}` : label
}

/** The app's isHomebound: a flight, jumpseat or drive that lands at home, or training or another event there. */
function endsAtHome(leg: Leg, home: string | null): boolean {
  if (!home) return false
  switch (leg.kind) {
    case 'flight':
    case 'jumpseat':
      return leg.arr === home
    case 'drive':
      return leg.to === home
    case 'training':
    case 'event':
      return leg.airport === home
    default:
      return false
  }
}
