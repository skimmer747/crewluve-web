import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'
import { makeFlightPath, type FlightPath } from '../../src/map/flightPath'
import { makeFlightPlan, type FlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, type FlightRecord } from '../../src/map/flightRecord'
import { distanceMeters, METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { readLiveFlight } from '../../src/partner/liveAnswer'

/**
 * The real plane's shared cases (Stage 3 spec §16.1): tests/fixtures/trip-map/live-cases.json, a copy of the app's
 * CrewluvTests/Fixtures/TripMap/live-cases.json, which its scripts/live-cases/generate.mjs writes. Copy it, never edit
 * it: the app runs the same file. Distances are nautical miles, places [latitude, longitude], times ISO 8601, and a
 * `flight` is one entry of partner_live's `flights`, as the door sends it.
 */

export interface LiveCases {
  about: string
  constants: {
    taxiOutMinutes: number
    taxiInMinutes: number
    shortestCruiseMinutes: number
    descentDistanceNm: number
    descentSpeedKt: number
    freshSeconds: number
    airportRadiusNm: number
    onScheduleMinutes: number
    unseenGapMinutes: number
    firstPointRadiusNm: number
    ownSpeedLeastMinutes: number
    ownSpeedLeastShare: number
    ownSpeedMostShare: number
    ownSpeedAheadMinutes: number
    returnClimbFeet: number
    restartGapMinutes: number
    windowOpensMinutesBefore: number
    windowClosesHoursAfter: number
    windowKeepsMinutes: number
    windowEndsHoursAfter: number
  }
  airports: Record<string, [number, number]>
  plans: {
    name: string
    note: string
    from: string
    to: string
    departure: string
    arrival: string
    lengthNm: number
    takeoff: string
    touchdown: string
    isShort: boolean
    speedKt: number
    timeToFly: { distanceNm: number; seconds: number }[]
    distanceLeft: { minutes: number; distanceNm: number }[]
  }[]
  flights: CaseFlight[]
  labels: { phase: string; gapMinutes: number | null; label: string | null }[]
  gaps: { aheadSeconds: number; gapMinutes: number }[]
  windows: { name: string; departure: string; arrival: string; at: string; flight: unknown; isOpen: boolean }[]
}

export interface CaseFlight {
  name: string
  note: string
  from: string
  to: string
  departure: string
  arrival: string
  /** One entry of partner_live's `flights`, or null where the door answers none for the leg. */
  flight: unknown
  path: {
    isReal: boolean
    lengthNm: number
    flownNm: number
    ownSpeedKt: number | null
    stretchKinds: string[]
    seenNm: number
    unseenNm: number
    plannedNm: number
  }
  /** The speed the estimate, the estimated plane and the ghost fly before the descent. */
  flownSpeedKt: number
  moments: {
    at: string
    note: string
    phase: string
    touchdown: string | null
    liveArrival: string | null
    gapMinutes: number | null
    label: string | null
    planeAlongNm: number | null
    plane: [number, number] | null
    ghostAlongNm: number | null
    ghost: [number, number] | null
    start: string
    end: string
  }[]
  record: {
    takeoff: string | null
    touchdown: string
    places: { at: string; alongNm: number; point: [number, number] }[]
    times: { alongNm: number; at: string }[]
  } | null
}

export const LIVE_CASES: LiveCases = JSON.parse(readFileSync(join(import.meta.dirname, '../fixtures/trip-map/live-cases.json'), 'utf8'))

/** An ISO time as epoch ms. */
export const at = (iso: string) => Date.parse(iso)
/** Meters as nautical miles. */
export const nm = (meters: number) => meters / METERS_PER_NM
/** Meters a second as knots. */
export const knots = (metersPerSecond: number) => (metersPerSecond * 3600) / METERS_PER_NM

export function airport(code: string): GeoPoint {
  const place = LIVE_CASES.airports[code]
  if (!place) throw new Error(`The cases have no airport ${code}`)
  return { lat: place[0], lng: place[1] }
}

/** A case's flight as this site reads it from the door, or null where there's none. */
export function caseFlight(raw: unknown): LiveFlight | null {
  if (raw == null) return null
  const flight = readLiveFlight(raw)
  if (!flight) throw new Error('The door reader refused a flight of the shared cases')
  return flight
}

/** A flight case as this site's types: its plan, its live data, and the path and record made from them. */
export function made(flightCase: CaseFlight): { plan: FlightPlan; flight: LiveFlight | null; path: FlightPath; record: FlightRecord | null } {
  const origin = airport(flightCase.from)
  const destination = airport(flightCase.to)
  const plan = makeFlightPlan(at(flightCase.departure), at(flightCase.arrival), distanceMeters(origin, destination))
  if (!plan) throw new Error(`${flightCase.name} has no plan`)
  const flight = caseFlight(flightCase.flight)
  const path = makeFlightPath(origin, destination, flight)
  return { plan, flight, path, record: makeFlightRecord(path, plan) }
}

/** The cases' own tolerances (their `about`): 0.01 nm, 0.05 s, 0.0001 of a degree, 0.01 kt. */
export const NEAR = { nm: 0.01, ms: 50, degrees: 0.0001, kt: 0.01 }

/** `actual` within `tolerance` of `expected`, saying what was compared when it isn't. */
export function expectNear(actual: number, expected: number, tolerance: number, what: string) {
  expect(Math.abs(actual - expected), `${what}: ${actual}, expected ${expected}`).toBeLessThanOrEqual(tolerance)
}

/** Both null, or both there and within `tolerance`. */
export function expectNearOrNull(actual: number | null, expected: number | null, tolerance: number, what: string) {
  expect(actual == null, `${what}: ${actual}, expected ${expected}`).toBe(expected == null)
  if (actual != null && expected != null) expectNear(actual, expected, tolerance, what)
}

/** A place within 0.0001 of a degree, or both null. */
export function expectPlace(actual: GeoPoint | null, expected: [number, number] | null, what: string) {
  expect(actual == null, `${what}: ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`).toBe(expected == null)
  if (!actual || !expected) return
  expectNear(actual.lat, expected[0], NEAR.degrees, `${what}, latitude`)
  expectNear(actual.lng, expected[1], NEAR.degrees, `${what}, longitude`)
}
