import { describe, expect, it } from 'vitest'
import { makeFlightPath } from '../../src/map/flightPath'
import {
  DESCENT_DISTANCE, DESCENT_SPEED, distanceLeft, flownPlan, makeFlightPlan, OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE, taxiIn, taxiOut,
  timeInAir, timeToFly,
} from '../../src/map/flightPlan'
import { SHORTEST_CRUISE_MS, TAXI_IN_MS, TAXI_OUT_MS } from '../../src/map/flightProgress'
import { distanceMeters, METERS_PER_NM } from '../../src/map/greatCircle'
import { airport, at, expectNear, knots, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const DEPARTURE = Date.UTC(2027, 0, 15, 12)

describe("the schedule's flight plan (Stage 3 spec §4)", () => {
  it("uses the shared cases' constants", () => {
    const c = LIVE_CASES.constants
    expect(TAXI_OUT_MS).toBe(c.taxiOutMinutes * MINUTE)
    expect(TAXI_IN_MS).toBe(c.taxiInMinutes * MINUTE)
    expect(SHORTEST_CRUISE_MS).toBe(c.shortestCruiseMinutes * MINUTE)
    expect(DESCENT_DISTANCE).toBe(c.descentDistanceNm * METERS_PER_NM)
    expect(DESCENT_SPEED).toBeCloseTo((c.descentSpeedKt * METERS_PER_NM) / 3600, 9)
    expect([OWN_SPEED_LEAST_SHARE, OWN_SPEED_MOST_SHARE]).toEqual([c.ownSpeedLeastShare, c.ownSpeedMostShare])
  })

  it.each(LIVE_CASES.plans)('matches the shared case: $name', (c) => {
    const plan = makeFlightPlan(at(c.departure), at(c.arrival), distanceMeters(airport(c.from), airport(c.to)))
    expect(plan).not.toBeNull()
    if (!plan) return
    expectNear(nm(plan.distance), c.lengthNm, NEAR.nm, 'length')
    expectNear(plan.takeoff, at(c.takeoff), NEAR.ms, 'takeoff')
    expectNear(plan.touchdown, at(c.touchdown), NEAR.ms, 'touchdown')
    expect(plan.isSteady).toBe(c.isShort)
    expectNear(knots(plan.speed), c.speedKt, NEAR.kt, 'speed')
    for (const check of c.timeToFly) expectNear(timeToFly(plan, check.distanceNm * METERS_PER_NM), check.seconds * 1000, NEAR.ms, `${check.distanceNm} nm`)
    for (const check of c.distanceLeft) expectNear(nm(distanceLeft(plan, check.minutes * MINUTE)), check.distanceNm, NEAR.nm, `${check.minutes} min`)
  })

  it('flies the whole leg in its time in the air, and distanceLeft is the inverse of timeToFly', () => {
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 8 * 60 * MINUTE, 7_000_000)!
    expect(plan.isSteady).toBe(false)
    expect(timeToFly(plan, plan.distance)).toBeCloseTo(timeInAir(plan), 6)
    expect(distanceLeft(plan, timeInAir(plan))).toBeCloseTo(plan.distance, 6)
    for (const distance of [50_000, 222_240, 1_000_000, 7_000_000, 7_500_000]) expect(distanceLeft(plan, timeToFly(plan, distance))).toBeCloseTo(distance, 6)
  })

  it('has both taxi allowances on a long block, and none on one too short for them', () => {
    const long = makeFlightPlan(DEPARTURE, DEPARTURE + 8 * 60 * MINUTE, 7_000_000)!
    expect([taxiOut(long), taxiIn(long), timeInAir(long)]).toEqual([15 * MINUTE, 7 * MINUTE, 8 * 60 * MINUTE - 22 * MINUTE])
    const short = makeFlightPlan(DEPARTURE, DEPARTURE + 30 * MINUTE, 100_000)!
    expect([taxiOut(short), taxiIn(short)]).toEqual([0, 0])
  })

  it('is null for a leg that arrives no later than it leaves', () => {
    expect(makeFlightPlan(DEPARTURE, DEPARTURE, 1_000_000)).toBeNull()
    expect(makeFlightPlan(DEPARTURE, DEPARTURE - MINUTE, 1_000_000)).toBeNull()
  })

  it("gives a leg that goes nowhere the descent's speed", () => {
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 60 * MINUTE, 0)!
    expect(plan.isSteady).toBe(true)
    expect(plan.speed).toBe(DESCENT_SPEED)
  })
})

describe("the plan as the plane flies it (Stage 3 spec §4, the plane's own speed)", () => {
  it.each(LIVE_CASES.flights)("flies the shared case's speed and keeps the schedule's times: $name", (c) => {
    const { plan, path } = made(c)
    const flown = flownPlan(plan, path)
    expectNear(knots(flown.speed), c.flownSpeedKt, NEAR.kt, 'flown speed')
    expect({ ...flown, speed: 0 }).toEqual({ ...plan, speed: 0 })
  })

  it('is the plane\'s own speed in some of the shared cases, so the cases test it', () => {
    const own = LIVE_CASES.flights.filter((c) => {
      const { plan, path } = made(c)
      return flownPlan(plan, path).speed !== plan.speed
    })
    expect(own.length).toBeGreaterThan(0)
  })

  it('takes no own speed that isn\'t a number', () => {
    const { plan, path } = made(LIVE_CASES.flights[0])
    expect(flownPlan(plan, { ...path, ownSpeed: NaN })).toBe(plan)
  })

  it('is the plan along a path nobody saw', () => {
    const path = makeFlightPath(airport('SDF'), airport('PHL'))
    const plan = makeFlightPlan(DEPARTURE, DEPARTURE + 105 * MINUTE, path.length)!
    expect(flownPlan(plan, path)).toBe(plan)
  })
})
