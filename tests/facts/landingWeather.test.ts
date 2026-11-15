import { describe, expect, it } from 'vitest'
import { flightsToForecast, landsWithinHorizon, WEATHER_HORIZON_MS } from '../../src/facts/landingWeather'
import { makeTripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'

/** The Europe trip's flights land at +8, +38 and +72 hours. */
const ids = (hours: number) =>
  flightsToForecast(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(hours), airports: AIRPORTS })!, at(hours)).map((l) => l.id)

describe('which flights get weather (Stage 2 spec §7.2)', () => {
  it('is 48 hours', () => {
    expect(WEATHER_HORIZON_MS).toBe(48 * HOUR)
  })

  it('in the air, is this flight and the next', () => {
    expect(ids(4)).toEqual(['f1', 'f2'])
  })

  it('on a layover, is the next flight', () => {
    expect(ids(12)).toEqual(['f2'])
  })

  it('leaves out a flight landing more than 48 hours out', () => {
    expect(ids(-24)).toEqual(['f1'])
    expect(ids(-48)).toEqual([])
  })

  it('in replay, shows only for a landing between the real now and 48 hours on (§7.3)', () => {
    const f1 = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!.legs[0]
    expect(landsWithinHorizon(f1, at(4))).toBe(true)
    expect(landsWithinHorizon(f1, at(9))).toBe(false)
    expect(landsWithinHorizon(f1, at(8 - 49))).toBe(false)
  })
})
