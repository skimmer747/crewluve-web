import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { activityWords } from '../../src/copy/tripMap'
import { buildAirportIndex } from '../../src/data/airports'
import type { Leg } from '../../src/engine/legs'
import { activityAt, SHORTEST_LAYOVER, tripWaits } from '../../src/map/tripActivity'
import { makeTripMap, type TripMapOptions } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight, ground, HOUR } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface CaseLeg {
  id: string
  type: 'flight' | 'drive' | 'layover' | 'turn' | 'base' | 'home'
  from?: string
  to?: string
  airport?: string
  start: string
  end: string
  delayMinutes?: number
}
interface Cases {
  constants: { shortestLayoverHours: number }
  airports: Record<string, { lat: number; lon: number; city: string | null }>
  trips: { name: string; home: string | null; mode: 'trip' | 'nextTrip' | 'recap'; legs: CaseLeg[]; moments: { at: string; kind: string; words: string }[] }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/activity-cases.json', import.meta.url), 'utf8')) as Cases
const CASE_AIRPORTS = buildAirportIndex(Object.entries(cases.airports).map(([code, a]) => [code, a.city ?? '', 'US', a.lat, a.lon, 'UTC']))
const MINUTE = 60_000

/** A case's leg as the website's: a flight or a drive moved by its delay, a ground leg at its scheduled times. */
function caseLeg(l: CaseLeg): Leg {
  const shift = l.type === 'flight' || l.type === 'drive' ? (l.delayMinutes ?? 0) * MINUTE : 0
  const start = Date.parse(l.start) + shift
  const end = Date.parse(l.end) + shift
  const from = l.from ?? ''
  const to = l.to ?? ''
  if (l.type === 'flight') {
    return {
      kind: 'flight', id: l.id, tripId: 'T', dep: from, arr: to, start, end, schedStart: Date.parse(l.start), schedEnd: Date.parse(l.end),
      airline: '5X', enteredAirline: null, number: '1', deadhead: false, ground: false,
    }
  }
  if (l.type === 'drive') return { kind: 'drive', id: l.id, tripId: null, from, to, toHome: false, start, end, schedEnd: Date.parse(l.end) }
  return { kind: l.type, id: l.id, tripId: 'T', airport: l.airport ?? '', start, end }
}

describe('what the pilot is doing (activity markers design §2.2): the shared cases', () => {
  it("uses the shared cases' shortest layover", () => {
    expect(SHORTEST_LAYOVER).toBe(cases.constants.shortestLayoverHours * HOUR)
  })

  for (const trip of cases.trips) {
    it.each(trip.moments)(`${trip.name}, at $at`, (moment) => {
      const map = makeTripMap(trip.legs.map(caseLeg), {
        isNextTrip: trip.mode === 'nextTrip', isRecap: trip.mode === 'recap', home: trip.home, now: 0, airports: CASE_AIRPORTS,
      })
      const activity = map ? activityAt(map, Date.parse(moment.at)) : null
      expect(activity?.kind).toBe(moment.kind)
      expect(activity ? activityWords(activity) : null).toBe(moment.words)
    })
  }
})

describe('the waits and what the pilot is doing (activity markers design §2.2)', () => {
  const options = (overrides: Partial<TripMapOptions> = {}): TripMapOptions => ({ isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS, ...overrides })
  const europe = (extra: Leg[] = [], overrides: Partial<TripMapOptions> = {}) => makeTripMap([...EUROPE, ...extra], options(overrides))!

  it("keeps the trip's layovers, turns, stays and report time to name the waits, and draws none of them", () => {
    const map = europe([ground('l1', 'layover', 'CGN', 8, 24), ground('r1', 'report', 'SDF', -1, 1)])
    expect(map.groundStops).toEqual([{ kind: 'base', start: at(-1), end: at(0) }, { kind: 'layover', start: at(8), end: at(32) }])
    expect(map.legs.map((l) => l.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it("is at base while a commuter waits between the drive in and the first flight, named by the report time", () => {
    const legs = [drive('d1', 'LEX', 'SDF', 0, 1), ground('r1', 'report', 'SDF', 3, 1), flight('f1', 'SDF', 'CGN', 4, 8)]
    const map = makeTripMap(legs, options({ home: 'LEX', now: at(2) }))!
    expect(activityAt(map, at(2))).toMatchObject({ kind: 'base', place: { code: 'SDF' } })
    // Without the report time, a 3-hour wait would be a turn.
    expect(activityAt(makeTripMap(legs.filter((l) => l.id !== 'r1'), options({ home: 'LEX', now: at(2) }))!, at(2))?.kind).toBe('turn')
  })

  it("finds the Europe trip's two waits, layovers since each is 8 hours or more", () => {
    expect(tripWaits(europe())).toEqual([{ start: at(8), end: at(32), kind: 'layover' }, { start: at(38), end: at(58), kind: 'layover' }])
  })

  it('with no ground leg, names a wait of 8 hours a layover and one under 8 hours a turn', () => {
    const eight = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 16, 6)], options())!
    const seven = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8), flight('f2', 'CGN', 'DXB', 15, 6)], options())!
    expect(tripWaits(eight).map((w) => w.kind)).toEqual(['layover'])
    expect(tripWaits(seven).map((w) => w.kind)).toEqual(['turn'])
  })

  it('names a wait by the ground leg overlapping it most, and the earlier of two that tie', () => {
    expect(tripWaits(europe([ground('t1', 'turn', 'CGN', 8, 5), ground('b1', 'base', 'CGN', 13, 19)]))[0].kind).toBe('base')
    expect(tripWaits(europe([ground('t1', 'turn', 'CGN', 8, 12), ground('b1', 'base', 'CGN', 20, 12)]))[0].kind).toBe('turn')
  })

  it('is flying to the destination in the air, and on a layover in Cologne between flights', () => {
    const map = europe()
    expect(activityAt(map, at(4))).toEqual({ kind: 'flying', place: map.legs[0].destination })
    expect(activityAt(map, at(12))).toEqual({ kind: 'layover', place: map.legs[0].destination })
  })

  it('is home before a next trip, and at base before a trip that starts away from home', () => {
    expect(activityAt(europe([], { isNextTrip: true }), at(-2))?.kind).toBe('home')
    const fromCologne = makeTripMap([flight('f1', 'CGN', 'DXB', 0, 6)], options({ now: at(-2) }))!
    expect(activityAt(fromCologne, at(-2))?.kind).toBe('base')
  })

  it('is home after a recap, wherever the trip ended', () => {
    const recap = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 8)], options({ isRecap: true, now: at(20) }))!
    expect(activityAt(recap, at(20))?.kind).toBe('home')
  })

  it('is flying where a flight overlaps a drive, and driving before the flight leaves', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 2), flight('f1', 'LEX', 'CGN', 1, 8)], options({ now: at(0.5) }))!
    expect(activityAt(map, at(0.5))?.kind).toBe('driving')
    expect(activityAt(map, at(1.5))?.kind).toBe('flying')
  })
})
