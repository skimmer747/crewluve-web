import { flightNumberText } from '../copy/flight'
import type { AirportIndex } from '../data/airports'
import { isMove, type Leg } from '../engine/legs'
import type { Iata } from '../engine/types'
import { scheduledFraction } from './flightProgress'
import { distanceMeters, pointAlong, pointsAlong, type GeoPoint } from './greatCircle'
import { aimFractions, flatMapAngle } from './planeHeading'

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

export type TripMapMode = { kind: 'inFlight'; legId: string } | { kind: 'onTrip' } | { kind: 'nextTrip' }

export interface TripMap {
  mode: TripMapMode
  /** Never empty, earliest first. */
  legs: MapLeg[]
  home: AirportMark | null
  /** From the earliest departure to the last arrival: the full-screen map's timeline. */
  span: { start: number; end: number }
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
  home: Iata | null
  now: number
  airports: AirportIndex
}

/** The map of one trip's legs, or null when none can be drawn (moving map spec §12). */
export function makeTripMap(legs: Leg[], { isNextTrip, home, now, airports }: TripMapOptions): TripMap | null {
  const mapped = [...legs].sort((a, b) => a.start - b.start).map((l) => mapLeg(l, airports)).filter((l): l is MapLeg => l != null)
  if (mapped.length === 0) return null
  const start = Math.min(...mapped.map((l) => l.start))
  const end = Math.max(start, ...mapped.map((l) => l.end))
  const flying = mapped.find((l) => l.kind === 'flight' && isMoving(l, now))
  const mode: TripMapMode = isNextTrip ? { kind: 'nextTrip' } : flying ? { kind: 'inFlight', legId: flying.id } : { kind: 'onTrip' }
  return { mode, legs: mapped, home: home ? airportMark(home, airports) : null, span: { start, end } }
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

/** Where the pilot is at `t` when nothing is moving, or null while a leg is. Before a trip still ahead starts, home. */
export function pilotLocation(map: TripMap, t: number): AirportMark | null {
  if (legInMotion(map, t)) return null
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return map.home ?? map.legs[0].origin
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
