import { buildAirportIndex } from '../../src/data/airports'
import { buildLegs, type MoveLeg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { airport } from './liveCases'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** A made-up trip of one flight, Louisville to Philadelphia from noon to 2 PM, and its real plane, for the map's tests. */

export const SDF = airport('SDF')
export const PHL = airport('PHL')

export const LIVE_AIRPORTS = buildAirportIndex([
  ['SDF', 'Louisville', 'US', SDF.lat, SDF.lng, 'America/New_York', 'KY'],
  ['PHL', 'Philadelphia', 'US', PHL.lat, PHL.lng, 'America/New_York', 'PA'],
])

/** Seen from just after takeoff, every few minutes, then not for 25 minutes, then again: in the air, heading east. */
export const TRAIL = [point(16, 38.25, -85.55), point(22, 38.6, -84.6), point(28, 38.95, -83.6), point(53, 39.6, -80.3), point(57, 39.65, -79.8)]
export const FLYING = liveFlight(TRAIL, { legId: 'f1', fix: fix(58, 39.66, -79.7, { trackDeg: 75 }) })

/** The flight as the trip's leg, at its gate times. */
export const SDF_PHL: MoveLeg = {
  kind: 'flight', id: 'f1', tripId: 'T1', dep: 'SDF', arr: 'PHL', start: START, end: START + 120 * MINUTE, schedStart: START,
  schedEnd: START + 120 * MINUTE, airline: '5X', enteredAirline: null, number: '1234', deadhead: false, ground: false,
}

/** The trip as the engine's schedule: the one flight, in trip T1. */
export const SCHEDULE: Schedule = {
  pilot: { firstName: 'Alex', base: 'SDF', home: 'SDF', effHome: 'SDF' },
  trips: [{ id: 'T1', start: SDF_PHL.start, end: SDF_PHL.end, days: 1, dutyPeriods: [{ id: 'T1|dp|0', tripId: 'T1', start: SDF_PHL.start, end: SDF_PHL.end, flights: [SDF_PHL] }] }],
  jumpseats: [], commutes: [], events: [], fetchedAt: START, newestUpdatedAt: null, empty: false,
}

/** Where an airport is, as the status page finds it in its airport list. */
export const placeOf = (code: string): GeoPoint | null => {
  const a = LIVE_AIRPORTS.get(code)
  return a ? { lat: a.lat, lng: a.lng } : null
}

/** The trip's map at `t`, as the status page makes it: `live` as the flight's answer, or none, and the real times in the legs. */
export function liveTripMap(t: number, live: LiveFlight | null = FLYING): TripMap {
  const flights = liveMapFlights(SCHEDULE, new Map(live ? [['f1', live]] : []), 0, placeOf)
  const legs = buildLegs(withLiveTimes(SCHEDULE, flights, t))
  return makeTripMap(legs, { isNextTrip: false, home: 'SDF', now: t, airports: LIVE_AIRPORTS, flights })!
}
