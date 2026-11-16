import { describe, expect, it } from 'vitest'
import {
  coursePositionAt, hasLiveData, isSeenAt, kindAtDistance, legAirborne, legHalfwayTime, legPath, legPathLength,
  legTimeAtDistance,
} from '../../src/facts/legCourse'
import { legPlane } from '../../src/facts/planePosition'
import { METERS_PER_NM } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { legDistanceMeters, type MapLeg } from '../../src/map/tripMap'
import { at as atIso, expectNear, LIVE_CASES } from '../map/liveCases'
import { equatorFlight } from './factsTestData'
import { caseMapLeg, dogLeg, equatorLive, equatorLiveLeg, liveTime, meters } from './liveFacts'

/**
 * A leg as the facts follow it (Stage 3 spec §8), as the app's MapLegCourseTests: its path, and its times by its record
 * or by the schedule. The made-up real plane is liveFacts': a degree of longitude every 8 minutes from 10:15 UTC.
 */

const SECOND = 1000

/** That time on the day of the equator flight, the March equinox. */
const at = (time: string) => Date.parse(`2026-03-20T${time}:00Z`)

const schedule = equatorFlight(0, 20)

/** The real plane, last seen at `seenUntil`, with the leg as it's handed on then. */
const live = (seenUntil: string, unseen?: [number, number]): MapLeg => equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(seenUntil))

describe("a leg's path (Stage 3 spec §8)", () => {
  it('with no flight, is the great circle', () => {
    expect(legPath(schedule).isReal).toBe(false)
    expect(legPath(schedule).length).toBe(legDistanceMeters(schedule))
    expect(legPathLength(schedule)).toBe(legDistanceMeters(schedule))
  })

  it('is longer, for a real path that leaves the great circle', () => {
    const seenUntil = liveTime(13)
    const leg = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    expect(legPath(leg).isReal).toBe(true)
    // Each ramp is the long side of a 1° by 2° triangle: about 1.24° more than the degree it covers.
    expectNear(legPathLength(leg) - legDistanceMeters(leg), meters(2 * (Math.sqrt(5) - 1)), meters(0.05), 'the extra')
  })

  it("has the kind of the path's stretch at any distance", () => {
    const leg = live('11:10', [4, 6.5])
    expect(kindAtDistance(legPath(leg), meters(3))).toBe('seen')
    expect(kindAtDistance(legPath(leg), meters(5)), 'nobody saw it from 4° E to 6.5° E').toBe('unseen')
    expect(kindAtDistance(legPath(leg), meters(6.7))).toBe('seen')
    expect(kindAtDistance(legPath(leg), meters(15)), 'the way ahead').toBe('planned')
    expect(kindAtDistance(legPath(schedule), meters(5))).toBe('planned')
  })

  it('has live data once Crewlu Cloud has seen the flight', () => {
    expect(hasLiveData(schedule), 'a leg made by hand').toBe(false)
    expect(hasLiveData(equatorLiveLeg(null, at('11:10'))), 'no answer for the leg').toBe(false)
    const waiting: LiveFlight = { legId: 'eq', callsign: 'TST1', state: 'waiting', fix: null, landedAt: null, trail: [] }
    expect(hasLiveData(equatorLiveLeg(waiting, at('11:10'))), 'watched, and never seen').toBe(false)
    expect(hasLiveData(live('11:10'))).toBe(true)
    // Not in the app's test: a fix with no real path yet, the plane seen at its gate.
    const atTheGate: LiveFlight = {
      ...waiting, state: 'ground', fix: { place: { lat: 0, lng: 0 }, altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: null, typeCode: null, seenAt: at('10:05') },
    }
    expect(hasLiveData(equatorLiveLeg(atTheGate, at('10:05'))), 'seen at the gate').toBe(true)
  })
})

describe("a leg's times (Stage 3 spec §8)", () => {
  it("with a record, are the record's, for every shared case", () => {
    let checked = 0
    for (const flightCase of LIVE_CASES.flights) {
      const moment = flightCase.moments[0]
      if (!flightCase.record || !moment) continue
      const leg = caseMapLeg(flightCase, moment)
      for (const time of flightCase.record.times) {
        const found = legTimeAtDistance(leg, time.alongNm * METERS_PER_NM)
        expect(found, flightCase.name).not.toBeNull()
        expectNear(found!, atIso(time.at), 0.5 * SECOND, `${flightCase.name} at ${time.alongNm} nm`)
        checked += 1
      }
    }
    expect(checked, "the cases' times").toBeGreaterThan(15)
  })

  it('on the schedule, are that share of its time in the air', () => {
    expect(legTimeAtDistance(schedule, legDistanceMeters(schedule) / 4), 'a quarter of three hours after 10:15').toBe(at('11:00'))
    expect(legTimeAtDistance(schedule, 0)).toBe(at('10:15'))
    expect(legTimeAtDistance(schedule, legDistanceMeters(schedule))).toBe(at('13:15'))
  })

  it('of a leg that goes nowhere, is its takeoff', () => {
    const nowhere = equatorFlight(0, 0)
    expect(legPathLength(nowhere)).toBe(0)
    expect(legTimeAtDistance(nowhere, 0)).toBe(at('10:15'))
    expect(legHalfwayTime(nowhere), 'halfway through its time in the air, as before').toBe(at('11:45'))
  })

  it('with a record, are when the real plane was there', () => {
    const leg = live('11:10')
    expectNear(legTimeAtDistance(leg, meters(5))!, at('10:55'), 2 * SECOND, 'at 5° E')
    expect(legTimeAtDistance(schedule, meters(5)), "the schedule's plane is there five minutes later").toBe(at('11:00'))
  })

  it('halfway, on the schedule, is the middle of its time in the air', () => {
    expect(legHalfwayTime(schedule)).toBe(at('11:45'))
  })

  it('halfway, with a record, is when the real plane is halfway along its path', () => {
    // Seen as far as 6.875° E. At its own 450 kt it's at 10° E 25 minutes later.
    const leg = live('11:10')
    expectNear(legHalfwayTime(leg)!, at('11:35'), 30 * SECOND, 'halfway')
  })

  it('are seen all the way on a flight seen to its landing', () => {
    const landedAt = liveTime(20)
    const landed = equatorLiveLeg(equatorLive(liveTime(19.75), { landedAt }), landedAt)
    expect(isSeenAt(landed, meters(5))).toBe(true)
    expect(isSeenAt(landed, meters(19.9)), 'it was seen down two minutes after it was last seen in the air').toBe(true)
  })

  it('are not seen over a landing nobody saw', () => {
    // Last seen at 15.625° E at 12:30, and seen down at 20° E 25 minutes later: nobody saw its approach.
    const landedAt = liveTime(20)
    const leg = equatorLiveLeg(equatorLive(at('12:30'), { landedAt }), landedAt)
    expect(isSeenAt(leg, meters(15))).toBe(true)
    expect(isSeenAt(leg, meters(18))).toBe(false)
  })

  it('are seen only where the real plane was seen', () => {
    const leg = live('11:10', [4, 6.5])
    expect(isSeenAt(leg, meters(3))).toBe(true)
    expect(isSeenAt(leg, meters(5)), 'nobody saw it cross 5° E').toBe(false)
    expect(isSeenAt(leg, meters(6.7))).toBe(true)
    expect(isSeenAt(leg, meters(15)), "it isn't there yet").toBe(false)
    expect(isSeenAt(schedule, meters(5)), 'the schedule tells every crossing').toBe(true)
  })
})

describe("the sky's questions of a leg (Stage 3 spec §8)", () => {
  it('in the air, on the schedule, is its time in the air', () => {
    expect(legAirborne(schedule)).toEqual({ start: at('10:15'), end: at('13:15') })
  })

  it('in the air, with a record, is from leaving the airport to its touchdown', () => {
    const leg = live('11:10')
    const record = leg.flight?.record
    expect(record).toBeTruthy()
    const airborne = legAirborne(leg)
    expect(airborne).not.toBeNull()
    // The first place it was seen is 15 nm out at 10:17. At the plan's 420 kt it left about two minutes before.
    expectNear(airborne!.start, at('10:15'), 30 * SECOND, 'takeoff')
    // Not in the app's test: the record's takeoff, 10:14:51, not the schedule's 10:15 the leg's real times also give.
    expect(airborne!.start).toBeLessThan(at('10:15'))
    expect(airborne!.end).toBe(record!.touchdown)
    expect(airborne!.end, "it's ahead of the schedule").toBeLessThan(at('13:15'))
  })

  it('the course keeps moving after the plane was last seen', () => {
    const leg = live('11:10')
    expectNear(coursePositionAt(leg, at('11:10')).lng, 6.875, 0.001, 'where it was last seen')
    expectNear(coursePositionAt(leg, at('11:12')).lng, 7.125, 0.01, 'two more minutes at 450 kt')
    expectNear(legPlane(leg, at('11:12'), false).place.lng, 6.875, 0.001, 'while the plane the map draws waits where it was last seen')
  })

  it("the course, on the schedule, is the schedule's plane", () => {
    expectNear(coursePositionAt(schedule, at('11:45')).lng, 10, 1e-6, '10° E')
  })
})
