import { describe, expect, it } from 'vitest'
import {
  FIRST_POINT_RADIUS, makeFlightPath, OWN_SPEED_LEAST_MS, pointAtDistance, RESTART_GAP_MS, RETURN_CLIMB_FEET, UNSEEN_GAP_MS, type FlightPath,
  type StretchKind,
} from '../../src/map/flightPath'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
import type { LiveFix, LiveFlight, LiveState, TrailPoint } from '../../src/map/liveFlight'
import { airport, expectNear, knots, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const START = Date.UTC(2027, 0, 15, 12)
const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')

const point = (minutes: number, lat: number, lng: number): TrailPoint => ({ time: START + minutes * MINUTE, place: { lat, lng }, altitudeFt: 30_000 })

const fix = (minutes: number, lat: number, lng: number, onGround = false): LiveFix => ({
  place: { lat, lng },
  altitudeFt: onGround ? null : 30_000,
  groundSpeedKt: 430,
  trackDeg: 80,
  onGround,
  registration: null,
  typeCode: null,
  seenAt: START + minutes * MINUTE,
})

const flight = (trail: TrailPoint[], more: { state?: LiveState; fix?: LiveFix; landedAt?: number } = {}): LiveFlight => ({
  legId: 'leg',
  callsign: 'UPS1234',
  state: more.state ?? 'airborne',
  fix: more.fix ?? null,
  landedAt: more.landedAt ?? null,
  trail,
})

const kinds = (path: FlightPath) => path.stretches.map((s) => s.kind)
const total = (path: FlightPath, kind: StretchKind) => nm(path.stretches.filter((s) => s.kind === kind).reduce((sum, s) => sum + s.length, 0))

describe('the path (Stage 3 spec §6.1)', () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(UNSEEN_GAP_MS).toBe(c.unseenGapMinutes * MINUTE)
    expect(FIRST_POINT_RADIUS).toBe(c.firstPointRadiusNm * METERS_PER_NM)
    expect(OWN_SPEED_LEAST_MS).toBe(c.ownSpeedLeastMinutes * MINUTE)
    expect(RETURN_CLIMB_FEET).toBe(c.returnClimbFeet)
    expect(RESTART_GAP_MS).toBe(c.restartGapMinutes * MINUTE)
  })

  it.each(LIVE_CASES.flights)('matches the shared case: $name', (c) => {
    const { path } = made(c)
    expect(path.isReal).toBe(c.path.isReal)
    expectNear(nm(path.length), c.path.lengthNm, NEAR.nm, 'length')
    expectNear(nm(path.flownLength), c.path.flownNm, NEAR.nm, 'flown')
    expect(kinds(path)).toEqual(c.path.stretchKinds)
    expectNear(total(path, 'seen'), c.path.seenNm, NEAR.nm, 'seen')
    expectNear(total(path, 'unseen'), c.path.unseenNm, NEAR.nm, 'unseen')
    expectNear(total(path, 'planned'), c.path.plannedNm, NEAR.nm, 'planned')
    if (c.path.ownSpeedKt == null) expect(path.ownSpeed).toBeNull()
    else expectNear(knots(path.ownSpeed ?? NaN), c.path.ownSpeedKt, NEAR.kt, 'own speed')
  })

  it('has its own speed in some of the shared cases, so the cases test it', () => {
    expect(LIVE_CASES.flights.filter((c) => c.path.ownSpeedKt != null).length).toBeGreaterThan(0)
  })

  it('is the great circle with no flight', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA)
    expect(path.isReal).toBe(false)
    expect(kinds(path)).toEqual(['planned'])
    expect(path.length).toBeCloseTo(distanceMeters(LOUISVILLE, PHILADELPHIA), 6)
    expect([path.flownLength, path.knots]).toEqual([0, []])
  })

  it('has stretches that follow one another, with a knot at the end of each but the way ahead', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(2, 38.6, -85.0), point(4, 38.9, -84.6)]))
    expect(path.stretches).toHaveLength(4)
    let distance = 0
    for (const stretch of path.stretches) {
      expect(stretch.startDistance).toBeCloseTo(distance, 6)
      distance += stretch.length
    }
    expect(path.length).toBeCloseTo(distance, 6)
    expect(path.knots.map((k) => k.distance)).toEqual(path.stretches.slice(0, -1).map((s) => s.startDistance + s.length))
  })

  it('sorts a trail that came out of order by time', () => {
    const inOrder = [point(0, 38.3, -85.4), point(2, 38.6, -85.0), point(4, 38.9, -84.6)]
    const sorted = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(inOrder))
    const shuffled = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([inOrder[2], inOrder[0], inOrder[1]]))
    expect(shuffled.knots).toEqual(sorted.knots)
    expect(shuffled.length).toBeCloseTo(sorted.length, 6)
  })

  it('keeps two points of one time in the order they came', () => {
    const trail = [point(4, 38.9, -84.6), point(2, 38.6, -85.0), point(2, 38.7, -84.9), point(0, 38.3, -85.4)]
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail))
    expect(path.knots).toHaveLength(4)
    expect(path.knots[1].time).toBe(path.knots[2].time)
    expect(pointAtDistance(path, path.knots[1].distance).lat).toBeCloseTo(38.6, 6)
    expect(pointAtDistance(path, path.knots[2].distance).lat).toBeCloseTo(38.7, 6)
  })

  it('takes a fix in the air newer than the trail as the last place seen, and nothing else', () => {
    const trail = [point(0, 38.3, -85.4), point(2, 38.6, -85.0)]
    const newer = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { fix: fix(2.5, 38.7, -84.9) }))
    expect(newer.knots).toHaveLength(3)
    expect(newer.knots[2].time).toBe(START + 2.5 * MINUTE)
    expect(kinds(newer)).toEqual(['seen', 'seen', 'seen', 'planned'])
    expect(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { fix: fix(2, 38.6, -85.0) })).knots).toHaveLength(2)
    const ground = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { state: 'ground', fix: fix(30, 38.18, -85.73, true) }))
    expect(ground.knots).toHaveLength(2)
    expect(kinds(ground)).toEqual(['seen', 'seen', 'planned'])
  })

  it('starts from the fix in the air with no trail yet, and is the great circle on the ground with none', () => {
    const air = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([], { fix: fix(1, 38.3, -85.4) }))
    expect(air.isReal).toBe(true)
    expect(kinds(air)).toEqual(['seen', 'planned'])
    expect(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([], { state: 'ground', fix: fix(1, 38.18, -85.73, true) })).isReal).toBe(false)
  })

  it('ends a landed flight at the arrival airport with nothing planned, unseen when it landed over ten minutes after its last point', () => {
    const trail = [point(0, 38.3, -85.4), point(2, 38.6, -85.0)]
    const landed = (landedMinutes: number) =>
      makeFlightPath(LOUISVILLE, PHILADELPHIA, flight(trail, { state: 'landed', fix: fix(40, 39.87, -75.24, true), landedAt: START + landedMinutes * MINUTE }))
    const seen = landed(8)
    expect(seen.hasLanded).toBe(true)
    expect(kinds(seen)).toEqual(['seen', 'seen', 'seen'])
    expect(seen.flownLength).toBe(seen.length)
    expect(seen.knots[seen.knots.length - 1]).toEqual({ time: START + 8 * MINUTE, distance: seen.length })
    expect(kinds(landed(12))).toEqual(['seen', 'seen', 'seen'])
    expect(kinds(landed(13))).toEqual(['seen', 'seen', 'unseen'])
  })

  it('calls points exactly ten minutes apart seen', () => {
    expect(kinds(makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(10, 39.0, -83.0)])))).toEqual(['seen', 'seen', 'planned'])
  })

  it('has an airport at each end and beyond, and the place seen at a knot', () => {
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, flight([point(0, 38.3, -85.4), point(2, 38.6, -85.0)]))
    for (const [distance, place] of [[-10, LOUISVILLE], [0, LOUISVILLE], [path.length, PHILADELPHIA], [path.length + 10, PHILADELPHIA]] as const) {
      expect(pointAtDistance(path, distance).lat).toBeCloseTo(place.lat, 9)
      expect(pointAtDistance(path, distance).lng).toBeCloseTo(place.lng, 9)
    }
    expect(pointAtDistance(path, path.knots[1].distance).lat).toBeCloseTo(38.6, 6)
    expect(pointAtDistance(path, path.knots[1].distance).lng).toBeCloseTo(-85.0, 6)
  })
})
