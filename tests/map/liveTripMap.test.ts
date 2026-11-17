import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { liveMapFlights, withLiveTimes } from '../../src/engine/liveLegs'
import { pathPoints } from '../../src/map/flightPathDrawing'
import { pointsAlong } from '../../src/map/greatCircle'
import { fitRect } from '../../src/map/mapFit'
import { landedIn, stillOnGroundIn } from '../../src/map/tripActivity'
import { framingPoints, isArrivalEstimated, legLandedBeforeGate, legStillOnGround, makeTripMap, type TripMap } from '../../src/map/tripMap'
import { atTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS as AIRPORTS, liveTripMap, PHL, placeOf, SCHEDULE, SDF, SDF_PHL as F1 } from './liveTrip'
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

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  const flightOf = (map: TripMap) => map.legs.find((l) => l.kind === 'flight')!

  it('is told once the plan’s takeoff time has gone by and the plane hasn’t left: the airport it waits at', () => {
    // Ten minutes after the plan's takeoff.
    const map = liveTripMap(START + 25 * MINUTE, atTheGate(25))
    expect(legStillOnGround(flightOf(map), START + 25 * MINUTE)).toBe(true)
    expect(stillOnGroundIn(map, START + 25 * MINUTE)).toMatchObject({ code: 'SDF', city: 'Louisville' })
  })

  it('isn’t told while an on-time plane is still before the plan’s takeoff time: it’s taxiing as the schedule has it', () => {
    // A minute after its leg begins, 14 before the plan's takeoff: Todd's words are for a plane late leaving.
    const map = liveTripMap(START + MINUTE, atTheGate(1))
    expect(legStillOnGround(flightOf(map), START + MINUTE)).toBe(false)
    expect(stillOnGroundIn(map, START + MINUTE)).toBeNull()
  })

  it('isn’t told of a plane at its gate before its leg begins: the pilot isn’t flying yet', () => {
    const map = liveTripMap(START - 10 * MINUTE, atTheGate(-10))
    expect(legStillOnGround(flightOf(map), START - 10 * MINUTE)).toBe(false)
    expect(stillOnGroundIn(map, START - 10 * MINUTE)).toBeNull()
  })

  it('isn’t told of a plane in the air, landed, on the ground somewhere else, or with no live data', () => {
    const landed = liveFlight([point(20, 38.6, -84.2), point(90, 39.8, -75.8)],
      { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    // A diversion: on the ground in Cincinnati, 80 mi from Louisville.
    const elsewhere = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, 39.05, -84.67, { onGround: true }) })
    for (const [live, minutes] of [[FLYING, 59], [landed, 103], [elsewhere, 25], [null, 25]] as const) {
      const now = START + minutes * MINUTE
      const map = liveTripMap(now, live)
      expect(stillOnGroundIn(map, now)).toBeNull()
      expect(legStillOnGround(flightOf(map), now)).toBe(false)
    }
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
  const flightOf = (map: TripMap) => map.legs.find((l) => l.kind === 'flight')!

  it('is told from its touchdown until the gate, while the leg is between its gates', () => {
    for (const minutes of [100, 103, 106.9]) {
      const now = START + minutes * MINUTE
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, LANDED_EARLY)), now), `${minutes}`).toBe(true)
    }
  })

  it('isn’t told at the gate: the leg is over', () => {
    const now = START + 107 * MINUTE
    const map = liveTripMap(now, LANDED_EARLY)
    expect(flightOf(map).end).toBe(now)
    expect(legLandedBeforeGate(flightOf(map), now)).toBe(false)
  })

  it('isn’t told of a plane in the air, still at its departure airport, on the ground somewhere else, or with no live data', () => {
    // A diversion: on the ground in Cincinnati, 80 mi from Louisville.
    const elsewhere = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, 39.05, -84.67, { onGround: true }) })
    for (const [live, minutes] of [[FLYING, 59], [atTheGate(25), 25], [elsewhere, 25], [null, 103]] as const) {
      const now = START + minutes * MINUTE
      expect(legLandedBeforeGate(flightOf(liveTripMap(now, live)), now)).toBe(false)
    }
  })

  it('isn’t told of a plane landed somewhere other than its arrival airport, and is of one whose last fix is still in the air (the diversion rule, Todd, 17 Nov 2026)', () => {
    const now = START + 103 * MINUTE
    // Down in Harrisburg, about 90 mi short of Philadelphia: it landed somewhere else, which nothing names.
    const diverted = liveFlight(LANDED_EARLY.trail,
      { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, 40.19, -76.76, { onGround: true }) })
    expect(legLandedBeforeGate(flightOf(liveTripMap(now, diverted)), now)).toBe(false)
    expect(landedIn(liveTripMap(now, diverted), now)).toBeNull()
    // Down by Philadelphia, inside its 10 nm: landed there, as before.
    const atPhiladelphia = liveFlight(LANDED_EARLY.trail,
      { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat + 0.1, PHL.lng, { onGround: true }) })
    expect(legLandedBeforeGate(flightOf(liveTripMap(now, atPhiladelphia)), now)).toBe(true)
    // Its last fix still in the air, short of Philadelphia: a stale fix can't tell a diversion, so it counts as landed.
    const lastSeenAloft = liveFlight(LANDED_EARLY.trail,
      { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(95, 40.19, -76.76) })
    expect(legLandedBeforeGate(flightOf(liveTripMap(now, lastSeenAloft)), now)).toBe(true)
  })

  it('names the airport it’s down at, which the line under the timeline names in place of "Flying to", and none otherwise', () => {
    const now = START + 103 * MINUTE
    expect(landedIn(liveTripMap(now, LANDED_EARLY), now)).toMatchObject({ code: 'PHL', city: 'Philadelphia' })
    for (const [live, minutes] of [[LANDED_EARLY, 107], [FLYING, 59], [atTheGate(25), 25], [null, 103]] as const) {
      const then = START + minutes * MINUTE
      expect(landedIn(liveTripMap(then, live), then)).toBeNull()
    }
  })
})
