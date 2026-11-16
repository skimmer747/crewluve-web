import { readFileSync } from 'node:fs'
import { parseComparisons, type Comparison } from '../../src/facts/comparisons'
import { makeGeography, parseGeography, type Area, type AreaKind, type Geography } from '../../src/facts/geography'
import type { AirportMark, MapLeg, TripMap } from '../../src/map/tripMap'

/**
 * Made-up places along the equator, where a fraction of the way is a fraction of the longitude, and flights across them
 * at the March equinox, so the facts' tests can be worked out by hand (Stage 2 spec §12). The app's FactsTestData.
 */

const MINUTE = 60_000

/** A rectangle from `west`° to `east`°, and from `south`° to `north`°: unless they're given, a degree either side of the equator. */
export function box(name: string, kind: AreaKind, west: number, east: number, country: string | null = null, south = -1, north = 1): Area {
  return { name, kind, country, box: [west, south, east, north], rings: [[west, south, east, south, east, north, west, north]] }
}

/**
 * Along the equator: Alpha to 5° E; Bravo to 12° E, with a Wedge 0.3° (about 21 mi) wide at 9° E that the hold rule
 * drops; then the Test Sea to 21° E. Testville sits 0.3° north of 6° E.
 */
export const EQUATOR: Geography = makeGeography(
  [box('Wedge', 'country', 9, 9.3), box('Alpha', 'country', -1, 5), box('Bravo', 'country', 5, 12), box('the Test Sea', 'water', 12, 21)],
  [{ name: 'Testville', lat: 0.3, lon: 6 }],
)

export function mark(code: string, lat: number, lng: number, city: string = code, timeZone: string | null = null): AirportMark {
  return { code, city, place: { lat, lng }, timeZone }
}

/** 2026-03-20 10:00 UTC, the March equinox: 6:00 AM in Louisville. */
export const EQUINOX = Date.UTC(2026, 2, 20, 10)

/**
 * A flight along the equator from `west`° to `east`° longitude: 3 h 22 min from gate to gate, so in the air from 10:15
 * to 13:15 UTC with the taxi allowances, a tenth of the way every 18 minutes.
 */
export function equatorFlight(west: number, east: number, departure = EQUINOX, id = 'eq'): MapLeg {
  return {
    id, kind: 'flight', origin: mark(`E${west}`, 0, west), destination: mark(`E${east}`, 0, east),
    start: departure, end: departure + 202 * MINUTE, flightNumber: 'TST1',
  }
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'))

let geography: Geography | null = null

/** The site's copy of the app's geography.json, read once. */
export const appGeography = (): Geography => (geography ??= parseGeography(readJson('public/data/geography.json')))

/** The site's copy of the app's comparisons.json. */
export const appComparisons = (): Comparison[] => parseComparisons(readJson('public/data/comparisons.json'))

/** A trip map of one flight, in the air. */
export function flightMap(leg: MapLeg, home: AirportMark | null): TripMap {
  return { mode: { kind: 'inFlight', legId: leg.id }, legs: [leg], groundStops: [], base: null, isWaitingAtBase: false, home, span: { start: leg.start, end: leg.end }, days: null }
}
