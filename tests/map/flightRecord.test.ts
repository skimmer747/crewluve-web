import { describe, expect, it } from 'vitest'
import { makeFlightPath } from '../../src/map/flightPath'
import { flownPlan, makeFlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, recordDistanceAt, recordPositionAt, recordTimeAt } from '../../src/map/flightRecord'
import { METERS_PER_NM } from '../../src/map/greatCircle'
import { airport, at, expectNear, expectPlace, LIVE_CASES, made, NEAR, nm } from './liveCases'

const MINUTE = 60_000
const withRecords = LIVE_CASES.flights.filter((c) => c.record != null)

describe('the record: where the plane was when (Stage 3 spec §7.2)', () => {
  it('has shared cases with records and without', () => {
    expect(withRecords.length).toBeGreaterThan(0)
    expect(withRecords.length).toBeLessThan(LIVE_CASES.flights.length)
  })

  it.each(LIVE_CASES.flights)('matches the shared case: $name', (c) => {
    const { record } = made(c)
    expect(record == null).toBe(c.record == null)
    if (!record || !c.record) return
    expect(record.takeoff == null).toBe(c.record.takeoff == null)
    if (record.takeoff != null && c.record.takeoff != null) expectNear(record.takeoff, at(c.record.takeoff), NEAR.ms, 'takeoff')
    expectNear(record.touchdown, at(c.record.touchdown), NEAR.ms, 'touchdown')
    for (const place of c.record.places) {
      expectNear(nm(recordDistanceAt(record, at(place.at))), place.alongNm, NEAR.nm, `along at ${place.at}`)
      expectPlace(recordPositionAt(record, at(place.at)), place.point, `place at ${place.at}`)
    }
    for (const time of c.record.times) expectNear(recordTimeAt(record, time.alongNm * METERS_PER_NM), at(time.at), NEAR.ms, `time at ${time.alongNm} nm`)
  })

  it.each(withRecords)('is its own inverse wherever the plane didn\'t jump: $name', (c) => {
    const record = made(c).record!
    const { knots } = record.path
    // Two places seen at one time are a jump, and no moment is part way across it.
    const jumps = knots.slice(1).flatMap((later, i) => (later.time === knots[i].time ? [[knots[i].distance, later.distance]] : []))
    for (let share = 0.01; share <= 0.99; share += 0.07) {
      const distance = record.path.length * share
      if (jumps.some(([from, to]) => distance >= from && distance <= to)) continue
      expectNear(recordDistanceAt(record, recordTimeAt(record, distance)), distance, 0.5, `at ${share.toFixed(2)} of the way`)
    }
  })

  it.each(withRecords)('never goes backwards, and ends at the arrival airport: $name', (c) => {
    const record = made(c).record!
    const end = Math.max(at(c.arrival) + 3 * 60 * MINUTE, record.touchdown + 97_000)
    let last = -1
    for (let t = at(c.departure) - 60 * MINUTE; t < end; t += 97_000) {
      const distance = recordDistanceAt(record, t)
      expect(distance, `at ${new Date(t).toISOString()}`).toBeGreaterThanOrEqual(last)
      last = distance
    }
    expect(last).toBeCloseTo(record.path.length, 6)
  })

  it.each(withRecords)('flies the plan as the plane flies it after the last place seen: $name', (c) => {
    const { plan, path, record } = made(c)
    expect(record!.plan).toBe(plan)
    expect(record!.flownPlan).toEqual(flownPlan(plan, path))
  })

  it('is null for a path with no place seen', () => {
    const path = makeFlightPath(airport('SDF'), airport('PHL'))
    const departure = Date.UTC(2027, 0, 15, 12)
    expect(makeFlightRecord(path, makeFlightPlan(departure, departure + 105 * MINUTE, path.length)!)).toBeNull()
  })
})
