import { distanceMeters, EARTH_RADIUS_M, METERS_PER_MILE, type GeoPoint } from '../map/greatCircle'

/**
 * What's under a point on the earth (Stage 2 spec §4.1), as the app's Geography: a US state or Canadian province, else a
 * country, else a named sea or ocean, and any city of a million or more within 40 mi. Land within 5 mi beats water or
 * nothing (the coast snap), since the simplified coastlines can be a few miles off. Read from
 * public/data/geography.json, a copy of the app's, which its scripts/build-geography.mjs makes from Natural Earth (§9.1).
 */

export type AreaKind = 'state' | 'province' | 'country' | 'water'

/** What's under a point, named as the facts read it: "Kansas", "the Netherlands", "the Labrador Sea". */
export interface Place {
  name: string
  kind: AreaKind
  /** The country a state or province is in, or the country itself. Null over water. */
  country: string | null
}

export interface Area {
  name: string
  kind: AreaKind
  /** For a state or province, its country. */
  country: string | null
  /** West, south, east and north edges, in degrees. */
  box: [number, number, number, number]
  /** Each ring as longitude, latitude, longitude, latitude, … */
  rings: number[][]
}

export interface City {
  name: string
  lat: number
  lon: number
}

export interface Geography {
  areas: Area[]
  cities: City[]
  /** The areas in the order they're tried: states and provinces, then countries, then waters. Water is tried last, after the coast snap. */
  lookupOrder: Area[][]
}

/** A city of a million or more this close adds "near Montréal" (§4.1). */
export const CITY_RADIUS_M = 40 * METERS_PER_MILE

/**
 * Land this close beats water or nothing (Stage 2 spec §4.1): the simplified coastlines can be a few miles off, which
 * would put New York over the Atlantic.
 */
export const COAST_SNAP_M = 5 * METERS_PER_MILE

export function makeGeography(areas: Area[], cities: City[]): Geography {
  return {
    areas,
    cities,
    lookupOrder: [
      areas.filter((a) => a.kind === 'state' || a.kind === 'province'),
      areas.filter((a) => a.kind === 'country'),
      areas.filter((a) => a.kind === 'water'),
    ],
  }
}

/** No places at all: what the facts use when geography.json can't be had, so they go on without places (§11). */
export const EMPTY_GEOGRAPHY: Geography = makeGeography([], [])

const KINDS: readonly string[] = ['state', 'province', 'country', 'water']
const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number' && Number.isFinite(n))
const record = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null)

function parseArea(value: unknown): Area | null {
  const a = record(value)
  if (!a || typeof a.name !== 'string' || typeof a.kind !== 'string' || !KINDS.includes(a.kind)) return null
  if (!isNumberList(a.box) || a.box.length !== 4 || !Array.isArray(a.rings)) return null
  const rings = a.rings.filter((r): r is number[] => isNumberList(r) && r.length >= 6 && r.length % 2 === 0)
  if (rings.length === 0) return null
  const [west, south, east, north] = a.box
  return { name: a.name, kind: a.kind as AreaKind, country: typeof a.country === 'string' ? a.country : null, box: [west, south, east, north], rings }
}

function parseCity(value: unknown): City | null {
  const c = record(value)
  if (!c || typeof c.name !== 'string' || typeof c.lat !== 'number' || typeof c.lon !== 'number') return null
  return { name: c.name, lat: c.lat, lon: c.lon }
}

/** geography.json's areas and cities. Anything it can't read is left out rather than looked up wrong. */
export function parseGeography(json: unknown): Geography {
  const file = record(json)
  const areas = Array.isArray(file?.areas) ? file.areas.map(parseArea).filter((a): a is Area => a != null) : []
  const cities = Array.isArray(file?.cities) ? file.cities.map(parseCity).filter((c): c is City => c != null) : []
  return makeGeography(areas, cities)
}

/** True when both are the same place. */
export const samePlace = (a: Place | null, b: Place | null) =>
  a != null && b != null && a.name === b.name && a.kind === b.kind && a.country === b.country

const placeOf = (area: Area): Place => ({ name: area.name, kind: area.kind, country: area.kind === 'water' ? null : (area.country ?? area.name) })

/** Even-odd ray casting on longitude and latitude, for rings that don't cross the date line: Natural Earth splits its shapes there. */
function ringContains(ring: number[], lat: number, lng: number): boolean {
  const count = ring.length / 2
  if (count < 3) return false
  let inside = false
  for (let current = 0, previous = count - 1; current < count; previous = current++) {
    const currentLng = ring[2 * current]
    const currentLat = ring[2 * current + 1]
    const previousLng = ring[2 * previous]
    const previousLat = ring[2 * previous + 1]
    if ((currentLat > lat) !== (previousLat > lat)) {
      const crossing = ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) + currentLng
      if (lng < crossing) inside = !inside
    }
  }
  return inside
}

/** Inside when an odd number of the rings hold the point, so a hole (Lesotho in South Africa) is outside. Only areas whose box holds it are tested. */
function areaContains(area: Area, lat: number, lng: number): boolean {
  const [west, south, east, north] = area.box
  if (lng < west || lat < south || lng > east || lat > north) return false
  return area.rings.filter((ring) => ringContains(ring, lat, lng)).length % 2 === 1
}

/** One degree of latitude, in meters, on the great-circle earth. */
const METERS_PER_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180

/** Whether the point is within `meters` of the area's box: a cheap test before `distanceToEdge`. */
function areaIsNear(area: Area, lat: number, lng: number, meters: number): boolean {
  const [west, south, east, north] = area.box
  const latitudeMargin = meters / METERS_PER_DEGREE
  const longitudeMargin = latitudeMargin / Math.max(Math.cos((lat * Math.PI) / 180), 0.01)
  return lng >= west - longitudeMargin && lat >= south - latitudeMargin && lng <= east + longitudeMargin && lat <= north + latitudeMargin
}

/** How far the origin is from the segment start→end, all in meters. */
function distanceFromOriginToSegment(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX
  const dy = endY - startY
  const lengthSquared = dx * dx + dy * dy
  const share = lengthSquared > 0 ? Math.min(Math.max(-(startX * dx + startY * dy) / lengthSquared, 0), 1) : 0
  return Math.hypot(startX + share * dx, startY + share * dy)
}

/**
 * About how far the point is from the nearest edge of any ring, in meters, on a flat map around the point: close
 * enough over the few miles the coast snap looks.
 */
function distanceToEdge(area: Area, lat: number, lng: number): number {
  const eastScale = Math.cos((lat * Math.PI) / 180) * METERS_PER_DEGREE
  let nearest = Infinity
  for (const ring of area.rings) {
    const count = ring.length / 2
    if (count < 2) continue
    let previous = count - 1
    for (let current = 0; current < count; current++) {
      const startX = (ring[2 * previous] - lng) * eastScale
      const startY = (ring[2 * previous + 1] - lat) * METERS_PER_DEGREE
      const endX = (ring[2 * current] - lng) * eastScale
      const endY = (ring[2 * current + 1] - lat) * METERS_PER_DEGREE
      nearest = Math.min(nearest, distanceFromOriginToSegment(startX, startY, endX, endY))
      previous = current
    }
  }
  return nearest
}

/** The nearest state, province or country (the first of them, in order, on a tie) within `COAST_SNAP_M`, or null. */
function nearestWithinSnap(areas: Area[], lat: number, lng: number): Area | null {
  let best: { area: Area; meters: number } | null = null
  for (const area of areas) {
    if (!areaIsNear(area, lat, lng, COAST_SNAP_M)) continue
    const meters = distanceToEdge(area, lat, lng)
    if (meters <= COAST_SNAP_M && (!best || meters < best.meters)) best = { area, meters }
  }
  return best?.area ?? null
}

/** A longitude within −180…180. */
const wrapped = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180

/**
 * The state or province, else the country, under `point`; else one within 5 mi (states and provinces tried before
 * countries, the nearest edge winning); else the named water; else null (Stage 2 spec §4.1).
 */
export function placeAt(geography: Geography, point: GeoPoint): Place | null {
  const lng = wrapped(point.lng)
  const [regions, countries, waters] = geography.lookupOrder
  for (const land of [regions, countries]) {
    const area = land.find((a) => areaContains(a, point.lat, lng))
    if (area) return placeOf(area)
  }
  for (const land of [regions, countries]) {
    const area = nearestWithinSnap(land, point.lat, lng)
    if (area) return placeOf(area)
  }
  const water = waters.find((a) => areaContains(a, point.lat, lng))
  return water ? placeOf(water) : null
}

/** The nearest city of a million or more within 40 mi of `point`, or null. */
export function cityNear(geography: Geography, point: GeoPoint): City | null {
  let best: { city: City; meters: number } | null = null
  for (const city of geography.cities) {
    const meters = distanceMeters(point, { lat: city.lat, lng: city.lon })
    if (meters <= CITY_RADIUS_M && (!best || meters < best.meters)) best = { city, meters }
  }
  return best?.city ?? null
}
