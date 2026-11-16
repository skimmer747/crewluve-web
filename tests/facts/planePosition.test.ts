import { describe, expect, it } from 'vitest'
import { legPathLength, legPath } from '../../src/facts/legCourse'
import { legPlane, mapFlightPlane } from '../../src/facts/planePosition'
import { flightDrawing } from '../../src/map/flightDrawing'
import { METERS_PER_NM, type GeoPoint } from '../../src/map/greatCircle'
import type { LiveFix, LiveFlight } from '../../src/map/liveFlight'
import { isMoving, legDistanceMeters, legProgress, positionAtTime } from '../../src/map/tripMap'
import { at, expectNear, LIVE_CASES } from '../map/liveCases'
import { equatorFlight } from './factsTestData'
import { caseMapFlight, caseMapLeg, caseMoment, caseNamed, date, dogLeg, equatorLive, equatorLiveLeg, liveTime, METERS_A_DEGREE } from './liveFacts'

/**
 * Where the facts have a flight's plane (Stage 3 spec §8), as the app's PlanePositionTests: wherever the map draws it,
 * for every moment of the shared cases in tests/fixtures/trip-map/live-cases.json, and where the record has it in a
 * replay.
 */

const SECOND = 1000

/** Both places there, and within `accuracy` of a degree. */
function expectSame(place: GeoPoint | null | undefined, expected: GeoPoint | null | undefined, what: string, accuracy = 1e-9) {
  expect(place != null && expected != null, `a place is missing: ${what}`).toBe(true)
  if (!place || !expected) return
  expectNear(place.lat, expected.lat, accuracy, `${what}, latitude`)
  expectNear(place.lng, expected.lng, accuracy, `${what}, longitude`)
}

describe('the plane now (Stage 3 spec §8)', () => {
  it('at every shared moment, is where the map draws the plane', () => {
    let real = 0
    let scheduled = 0
    for (const flightCase of LIVE_CASES.flights) {
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const t = at(moment.at)
        const leg = caseMapLeg(flightCase, moment)
        if (!isMoving(leg, t)) continue
        const drawing = flightDrawing(leg, t, false)
        const plane = legPlane(leg, t, false)
        const drawn = drawing.realPlane
        if (drawn) {
          expectSame(plane.place, drawn.place, what)
          expect(plane.isEstimated, what).toBe(drawn.isEstimated)
          expect(plane.isEstimated, what).toBe(moment.phase === 'estimated')
          expect(plane.isSeenInAir, what).toBe(moment.phase === 'inAir')
          // A plane on the ground somewhere else isn't on the path: it counts as far as it was last seen.
          expectNear(plane.distance / METERS_PER_NM, moment.planeAlongNm ?? flightCase.path.flownNm, 0.01, what)
          real += 1
        } else {
          expectSame(plane.place, drawing.plane?.place, what)
          expectNear(plane.distance, legProgress(leg, t) * legPathLength(leg), 0.001, what)
          expect(plane.isEstimated, what).toBe(false)
          expect(plane.isSeenInAir, what).toBe(false)
          scheduled += 1
        }
      }
    }
    expect(real, "the cases' real planes").toBeGreaterThan(20)
    expect(scheduled, "and the moments with the schedule's plane alone").toBeGreaterThan(2)
  })

  it("an estimated plane says how long ago it was seen, by Crewlu Cloud's clock", () => {
    const flightCase = caseNamed('ahead, in the air')
    const seenAt = caseMapFlight(flightCase).live!.fix!.seenAt

    const estimated = caseMoment(flightCase, '13T12:45:00')
    const plane = mapFlightPlane(caseMapFlight(flightCase), at(estimated.at), false)
    expectNear(plane!.unseenFor!, at(estimated.at) - seenAt, 1, 'unseen for')

    // This browser's clock is ten minutes slow: by Crewlu Cloud's the plane was last seen ten minutes longer ago.
    const inAir = caseMoment(flightCase, '13T12:41:50')
    const slow = mapFlightPlane(caseMapFlight(flightCase, 600 * SECOND), at(inAir.at), false)
    expectNear(slow!.unseenFor!, at(inAir.at) - seenAt + 600 * SECOND, 1, 'unseen for, by the slow clock')
    expect(slow?.isSeenInAir).toBe(false)
  })

  it('a plane seen in the air is no estimate', () => {
    const flightCase = caseNamed('ahead, in the air')
    const moment = caseMoment(flightCase, '13T12:41:50')
    const plane = mapFlightPlane(caseMapFlight(flightCase), at(moment.at), false)
    expect(plane).not.toBeNull()
    expect(plane!.unseenFor).toBeNull()
    expect(plane!.isSeenInAir).toBe(true)
  })

  it('on the ground somewhere else, counts as far as it was last seen flying', () => {
    // It was seen flying as far as 6.75° E, and came down at a field off its path.
    const flown = equatorLive(date('2026-03-20T11:09:00Z'))
    const down = date('2026-03-20T11:30:00Z')
    const fix: LiveFix = { place: { lat: 1.5, lng: 7 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: down }
    const live: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'ground', fix, landedAt: null, trail: flown.trail }
    const leg = equatorLiveLeg(live, down)

    const plane = legPlane(leg, down, false)
    expectSame(plane.place, fix.place, 'where it is')
    expectNear(plane.distance, legPath(leg).flownLength, 0.001, 'as far as it was last seen')
    expectNear(plane.distance, 6.75 * METERS_A_DEGREE, 1_000, '6.75° E')
    expect(plane.isEstimated).toBe(false)
    expect(plane.isSeenInAir).toBe(false)
  })

  it("a flight that isn't live, with a real path, is the schedule's plane, that share of the way along it", () => {
    // It flew north of the great circle as far as 8° E, went back, and has sat at the gate unseen for ten minutes.
    const flown = equatorLive(liveTime(8), { latitude: dogLeg })
    const now = date('2026-03-20T12:00:00Z')
    const fix: LiveFix = { place: { lat: 0, lng: 0 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: now - 600 * SECOND }
    const live: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'ground', fix, landedAt: null, trail: flown.trail }
    const leg = equatorLiveLeg(live, now)
    expect(mapFlightPlane(leg.flight!, now, false), 'no real plane shows').toBeNull()
    expect(legPathLength(leg)).toBeGreaterThan(legDistanceMeters(leg))

    const plane = legPlane(leg, now, false)
    expectSame(plane.place, flightDrawing(leg, now, false).plane?.place, "where the map draws the schedule's plane")
    expectNear(plane.distance, legProgress(leg, now) * legPathLength(leg), 0.001, 'that share of the way along its path')
    expect(plane.isEstimated).toBe(false)
  })
})

describe('the plane in a replay (Stage 3 spec §8)', () => {
  it('at every place of the shared records, is where the record has it', () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      if (!flightCase.record) continue
      const flight = caseMapFlight(flightCase)
      for (const place of flightCase.record.places) {
        const what = `${flightCase.name} at ${place.at}`
        const plane = mapFlightPlane(flight, at(place.at), true)
        expect(plane, what).not.toBeNull()
        expectNear(plane!.distance / METERS_PER_NM, place.alongNm, 0.01, what)
        expectSame(plane!.place, { lat: place.point[0], lng: place.point[1] }, what, 0.0001)
        expect(plane!.isSeenInAir, `its height and speed are for now only: ${what}`).toBe(false)
        checked += 1
      }
    }
    expect(checked, "the cases' places").toBeGreaterThan(20)
  })

  it('past where it was last seen, is an estimate, and says for how long', () => {
    const flight = caseMapFlight(caseNamed('ahead, in the air'))
    const knots = flight.path.knots
    expect(knots.length).toBeGreaterThan(0)
    const lastSeen = knots[knots.length - 1].time

    const before = mapFlightPlane(flight, lastSeen - 300 * SECOND, true)
    expect(before).not.toBeNull()
    expect(before!.unseenFor, 'where it was seen, the replay shows it as it was').toBeNull()

    const after = mapFlightPlane(flight, lastSeen + 1200 * SECOND, true)
    expect(after).not.toBeNull()
    expectNear(after!.unseenFor!, 1200 * SECOND, 1, 'unseen for')
    expect(after!.distance).toBeGreaterThan(flight.path.flownLength)
  })

  it('a flight that landed is never an estimate', () => {
    const flight = caseMapFlight(caseNamed('landed, seen all the way'))
    expect(flight.record).not.toBeNull()
    const plane = mapFlightPlane(flight, flight.record!.touchdown + 3600 * SECOND, true)
    expect(plane).not.toBeNull()
    expect(plane!.unseenFor).toBeNull()
    expectNear(plane!.distance, flight.path.length, 0.001, 'at the arrival airport')
  })

  it("with no record, is the schedule's plane", () => {
    const flightCase = caseNamed('no live data')
    expect(mapFlightPlane(caseMapFlight(flightCase), at(flightCase.departure) + 3600 * SECOND, true)).toBeNull()

    const leg = caseMapLeg(flightCase, flightCase.moments[0])
    const t = at(flightCase.departure) + 3600 * SECOND
    const plane = legPlane(leg, t, true)
    expectNear(plane.distance, legProgress(leg, t) * legDistanceMeters(leg), 0.001, 'that share of the way')
    expectSame(plane.place, positionAtTime(leg, t), "the schedule's plane")
  })
})

describe('the plane of a leg made by hand', () => {
  it("is the schedule's plane", () => {
    const leg = equatorFlight(0, 20)
    const t = date('2026-03-20T11:45:00Z')
    const plane = legPlane(leg, t, false)
    expectNear(plane.distance, legDistanceMeters(leg) / 2, 0.001, 'halfway through its time in the air')
    expectSame(plane.place, { lat: 0, lng: 10 }, '10° E', 1e-6)
  })
})
