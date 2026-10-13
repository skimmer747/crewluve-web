import { flightNumberText } from '../copy/flight'
import { trackingFlightNumber, trackingLinks, type TrackingLinks } from '../copy/tracking'
import type { AirportIndex } from '../data/airports'
import { isMove } from '../engine/legs'
import type { Snapshot } from '../engine/snapshot'
import type { GeoPoint } from './flightMapGeometry'

/** One end of the flight: its code, its city, and its place and zone when the airport list has them. */
export interface FlightEnd {
  code: string
  /** The airport list's city, or the code when it has none. */
  city: string
  /** Null when the airport isn't in the list: the map shows its fallback then (slice 2C §4.8). */
  place: GeoPoint | null
  /** Null when the zone isn't known: the map leaves out that end's time. */
  timeZone: string | null
}

/** What the in-flight card shows (slice 2C §7), worked out by the screen while the pilot is in the air. */
export interface InFlightFacts {
  dep: FlightEnd
  arr: FlightEnd
  /** The estimated departure and landing, which move the plane and decide the sky (slice 2C §10 item 1). */
  start: number
  end: number
  /** The scheduled block time, shown under the map as the app shows it. */
  blockMs: number
  /**
   * How late (positive) or early the departure is, when that's 15 minutes or more; else null. It's the snapshot's
   * delay, which the sentence reads too (Part C leftovers §4.2).
   */
  delayMinutes: number | null
  /** The info bar's flight number in the pilot's Duty app's form, or null without digits. */
  flightNumber: string | null
  /** The popup's header: the airline's ICAO code and the digits, or the info bar's text when there's no such form. */
  trackingNumber: string | null
  /** The tracking sites' pages, or null when there's no tracking flight number. */
  links: TrackingLinks | null
}

function flightEnd(code: string, airports: AirportIndex): FlightEnd {
  const airport = airports.get(code)
  return {
    code,
    city: airports.city(code) ?? code,
    place: airport ? { lat: airport.lat, lng: airport.lng } : null,
    timeZone: airports.tz(code),
  }
}

/**
 * The card's facts while the pilot is in the air, on a flight or a jumpseat, or null otherwise: on the ground, and
 * during ground transport, which has its own status (slice 2C §3).
 */
export function inFlightFacts(snap: Snapshot, airports: AirportIndex): InFlightFacts | null {
  const leg = snap.status.current
  if (snap.status.kind !== 'inFlight' || !leg || !isMove(leg)) return null
  const flightNumber = flightNumberText(leg.airline, leg.number)
  return {
    dep: flightEnd(leg.dep, airports),
    arr: flightEnd(leg.arr, airports),
    start: leg.start,
    end: leg.end,
    blockMs: leg.schedEnd - leg.schedStart,
    delayMinutes: snap.delay?.minutes ?? null,
    flightNumber,
    trackingNumber: trackingFlightNumber(leg.airline, leg.number) ?? flightNumber,
    links: trackingLinks(leg.airline, leg.number),
  }
}

/** How far along the flight is at `now`, from 0 at departure to 1 at landing; null outside the flight (slice 2C §4.6). */
export function flightProgress(facts: InFlightFacts, now: number): number | null {
  if (now < facts.start || now > facts.end || facts.end <= facts.start) return null
  return Math.min(Math.max((now - facts.start) / (facts.end - facts.start), 0), 1)
}
