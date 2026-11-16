import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { framingPoints, isArrivalEstimated, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { LIVE_AIRPORTS as AIRPORTS, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

/** Seen north of the line, then far north of it, 40 minutes in: still in the air. */
const LIVE = liveFlight([point(20, 38.6, -84.2), point(40, 40.6, -81.2)], { fix: fix(41, 40.65, -81.0) })
const LANDED = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
  { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })

function mapAt(legs: Leg[], now: number, flights = new Map()): TripMap {
  return makeTripMap(legs, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS, flights })!
}

describe('the trip map with live data (Stage 3 spec §6.2, §11)', () => {
  it('leaves a flight with no live data as it was: no flight, the schedule drawn as before', () => {
    const map = mapAt([F1], START + 30 * MINUTE)
    expect(map.legs[0].flight).toBeUndefined()
    expect('flight' in map.legs[0]).toBe(false)
    expect(isArrivalEstimated(map.legs[0])).toBe(false)
  })

  it('gives a drive no flight', () => {
    const drive: Leg = { kind: 'drive', id: 'd1', tripId: null, from: 'PHL', to: 'SDF', toHome: true, start: START, end: START + 60 * MINUTE, schedEnd: START + 60 * MINUTE }
    const flights = new Map([['d1', liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf).get('f1')!]])
    expect(mapAt([drive], START + 30 * MINUTE, flights).legs[0].flight).toBeUndefined()
  })

  it("carries a live flight's real path, at the real plane's times, with its end an estimate", () => {
    const now = START + 42 * MINUTE
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const legs = buildLegs(withLiveTimes(SCHEDULE, flights, now))
    const leg = mapAt(legs, now, flights).legs[0]
    expect(leg.flight?.path.isReal).toBe(true)
    expect(leg.flight?.live).toBe(LIVE)
    expect(leg.end).not.toBe(F1.end)
    expect(isArrivalEstimated(leg)).toBe(true)
  })

  it('has no estimate once the plane has landed', () => {
    const now = START + 103 * MINUTE
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LANDED]]), 0, placeOf)
    const leg = mapAt(buildLegs(withLiveTimes(SCHEDULE, flights, now)), now, flights).legs[0]
    expect(leg.end).toBe(START + 107 * MINUTE)
    expect(isArrivalEstimated(leg)).toBe(false)
  })
})

describe("the trip map's camera with live data", () => {
  it('frames the great circles of before for a flight with no live data', () => {
    expect(framingPoints(mapAt([F1], START), null)).toEqual([...pointsAlong(SDF, PHL, 33), SDF])
  })

  it('frames every place a real path passes', () => {
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const map = mapAt([F1], START + 42 * MINUTE, flights)
    const framed = fitRect(framingPoints(map, map.legs[0]))!
    for (const place of pathPoints(flights.get('f1')!.path)) {
      const one = fitRect([place, place])!
      expect(one.x).toBeGreaterThanOrEqual(framed.x - 1e-12)
      expect(one.x).toBeLessThanOrEqual(framed.x + framed.width + 1e-12)
      expect(one.y).toBeGreaterThanOrEqual(framed.y - 1e-12)
      expect(one.y).toBeLessThanOrEqual(framed.y + framed.height + 1e-12)
    }
  })

  it('reaches a path far from the great circle', () => {
    const flights = liveMapFlights(SCHEDULE, new Map([['f1', LIVE]]), 0, placeOf)
    const before = mapAt([F1], START)
    const schedule = fitRect(framingPoints(before, before.legs[0]))!
    const live = fitRect(framingPoints(mapAt([F1], START + 42 * MINUTE, flights), null))!
    // The plane was seen at 40.6° north, well north of the great circle, whose frame tops out near Philadelphia.
    expect(live.y).toBeLessThan(schedule.y)
  })
})
