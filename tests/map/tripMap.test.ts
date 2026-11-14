import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { pointAlong } from '../../src/map/greatCircle'
import { scheduledFraction } from '../../src/map/flightProgress'
import {
  currentLeg, dayCount, destinationsOf, framingPoints, headingAt, legInMotion, legProgress, makeTripMap, milesFlown, nextFlight, pilotLocation,
  positionAt, positionAtTime, timeAtFraction, totalMiles,
} from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight } from './tripMapLegs'

const make = (legs: Leg[] = EUROPE, now = at(12), isNextTrip = false) => makeTripMap(legs, { isNextTrip, home: 'SDF', now, airports: AIRPORTS })

describe('the trip map model (moving map spec §5.1, §7.1, §12)', () => {
  it('is in flight on the first flight while it is between its gates', () => {
    const map = make(EUROPE, at(4))!
    expect(map.mode).toEqual({ kind: 'inFlight', legId: 'f1' })
    expect(currentLeg(map)?.id).toBe('f1')
  })

  it('is on a trip, with the pilot in Cologne, on the layover', () => {
    const map = make(EUROPE, at(12))!
    expect(map.mode).toEqual({ kind: 'onTrip' })
    const place = pilotLocation(map, at(12))!
    expect([place.code, place.city, place.timeZone]).toEqual(['CGN', 'Cologne', 'Europe/Berlin'])
  })

  it('puts the pilot at home before a trip still ahead, and nowhere while a leg is moving', () => {
    const map = make(EUROPE, at(-48), true)!
    expect(map.mode).toEqual({ kind: 'nextTrip' })
    expect(pilotLocation(map, at(-48))?.code).toBe('SDF')
    expect(pilotLocation(map, at(4))).toBeNull()
  })

  it('leaves out legs with an unknown airport, and is null with nothing to draw', () => {
    expect(make([EUROPE[0], flight('f2', 'CGN', 'ZZZ', 32, 6), EUROPE[2]])!.legs.map((l) => l.id)).toEqual(['f1', 'f3'])
    expect(make([flight('x', 'ZZZ', 'YYY', 0, 2)])).toBeNull()
    expect(make([])).toBeNull()
  })

  it('draws a drive as a drive, and is never in flight on one', () => {
    const map = make([drive('d1', 'LEX', 'SDF', 0, 1.5)], at(0.5))!
    expect(map.legs[0].kind).toBe('drive')
    expect(map.mode).toEqual({ kind: 'onTrip' })
  })

  it('spans from the earliest departure to the last arrival', () => {
    expect(make()!.span).toEqual({ start: at(0), end: at(72) })
    const early = make([flight('a', 'SDF', 'CGN', 0, 8), flight('b', 'CGN', 'DXB', -1, 6)], at(-10))!
    expect(early.span.start).toBe(at(-1))
  })

  it('knows the leg in motion and the next flight', () => {
    const map = make()!
    expect(legInMotion(map, at(35))?.id).toBe('f2')
    expect(legInMotion(map, at(40))).toBeNull()
    expect(nextFlight(map, at(12))?.id).toBe('f2')
    expect(nextFlight(map, at(70))).toBeNull()
  })

  it("frames one leg's arc, or every leg and home", () => {
    const map = make(EUROPE, at(4))!
    expect(framingPoints(map, currentLeg(map))).toHaveLength(33)
    expect(framingPoints(map, null)).toHaveLength(3 * 33 + 1)
  })

  it('draws a van or bus between airports as a drive, never in flight', () => {
    const van = { ...flight('v1', 'SDF', 'LEX', 0, 1.5), ground: true }
    const map = make([van], at(0.5))!
    expect([map.legs[0].kind, map.legs[0].flightNumber, map.mode.kind]).toEqual(['drive', null, 'onTrip'])
  })

  it('moves and aims the plane by the schedule', () => {
    const leg = currentLeg(make(EUROPE, at(4))!)!
    const fraction = legProgress(leg, at(4))
    expect(fraction).toBeCloseTo(scheduledFraction(at(0), at(8), at(4)), 12)
    expect(positionAt(leg, fraction).lat).toBeCloseTo(pointAlong(leg.origin.place, leg.destination.place, fraction).lat, 9)
    expect(Math.abs(headingAt(leg, at(4))!)).toBeLessThan(Math.PI / 2)
  })
})

describe('times and places along a leg (Stage 2 spec §4.2)', () => {
  const options = { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS }

  it('gives a drive’s time steadily from start to end', () => {
    const leg = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], options)!.legs[0]
    expect(timeAtFraction(leg, 0.25)).toBe(at(0.25))
  })

  it('gives a flight’s time with the taxi allowances', () => {
    const leg = makeTripMap(EUROPE, options)!.legs[0]
    expect(timeAtFraction(leg, 0)).toBe(at(0) + 15 * 60_000)
  })

  it('places the pilot where the schedule has them', () => {
    const leg = makeTripMap(EUROPE, options)!.legs[0]
    expect(positionAtTime(leg, at(4))).toEqual(positionAt(leg, legProgress(leg, at(4))))
  })
})

describe('a trip’s destinations and miles (Stage 2 spec §4.8)', () => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!

  it('lists the airports its flights reach, each once, home left out', () => {
    expect(destinationsOf(map.legs, map.home).map((a) => a.code)).toEqual(['CGN', 'DXB'])
  })

  it('counts the miles flown by a moment, and in all', () => {
    expect(milesFlown(map.legs, at(12))).toBe(4_351)
    expect(totalMiles(map.legs)).toBe(14_819)
  })
})

describe('the recap mode (Stage 2 spec §8.2)', () => {
  const recap = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(0), airports: AIRPORTS })!

  it('is a recap whatever the moment', () => {
    expect(recap.mode).toEqual({ kind: 'recap' })
  })

  it('puts the pilot at home after the trip', () => {
    expect(pilotLocation(recap, at(80))?.code).toBe('SDF')
  })

  it('counts CrewLu’s days, else the calendar days the trip spans', () => {
    // Friday 7 AM to Monday 7 AM in Louisville.
    expect(dayCount(recap, 'America/New_York')).toBe(4)
    expect(dayCount(makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, days: 5, home: 'SDF', now: at(0), airports: AIRPORTS })!, 'America/New_York')).toBe(5)
  })
})
