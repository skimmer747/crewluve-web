import { flightNumberText } from '../copy/flight'
import type { AirportIndex } from '../data/airports'
import { isMove, type Leg, type PlaceLeg } from '../engine/legs'
import type { Iata } from '../engine/types'
import { scheduledFraction, scheduledTime } from './flightProgress'
import { distanceMeters, METERS_PER_MILE, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { calendarDay } from '../time/zoned'
import { aimFractions, flatMapAngle } from './planeHeading'
import type { GroundKind } from './tripActivity'

/** The trip the map shows (moving map spec §5.1), as the app's TripMap: its drawable legs, its mode, and home. */

/** An airport on the map. */
export interface AirportMark {
  code: Iata
  /** The airport list's city, or the code. */
  city: string
  place: GeoPoint
  /** Null when this browser doesn't know the zone: "there" times are left out then. */
  timeZone: string | null
}

/** A flight (or jumpseat) or a drive between two known airports, at its delay-aware times. */
export interface MapLeg {
  id: string
  kind: 'flight' | 'drive'
  origin: AirportMark
  destination: AirportMark
  start: number
  end: number
  flightNumber: string | null
}

/** One of the trip's ground legs, kept to name the waits between its moving legs (activity markers design §2.2). Never drawn. */
export interface GroundStop {
  kind: GroundKind
  start: number
  end: number
}

/**
 * A layover, a turn, or a stay at base or home: the legs that name a wait. The site's report leg isn't one: a wait no
 * leg names is named by where it is (`tripWaits`), which puts the commuter waiting at base before a trip at base.
 */
export const isGroundLeg = (leg: Leg): leg is PlaceLeg & { kind: GroundKind } =>
  leg.kind === 'layover' || leg.kind === 'turn' || leg.kind === 'base' || leg.kind === 'home'

export type TripMapMode = { kind: 'inFlight'; legId: string } | { kind: 'onTrip' } | { kind: 'nextTrip' } | { kind: 'recap' }

export interface TripMap {
  mode: TripMapMode
  /** Never empty, earliest first. */
  legs: MapLeg[]
  /** The trip's layovers, turns and stays at base or home, earliest first: they name the waits. */
  groundStops: GroundStop[]
  home: AirportMark | null
  /** The pilot's base, as the trip's legs name it, or null when none does (the app's base waits design §2, §3). */
  base: AirportMark | null
  /** With this trip ahead, the pilot waits at base rather than at home, as the status says (base waits design §3). */
  isWaitingAtBase: boolean
  /** From the earliest departure to the last arrival: the full-screen map's timeline. */
  span: { start: number; end: number }
  /** CrewLu's count of the trip's days, when known: the recap's, the next trip's or the trip under way's (Stage 2 spec §8.1). */
  days: number | null
}

export function airportMark(code: Iata, airports: AirportIndex): AirportMark | null {
  const airport = airports.get(code)
  if (!airport) return null
  return { code: airport.iata, city: airports.city(code) ?? airport.iata, place: { lat: airport.lat, lng: airport.lng }, timeZone: airports.tz(code) }
}

function mapLeg(leg: Leg, airports: AirportIndex): MapLeg | null {
  const ends = isMove(leg) ? [leg.dep, leg.arr] : leg.kind === 'drive' ? [leg.from, leg.to] : null
  if (!ends) return null
  const origin = airportMark(ends[0], airports)
  const destination = airportMark(ends[1], airports)
  if (!origin || !destination) return null
  // A van or bus between airports (`ground`) goes by road, so it's drawn as a drive.
  const isFlight = isMove(leg) && !leg.ground
  return {
    id: leg.id,
    kind: isFlight ? 'flight' : 'drive',
    origin,
    destination,
    start: leg.start,
    end: leg.end,
    flightNumber: isFlight ? flightNumberText(leg.airline, leg.number) : null,
  }
}

export interface TripMapOptions {
  /** The legs are a trip still ahead, shown from home. */
  isNextTrip: boolean
  /** The legs are a trip just finished, shown for a day as its recap (Stage 2 spec §8). */
  isRecap?: boolean
  /** CrewLu's count of the trip's days. */
  days?: number | null
  home: Iata | null
  /** The pilot's base, which names a wait there that no ground leg does (base waits design §2). */
  base?: Iata | null
  /** With a trip ahead, the status says the pilot is at base, not home (base waits design §3). */
  isWaitingAtBase?: boolean
  now: number
  airports: AirportIndex
}

/** The map of one trip's legs, or null when none can be drawn (moving map spec §12). */
export function makeTripMap(
  legs: Leg[], { isNextTrip, isRecap = false, days = null, home, base = null, isWaitingAtBase = false, now, airports }: TripMapOptions,
): TripMap | null {
  const mapped = [...legs].sort((a, b) => a.start - b.start).map((l) => mapLeg(l, airports)).filter((l): l is MapLeg => l != null)
  if (mapped.length === 0) return null
  const start = Math.min(...mapped.map((l) => l.start))
  const end = Math.max(start, ...mapped.map((l) => l.end))
  const flying = mapped.find((l) => l.kind === 'flight' && isMoving(l, now))
  const mode: TripMapMode = isRecap ? { kind: 'recap' } : isNextTrip ? { kind: 'nextTrip' } : flying ? { kind: 'inFlight', legId: flying.id } : { kind: 'onTrip' }
  const groundStops = legs.filter(isGroundLeg).map((l) => ({ kind: l.kind, start: l.start, end: l.end })).sort((a, b) => a.start - b.start)
  // Base as the legs name it, with its city and time zone: a wait or a marker there is at one of their airports.
  const baseMark = base ? mapped.flatMap((l) => [l.origin, l.destination]).find((a) => a.code === base) ?? null : null
  return {
    mode, legs: mapped, groundStops, home: home ? airportMark(home, airports) : null, base: baseMark,
    isWaitingAtBase: mode.kind === 'nextTrip' && isWaitingAtBase, span: { start, end }, days,
  }
}

/** True from leaving the gate (or the driveway) until reaching the other end. */
export const isMoving = (leg: MapLeg, t: number) => leg.start <= t && t < leg.end

/** How far along the leg the schedule has the pilot, 0…1: a flight with the taxi allowances, a drive steadily. */
export function legProgress(leg: MapLeg, t: number): number {
  if (leg.kind === 'flight') return scheduledFraction(leg.start, leg.end, t)
  if (leg.end <= leg.start) return t >= leg.end ? 1 : 0
  return Math.min(Math.max((t - leg.start) / (leg.end - leg.start), 0), 1)
}

export const positionAt = (leg: MapLeg, fraction: number) => pointAlong(leg.origin.place, leg.destination.place, fraction)

/** When the schedule has the pilot `fraction` of the way along (Stage 2 spec §4.2): in the air for a flight, steadily for a drive. */
export function timeAtFraction(leg: MapLeg, fraction: number): number | null {
  if (leg.kind === 'flight') return scheduledTime(leg.start, leg.end, fraction)
  return leg.start + Math.min(Math.max(fraction, 0), 1) * (leg.end - leg.start)
}

/** Where the schedule has the pilot along `leg` at `t`. */
export const positionAtTime = (leg: MapLeg, t: number) => positionAt(leg, legProgress(leg, t))

export const legDistanceMeters = (leg: MapLeg) => distanceMeters(leg.origin.place, leg.destination.place)

/** The plane's angle at `t` on a north-up map, or null for a leg that starts and ends at one place. */
export function headingAt(leg: MapLeg, t: number): number | null {
  const aim = aimFractions(legProgress(leg, t))
  return flatMapAngle(positionAt(leg, aim.from), positionAt(leg, aim.to))
}

/** The flight in the air when the map was made. */
export function currentLeg(map: TripMap): MapLeg | null {
  const mode = map.mode
  return mode.kind === 'inFlight' ? map.legs.find((l) => l.id === mode.legId) ?? null : null
}

export const legInMotion = (map: TripMap, t: number) => map.legs.find((l) => isMoving(l, t)) ?? null

export const nextFlight = (map: TripMap, t: number) => map.legs.find((l) => l.kind === 'flight' && l.start > t) ?? null

/**
 * Where the pilot is at `t` when nothing is moving, or null while a leg is. Before a trip still ahead starts, home, or
 * base while the pilot waits there.
 */
export function pilotLocation(map: TripMap, t: number): AirportMark | null {
  if (legInMotion(map, t)) return null
  // After a recap's trip, home, else where the trip ended (Stage 2 spec §8.2).
  if (map.mode.kind === 'recap' && t >= map.span.end) return map.home ?? map.legs[map.legs.length - 1].destination
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return (map.isWaitingAtBase ? map.base : map.home) ?? map.legs[0].origin
  const landed = map.legs.filter((l) => l.end <= t)
  return landed.length > 0 ? landed[landed.length - 1].destination : map.legs[0].origin
}

/** The places the camera must show: one leg's arc, or every leg's arcs and home. */
export function framingPoints(map: TripMap, focus: MapLeg | null): GeoPoint[] {
  const shown = focus ? [focus] : map.legs
  const points = shown.flatMap((l) => pointsAlong(l.origin.place, l.destination.place, 33))
  if (!focus && map.home) points.push(map.home.place)
  return points
}

/** The airports the flights among `legs` reach, in order, each once, with home left out (moving map spec §5.3). */
export function destinationsOf(legs: MapLeg[], home: AirportMark | null): AirportMark[] {
  const seen = new Set(home ? [home.code] : [])
  return legs.filter((l) => l.kind === 'flight').map((l) => l.destination).filter((a) => !seen.has(a.code) && seen.add(a.code))
}

/** Whole miles flown by `t` along the flights' planned routes, with the one in the air counted in part. */
export function milesFlown(legs: MapLeg[], t: number): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0) / METERS_PER_MILE)
}

/** Whole miles of every flight among `legs`. */
export function totalMiles(legs: MapLeg[]): number {
  return Math.round(legs.filter((l) => l.kind === 'flight').reduce((sum, l) => sum + legDistanceMeters(l), 0) / METERS_PER_MILE)
}

/** The trip's days: CrewLu's count when known (at least 1), else the calendar days its span covers in `timeZone` (Stage 2 spec §8.1). */
export function dayCount(map: TripMap, timeZone: string): number {
  if (map.days != null) return Math.max(1, map.days)
  return calendarDay(map.span.end, timeZone) - calendarDay(map.span.start, timeZone) + 1
}
