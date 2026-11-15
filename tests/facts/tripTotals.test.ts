import { describe, expect, it } from 'vitest'
import { sunEvents } from '../../src/facts/sky'
import { longestFlight, timeZonesCrossed, totalsSoFar, wholeTotals } from '../../src/facts/tripTotals'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { mark } from './factsTestData'

/** Louisville to Cologne to Dubai and home, from 2026-11-13 12:00 UTC. Its one cockpit sunset is on the first flight, at 17:45 UTC. */
const europe = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
const eventsOf = (map: TripMap) => Object.fromEntries(map.legs.map((leg) => [leg.id, sunEvents(leg)]))

function zoned(id: string, from: string | null, to: string | null): MapLeg {
  return { id, kind: 'flight', origin: mark('A', 0, 0, 'A', from), destination: mark('B', 0, 10, 'B', to), start: at(0), end: at(0) + HOUR, flightNumber: null }
}

describe('a trip’s totals (Stage 2 spec §4.8)', () => {
  it('counts the whole Europe trip', () => {
    expect(wholeTotals(europe, eventsOf(europe))).toEqual({ cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 })
  })

  it('counts the first flight once it has landed', () => {
    expect(totalsSoFar(europe, at(12), eventsOf(europe))).toEqual({ cities: 1, miles: 4_351, timeZones: 6, cockpitSunsets: 1 })
  })

  it('counts only miles in the first flight before its sunset', () => {
    const totals = totalsSoFar(europe, at(4), eventsOf(europe))
    expect(totals.cities).toBe(0)
    expect(totals.timeZones).toBe(0)
    expect(totals.cockpitSunsets).toBe(0)
    expect(totals.miles).toBeGreaterThan(0)
  })

  it('rounds half hours only at the end', () => {
    // 10½ hours.
    expect(timeZonesCrossed([zoned('1', 'America/New_York', 'Asia/Kolkata')])).toBe(11)
    // 1½ and 1½.
    expect(timeZonesCrossed([zoned('1', 'Asia/Kolkata', 'Asia/Dubai'), zoned('2', 'Asia/Dubai', 'Asia/Kolkata')])).toBe(3)
  })

  it('adds nothing for a flight with an unknown zone', () => {
    expect(timeZonesCrossed([zoned('1', 'America/New_York', null)])).toBe(0)
  })

  it('finds the longest flight: Dubai to Louisville', () => {
    expect(longestFlight(europe.legs)?.id).toBe('f3')
  })
})
