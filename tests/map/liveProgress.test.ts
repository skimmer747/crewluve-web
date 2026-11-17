import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { makeFlightPath, pointAtDistance } from '../../src/map/flightPath'
import { makeFlightPlan } from '../../src/map/flightPlan'
import { makeFlightRecord, recordDistanceAt } from '../../src/map/flightRecord'
import { distanceMeters, METERS_PER_NM, pointAlong } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { AIRPORT_RADIUS, FRESH_FOR_MS, gapMinutes, liveProgress } from '../../src/map/liveProgress'
import { airport, at, expectNearOrNull, expectPlace, LIVE_CASES, made, NEAR } from './liveCases'

const MINUTE = 60_000

const nmOrNull = (meters: number | null) => (meters == null ? null : meters / METERS_PER_NM)
const atOrNull = (iso: string | null) => (iso == null ? null : at(iso))

describe('the real plane at a moment (Stage 3 spec §5, §7.1)', () => {
  it("uses the shared cases' constants", () => {
    expect(FRESH_FOR_MS).toBe(LIVE_CASES.constants.freshSeconds * 1000)
    expect(AIRPORT_RADIUS).toBe(LIVE_CASES.constants.airportRadiusNm * METERS_PER_NM)
  })

  it.each(LIVE_CASES.flights)('matches every moment of the shared case: $name', (c) => {
    const { plan, path, record, flight } = made(c)
    expect(c.moments.length).toBeGreaterThan(0)
    for (const moment of c.moments) {
      const what = (field: string) => `${moment.at} ${field}`
      const progress = liveProgress(plan, path, record, flight, at(moment.at))
      expect(progress.phase, what('phase')).toBe(moment.phase)
      expectNearOrNull(progress.touchdown, atOrNull(moment.touchdown), NEAR.ms, what('touchdown'))
      expectNearOrNull(progress.liveArrival, atOrNull(moment.liveArrival), NEAR.ms, what('live arrival'))
      expect(progress.gapMinutes, what('gap')).toBe(moment.gapMinutes)
      expect(progress.label && liveLabelText(progress.label), what('label')).toBe(moment.label)
      expectNearOrNull(nmOrNull(progress.planeDistance), moment.planeAlongNm, NEAR.nm, what('plane along'))
      expectPlace(progress.plane, moment.plane, what('plane'))
      expectNearOrNull(nmOrNull(progress.ghostDistance), moment.ghostAlongNm, NEAR.nm, what('ghost along'))
      expectPlace(progress.ghostDistance == null ? null : pointAtDistance(path, progress.ghostDistance), moment.ghost, what('ghost'))
      expectNearOrNull(progress.start, at(moment.start), NEAR.ms, what('start'))
      expectNearOrNull(progress.end, at(moment.end), NEAR.ms, what('end'))
    }
  })

  it('has a moment in every phase among the shared cases', () => {
    const phases = new Set(LIVE_CASES.flights.flatMap((c) => c.moments.map((m) => m.phase)))
    expect([...phases].sort()).toEqual(['elsewhere', 'estimated', 'inAir', 'landed', 'notLive', 'onGround', 'returned'])
  })

  it('agrees with the record wherever the plane is estimated', () => {
    let checked = 0
    for (const c of LIVE_CASES.flights) {
      const { plan, path, record, flight } = made(c)
      for (const moment of c.moments.filter((m) => m.phase === 'estimated')) {
        const progress = liveProgress(plan, path, record, flight, at(moment.at))
        expect(progress.planeDistance!).toBeCloseTo(recordDistanceAt(record!, at(moment.at)), 3)
        expect(progress.touchdown!).toBeCloseTo(record!.touchdown, 3)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('never puts an estimated plane behind the last place it was seen', () => {
    // A trail point newer than the fix, which Crewlu Cloud doesn't send: flown on from the fix, the plane would go back.
    const origin = airport('SDF')
    const destination = airport('PHL')
    const departure = Date.UTC(2027, 0, 15, 12)
    const plan = makeFlightPlan(departure, departure + 105 * MINUTE, distanceMeters(origin, destination))!
    const seenAt = departure + 40 * MINUTE
    const flight: LiveFlight = {
      legId: 'leg',
      callsign: 'UPS1234',
      state: 'airborne',
      fix: { place: pointAlong(origin, destination, 0.3), altitudeFt: 35_000, groundSpeedKt: 450, trackDeg: 80, onGround: false, registration: null, typeCode: null, seenAt },
      landedAt: null,
      trail: [{ time: seenAt + 10 * MINUTE, place: pointAlong(origin, destination, 0.5), altitudeFt: 35_000 }],
    }
    const path = makeFlightPath(origin, destination, flight)
    const progress = liveProgress(plan, path, makeFlightRecord(path, plan), flight, seenAt + 4 * MINUTE)
    expect(progress.phase).toBe('estimated')
    expect(progress.planeDistance).toBe(path.flownLength)
  })
})

describe('the gap in minutes (Stage 3 spec §5.3)', () => {
  it.each(LIVE_CASES.gaps)('rounds $aheadSeconds s to $gapMinutes, halves away from zero', ({ aheadSeconds, gapMinutes: minutes }) => {
    expect(gapMinutes(aheadSeconds * 1000)).toBe(minutes)
  })

  it('holds a time that can\'t be right to a year either way', () => {
    expect([1e30, -1e30, Infinity, -Infinity, NaN].map(gapMinutes)).toEqual([525_600, -525_600, 525_600, -525_600, 0])
    expect(gapMinutes(525_599 * 60_000)).toBe(525_599)
  })

  it('is never minus nothing', () => {
    expect(Object.is(gapMinutes(-20_000), 0)).toBe(true)
  })
})
