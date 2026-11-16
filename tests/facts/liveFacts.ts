import { EARTH_RADIUS_M, METERS_PER_MILE } from '../../src/map/greatCircle'
import type { LiveFlight, TrailPoint } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress, type MapFlight } from '../../src/map/mapFlight'
import type { MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, LIVE_CASES, type CaseFlight } from '../map/liveCases'
import { equatorFlight, EQUINOX, mark } from './factsTestData'

/**
 * A made-up real plane for the equator flight (Stage 3 spec §8), so the facts on a real path can be worked out by hand,
 * as the app's FactsTestData+Live. The schedule has the flight in the air from 10:15 to 13:15 UTC, and its plan
 * cruises at about 420 kt. The real plane leaves 0° E at 10:15 too, and flies a degree of longitude every 8 minutes
 * (450 kt): it's at 5° E at 10:55, 10° E at 11:35, 14° E at 12:07 and 20° E at 12:55. It's seen every 2 minutes from
 * 10:17. Made up, as the shared cases' flights are: no real flight's data.
 */

const MINUTE = 60_000

/** When the real plane leaves the ground: 10:15 UTC. */
export const LIVE_TAKEOFF = EQUINOX + 15 * MINUTE

/** The real plane takes this long for each degree of longitude, in ms. */
export const LIVE_MS_A_DEGREE = 480_000

/** One degree along the equator, in meters and in miles. */
export const METERS_A_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180
export const MILES_A_DEGREE = METERS_A_DEGREE / METERS_PER_MILE

/** `degrees` of longitude along the equator, in meters. */
export const meters = (degrees: number) => degrees * METERS_A_DEGREE

export const liveLongitude = (t: number) => (t - LIVE_TAKEOFF) / LIVE_MS_A_DEGREE

export const liveTime = (longitude: number) => LIVE_TAKEOFF + longitude * LIVE_MS_A_DEGREE

/** An ISO time as epoch ms. */
export const date = (iso: string) => Date.parse(iso)

export interface EquatorLiveOptions {
  /** Longitudes between which nobody saw it, both ends left out. */
  unseen?: [number, number]
  /** When it was seen on the ground at the arrival airport, for a flight that has landed. */
  landedAt?: number
  altitudeFt?: number | null
  typeCode?: string | null
  registration?: string | null
  /** How far north of the equator it flies at a longitude, for a path that leaves the great circle. */
  latitude?: (longitude: number) => number
}

/** The real plane's live data as Crewlu Cloud has it once it was last seen at `seenUntil`. */
export function equatorLive(
  seenUntil: number,
  { unseen, landedAt, altitudeFt = 36_000, typeCode = 'B763', registration = 'N370UP', latitude = () => 0 }: EquatorLiveOptions = {},
): LiveFlight {
  const trail: TrailPoint[] = []
  for (let t = LIVE_TAKEOFF + 2 * MINUTE; t <= seenUntil; t += 2 * MINUTE) {
    const longitude = liveLongitude(t)
    const isSeen = !unseen || !(unseen[0] < longitude && longitude < unseen[1])
    if (isSeen) trail.push({ time: t, place: { lat: latitude(longitude), lng: longitude }, altitudeFt })
  }
  const longitude = liveLongitude(seenUntil)
  const fix = landedAt != null
    ? { place: { lat: 0, lng: 20 }, altitudeFt: null, groundSpeedKt: 30, trackDeg: null, onGround: true, registration, typeCode, seenAt: landedAt }
    : { place: { lat: latitude(longitude), lng: longitude }, altitudeFt, groundSpeedKt: 450, trackDeg: 90, onGround: false, registration, typeCode, seenAt: seenUntil }
  return { legId: 'eq', callsign: 'TST1', state: landedAt == null ? 'airborne' : 'landed', fix, landedAt: landedAt ?? null, trail }
}

export interface EquatorLegOptions {
  east?: number
  id?: string
  /** Crewlu Cloud's clock minus this browser's, in ms. */
  clockOffset?: number
}

/** The equator flight with `live` for its real plane, as the status page hands it on at `now`: between the real plane's times. */
export function equatorLiveLeg(live: LiveFlight | null, now: number, { east = 20, id = 'eq', clockOffset = 0 }: EquatorLegOptions = {}): MapLeg {
  const scheduled = equatorFlight(0, east, EQUINOX, id)
  const flight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live, clockOffset)
  if (!flight) throw new Error('The equator flight has no plan')
  const progress = mapFlightProgress(flight, now)
  return { ...scheduled, start: progress.start, end: progress.end, flight }
}

/** Home, half a degree north of 14° E: the equator flight passes 35 mi from it. */
export const HOME_BY_THE_EQUATOR = mark('HOME', 0.5, 14)

/**
 * A path that leaves the great circle: north from 6° E to 2° N by 7° E, along it to 9° E, and back to the equator by
 * 10° E.
 */
export const dogLeg = (longitude: number) => Math.max(0, Math.min(longitude - 6, 10 - longitude, 1)) * 2

// The shared cases' flights (tests/fixtures/trip-map/live-cases.json) as the facts take them, as the app's LiveCaseLegs.

export type CaseMoment = CaseFlight['moments'][number]

/** The shared case of that name. */
export function caseNamed(name: string): CaseFlight {
  const found = LIVE_CASES.flights.find((f) => f.name === name)
  if (!found) throw new Error(`No shared case named ${name}`)
  return found
}

/** The case's moment at `time`, written as the app's tests write it: "13T12:45:00" is 2026-11-13 12:45 UTC. */
export function caseMoment(flightCase: CaseFlight, time: string): CaseMoment {
  const wanted = at(`2026-11-${time}Z`)
  const found = flightCase.moments.find((m) => at(m.at) === wanted)
  if (!found) throw new Error(`${flightCase.name} has no moment at ${time}`)
  return found
}

/** A flight case as the map's flight: its plan, its path and its record, made together. */
export function caseMapFlight(flightCase: CaseFlight, clockOffset = 0): MapFlight {
  const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight), clockOffset)
  if (!flight) throw new Error(`${flightCase.name} has no plan`)
  return flight
}

const caseMark = (code: string) => ({ code, city: code, place: airport(code), timeZone: null })

/**
 * A flight case as a leg of the map, between the gates at the times the case expects at `moment`: the real plane's,
 * as the status page hands them on.
 */
export function caseMapLeg(flightCase: CaseFlight, moment: CaseMoment, id = 'f1'): MapLeg {
  return {
    id, kind: 'flight', origin: caseMark(flightCase.from), destination: caseMark(flightCase.to),
    start: at(moment.start), end: at(moment.end), flightNumber: 'UPS207', flight: caseMapFlight(flightCase),
  }
}
