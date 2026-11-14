import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import type { FactRow, FactRowKind } from '../../src/facts/factRow'
import { makeTripFacts } from '../../src/facts/tripFacts'
import { factRows, factsAtMoment } from '../../src/facts/tripFactsRows'
import { airportMark, makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, HOUR } from '../map/tripMapLegs'
import { appComparisons, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'

const NY = 'America/New_York'
const AM = ' AM'
const PM = ' PM'

const facts = (map: TripMap, forecasts: Record<string, LandingForecast> = {}) =>
  makeTripFacts(map, { geography: EQUATOR, comparisons: appComparisons(), forecasts, viewerTz: NY, h24: false })
const equator = () => flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14))
const europe = (now: number, options: { isNextTrip?: boolean; isRecap?: boolean } = {}) =>
  makeTripMap(EUROPE, { isNextTrip: options.isNextTrip ?? false, isRecap: options.isRecap, home: 'SDF', now, airports: AIRPORTS })!

function row(kind: FactRowKind, rows: FactRow[]): FactRow {
  const found = rows.find((r) => r.kind === kind)
  if (!found) throw new Error(`no ${kind} row`)
  return found
}

describe('the rows in flight (Stage 2 spec §5.1)', () => {
  const shown = Date.parse('2026-03-20T11:10:00Z')

  it('are below, distance and landing, with no sky row at midday eastbound', () => {
    const rows = factRows(facts(equator()), shown, shown)
    expect(rows.map((r) => r.kind)).toEqual(['below', 'distance', 'headed'])

    expect(row('below', rows)).toMatchObject({ icon: 'MapPin', title: 'Over Bravo, near Testville', detail: `Passes 35 mi from home at 8:21${AM}` })
    expect(row('distance', rows)).toMatchObject({
      icon: 'Path', title: '422 mi flown · 960 to go',
      detail: `Halfway at 7:45${AM} · Averaging about 460 mph · like driving the Alaska Highway`,
    })
    expect(row('headed', rows)).toMatchObject({ icon: 'AirplaneLanding', title: `Lands E20 9:22${AM}`, detail: null })
  })

  it('show weather only for a landing still ahead in real time', () => {
    const withWeather = facts(equator(), { eq: { temperature: 81, unit: 'fahrenheit', code: 0 } })
    const live = row('headed', factRows(withWeather, shown, shown))
    expect(live.detail).toBe('81°F and clear on landing')
    expect(live.hasWeather).toBe(true)

    const replayed = row('headed', factRows(withWeather, shown, Date.parse('2026-03-20T14:00:00Z')))
    expect(replayed.detail).toBeNull()
    expect(replayed.hasWeather).toBe(false)
  })

  it('give the sky before a cockpit sunset', () => {
    const start = Date.parse('2026-11-13T18:00:00Z')
    const leg: MapLeg = { id: 'evening', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
    const now = Date.parse('2026-11-13T20:30:00Z')
    expect(row('sky', factRows(facts(flightMap(leg, null)), now, now))).toMatchObject({
      icon: 'SunHorizon', title: 'Flying into the night', detail: 'Sunset in 17 min, about 21 min after the people below',
    })
  })
})

describe('the rows on the ground (Stage 2 spec §5.3, §5.4, §5.5)', () => {
  it('on a layover in Cologne, are where, the next flight and the trip so far', () => {
    const rows = factRows(facts(europe(at(12))), at(12), at(12))
    expect(rows.map((r) => r.kind)).toEqual(['whereTheyAre', 'nextFlight', 'tripSoFar'])
    expect(row('whereTheyAre', rows)).toMatchObject({ title: 'In Cologne', detail: `6 hours ahead of you · sunrise at 7:45${AM} there` })
    expect(row('nextFlight', rows)).toMatchObject({
      title: `Next: Dubai, tomorrow 3:00${PM}`, detail: `3,086 mi, like driving coast to coast · lands 6:00${AM} there`,
    })
    expect(row('tripSoFar', rows).detail).toBe('1 city · 4,351 mi · 6 time zones · 1 sunset from the cockpit')
  })

  it('at home the day before, are when they leave, the trip ahead and on the way', () => {
    const rows = factRows(facts(europe(at(-24), { isNextTrip: true })), at(-24), at(-24))
    expect(rows.map((r) => r.kind)).toEqual(['leaves', 'tripAhead', 'onTheWay'])
    expect(row('leaves', rows)).toMatchObject({ title: `Leaves tomorrow 7:00${AM}`, detail: 'UPS201 to Cologne' })
    expect(row('tripAhead', rows).detail).toBe('4 days · Cologne, Dubai · 14,819 mi · like digging straight through the Earth twice')
    expect(row('onTheWay', rows).detail).toBe('18 time zones · a sunset from the cockpit')
  })

  it('after a recap’s trip, are the trip, on the way and the longest flight', () => {
    const map = europe(at(0), { isRecap: true })
    const later = map.span.end + HOUR
    const rows = factRows(facts(map), later, later)
    expect(rows.map((r) => r.kind)).toEqual(['theTrip', 'onTheWay', 'longestFlight'])
    expect(row('theTrip', rows).detail).toBe('4 days · Cologne, Dubai · 14,819 mi · like digging straight through the Earth twice')
    expect(row('onTheWay', rows).detail).toBe('18 time zones · 1 sunset from the cockpit')
    expect(row('longestFlight', rows).detail).toBe('Dubai → Louisville, 7,382 mi')
  })

  it('on a drive with nothing flown, are none', () => {
    const map = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0.5), airports: AIRPORTS })!
    expect(factRows(facts(map), at(0.5), at(0.5))).toEqual([])
  })
})

describe('the facts at a moment', () => {
  it('gather the headline, the rows and the trip so far', () => {
    const shown = Date.parse('2026-03-20T11:10:00Z')
    const moment = factsAtMoment(facts(equator()), shown, shown)
    expect(moment.headline).toBe('Over Bravo, near Testville')
    expect(moment.rows).toHaveLength(3)
    expect(moment.tripSoFar.totalsTitle).toBe('Trip so far')
  })
})
