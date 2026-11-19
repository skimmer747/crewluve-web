import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import { rowSentence, type FactRow, type FactRowKind } from '../../src/facts/factRow'
import { takeoffOf } from '../../src/facts/takeoff'
import { makeTripFacts, tripSoFar, type TripFacts } from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import type { MapLeg } from '../../src/map/tripMap'
import { appComparisons, EQUATOR, equatorFlight, flightMap } from './factsTestData'
import { date, equatorLive, equatorLiveLeg, HOME_BY_THE_EQUATOR } from './liveFacts'

/**
 * The facts with every time saying whose it is (time labels design §3.3, §3.4), as the app's TimeLabelsFactsTests: the
 * takeoff row, the bold newest event, and screen readers' "your time". The made-up flight is factsTestData's, along the
 * equator from 10:00 UTC, for a family in Louisville (EDT on 20 March). Its real plane is first seen at 10:17, 17 mi from
 * the departure airport, and the schedule takes off at 10:15, after its taxi allowance. Its airports have no time zone,
 * so only the family's time shows.
 */

const NY = 'America/New_York'
const at = (hhmm: string) => date(`2026-03-20T${hhmm}:00Z`)
const plain = (text: string | null | undefined) => text?.replace(/ /g, ' ')

function factsOf(leg: MapLeg, { isReplay = false, takeoffForecasts = {} }: { isReplay?: boolean; takeoffForecasts?: Record<string, LandingForecast> } = {}): TripFacts {
  return makeTripFacts(flightMap(leg, HOME_BY_THE_EQUATOR), {
    geography: EQUATOR, comparisons: appComparisons(), viewerTz: NY, h24: false, day: 1, days: 1, isReplay, takeoffForecasts,
  })
}

/** The facts of the equator flight with its real plane last seen at `seenUntil`. */
const liveFacts = (seenUntil: string, { now, isReplay = false, unseen }: { now?: string; isReplay?: boolean; unseen?: [number, number] } = {}) =>
  factsOf(equatorLiveLeg(equatorLive(at(seenUntil), { unseen }), at(now ?? seenUntil)), { isReplay })

const rowsAt = (facts: TripFacts, t: string) => factRows(facts, at(t), at(t))
const find = (kind: FactRowKind, rows: FactRow[]) => rows.find((r) => r.kind === kind)

describe('the takeoff row (time labels design §3.3)', () => {
  it("is the real plane's takeoff, with no \"about\"", () => {
    const takeoff = find('takeoff', rowsAt(liveFacts('11:10'), '11:10'))
    expect(plain(takeoff?.title)).toBe('Took off E0 6:17 AM L')
    expect(takeoff?.icon).toBe('AirplaneTakeoff')
    expect(takeoff?.detail).toBeNull()
  })

  it("with no real plane, is the schedule's, with \"about\"", () => {
    expect(plain(find('takeoff', rowsAt(factsOf(equatorFlight(0, 20)), '11:10'))?.title)).toBe('Took off E0 about 6:15 AM L')
  })

  it("says the weather in the hour it took off, which needs Open-Meteo's credit", () => {
    const leg = equatorFlight(0, 20)
    const weather: LandingForecast = { temperature: 84.2, unit: 'fahrenheit', code: 0 }
    const takeoff = find('takeoff', rowsAt(factsOf(leg, { takeoffForecasts: { [leg.id]: weather } }), '11:10'))
    expect(takeoff?.detail).toBe('84°F and clear at takeoff')
    expect(takeoff?.hasWeather).toBe(true)
  })

  it('with no weather, has no second line', () => {
    const takeoff = find('takeoff', rowsAt(factsOf(equatorFlight(0, 20)), '11:10'))
    expect(takeoff?.detail).toBeNull()
    expect(takeoff?.hasWeather).toBe(false)
  })

  it("is left out before the schedule's takeoff, taxiing out", () => {
    expect(find('takeoff', rowsAt(factsOf(equatorFlight(0, 20)), '10:10'))).toBeUndefined()
  })

  it('is left out for a real plane first seen far out, when it left can’t be told', () => {
    // Nobody saw it before 1° E, 69 mi out.
    const rows = rowsAt(liveFacts('11:10', { unseen: [-1, 1] }), '11:10')
    expect(find('takeoff', rows)).toBeUndefined()
    expect(find('headed', rows)).toBeDefined()
  })

  it('comes just above the landing row', () => {
    const kinds = rowsAt(liveFacts('11:10'), '11:10').map((r) => r.kind)
    expect(kinds.indexOf('takeoff') + 1).toBe(kinds.indexOf('headed'))
  })

  it('says "your time" to a screen reader, as the landing row does', () => {
    const rows = rowsAt(liveFacts('11:10'), '11:10')
    expect(plain(rowSentence(find('takeoff', rows)!))).toBe('Took off E0 6:17 AM your time')
    expect(plain(rowSentence(find('headed', rows)!))).toBe('Lands E20 about 9:11 AM your time')
  })
})

describe("a leg's takeoff (time labels design §3.3)", () => {
  it("is the real plane's where it was seen close enough to tell, else nothing", () => {
    expect(takeoffOf(equatorLiveLeg(equatorLive(at('11:10')), at('11:10')))).toEqual({ time: at('10:17'), isSeen: true })
    expect(takeoffOf(equatorLiveLeg(equatorLive(at('11:10'), { unseen: [-1, 1] }), at('11:10')))).toBeNull()
  })

  it("is the schedule's, after its taxi allowance, with no real plane", () => {
    expect(takeoffOf(equatorFlight(0, 20))).toEqual({ time: at('10:15'), isSeen: false })
  })
})

describe('the newest event, bold (time labels design §3.4)', () => {
  it('is the newest of the flight in the air', () => {
    const flights = tripSoFar(liveFacts('12:30'), at('12:30')).flights
    expect(flights[0].events.map((e) => e.isCurrent)).toEqual([true, false, false, false])
  })

  it("is the newest at a replay's moment", () => {
    const flights = tripSoFar(liveFacts('12:30', { isReplay: true }), at('11:10')).flights
    expect(flights[0].events.map((e) => e.isCurrent)).toEqual([true])
  })

  it("is none of a flight that's over", () => {
    const events = tripSoFar(factsOf(equatorFlight(0, 20)), at('14:00')).flights[0].events
    expect(events.length).toBeGreaterThan(0)
    expect(events.some((e) => e.isCurrent)).toBe(false)
  })
})
