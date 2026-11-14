import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import type { Geography } from '../../src/facts/geography'
import {
  cardSummary, forecastFor, headline, isRecapOver, makeTripFacts, recapLongestLine, recapTiles, sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, EUROPE, HOUR } from '../map/tripMapLegs'
import { EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'

/**
 * The flight along the equator crosses into Bravo at 11:00 UTC, is halfway at 11:45, out over the Test Sea at 12:03
 * and closest to home (35 mi) at 12:21: 7:00, 7:45, 8:03 and 8:21 AM in Louisville.
 */
const NY = 'America/New_York'
const AM = ' AM'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)

function equatorFacts(geography: Geography | null = EQUATOR, forecasts: Record<string, LandingForecast> = {}) {
  return makeTripFacts(flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14)), { geography, comparisons: null, forecasts, viewerTz: NY, h24: false, day: 1, days: 1 })
}

const europeRecap = () =>
  makeTripFacts(makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(0), airports: AIRPORTS })!, { geography: null, comparisons: null, viewerTz: NY, h24: false })

describe('the headline (Stage 2 spec §4.4)', () => {
  it('in flight, is a recent milestone, else the place below', () => {
    const facts = equatorFacts()
    expect(headline(facts, t('11:02'))).toBe('Just crossed into Bravo')
    // The crossing was 10 minutes ago.
    expect(headline(facts, t('11:10'))).toBe('Over Bravo, near Testville')
    expect(headline(facts, t('11:46'))).toBe('Halfway!')
    expect(headline(facts, t('12:05'))).toBe('Out over the Test Sea')
    expect(headline(facts, t('12:22'))).toBe('Closest to home: 35 mi, wave!')
    expect(headline(facts, t('12:40'))).toBe('Over the Test Sea')
  })

  it('before the story is ready, is the landing countdown', () => {
    expect(headline(equatorFacts(null), t('12:10'))).toBe('Landing in 1 h 12 min')
  })

  it('puts a cockpit sunrise within 30 minutes before the place', () => {
    const start = Date.parse('2026-11-13T23:00:00Z')
    const leg: MapLeg = { id: 'night', kind: 'flight', origin: airportMark('SDF', AIRPORTS)!, destination: airportMark('CGN', AIRPORTS)!, start, end: start + 8 * HOUR, flightNumber: 'UPS207' }
    const facts = makeTripFacts(flightMap(leg, null), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, Date.parse('2026-11-14T06:17:43Z'))).toBe('Sunrise from the cockpit in 21 min')
  })

  it('on the ground, is none: Stage 1B’s words stay', () => {
    const facts = makeTripFacts(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!, { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(headline(facts, at(12))).toBeNull()
  })

  it('works out each route’s story once', () => {
    expect(equatorFacts().stories.eq).toBe(equatorFacts().stories.eq)
  })
})

describe('weather’s window (Stage 2 spec §7.3)', () => {
  it('shows only for a landing between the real now and 48 hours on', () => {
    const facts = equatorFacts(EQUATOR, { eq: { temperature: 81, unit: 'fahrenheit', code: 0 } })
    const leg = facts.map.legs[0]
    expect(forecastFor(facts, leg, t('11:10'))).not.toBeNull()
    // Already landed.
    expect(forecastFor(facts, leg, t('13:30'))).toBeNull()
    // More than 48 hours out.
    expect(forecastFor(facts, leg, leg.end - 49 * HOUR)).toBeNull()
  })
})

describe('the trip so far (Stage 2 spec §5.2, §5.5)', () => {
  it('lists this flight’s milestones, then the totals', () => {
    const soFar = tripSoFar(equatorFacts(), t('12:30'))
    expect(soFar.flights.map((f) => f.title)).toEqual(['TST1 · E0 → E20'])
    expect(soFar.flights[0].milestones).toEqual([
      `Crossed into Bravo · 7:00${AM}`, `Halfway · 7:45${AM}`, `Out over the Test Sea · 8:03${AM}`, `Closest to home, 35 mi · 8:21${AM}`,
    ])
    expect(soFar.totalsTitle).toBe('Trip so far')
    expect(soFar.totals).toBe('Day 1 of 1 · 1,036 mi')
  })

  it('lists only the milestones that have happened', () => {
    expect(tripSoFar(equatorFacts(), t('11:50')).flights[0].milestones).toHaveLength(2)
  })

  it('after a recap’s trip, is the recap', () => {
    const facts = europeRecap()
    const soFar = tripSoFar(facts, facts.map.span.end + HOUR)
    expect(soFar.totalsTitle).toBe('Trip recap')
    expect(soFar.totals).toBe('2 cities · 14,819 mi · 18 time zones · 1 sunset from the cockpit')
  })
})

describe('the card’s words (Stage 2 spec §6.4, §6.5)', () => {
  it('in flight, adds the place below to the spoken summary', () => {
    expect(cardSummary(equatorFacts(), t('11:10'), 'Alex')).toBe(
      `TST1 to E20, over Bravo. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`,
    )
  })

  it('on the recap, has the tiles, the longest flight and one sentence', () => {
    const facts = europeRecap()
    expect(recapTiles(facts)).toEqual([
      { value: '2', label: 'cities' }, { value: '14,819', label: 'miles' }, { value: '18', label: 'time zones' }, { value: '1', label: 'sunset aloft' },
    ])
    expect(recapLongestLine(facts)).toBe('Longest: Dubai → Louisville, 7,382 mi')
    expect(cardSummary(facts, facts.map.span.end, 'Alex')).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles. Opens the map to replay the trip.',
    )
  })

  it('after a recap’s trip, heads the panel "Home from 4 days away"', () => {
    const facts = europeRecap()
    expect(isRecapOver(facts, facts.map.span.end)).toBe(true)
    expect(sheetHeadline(facts, facts.map.span.end + HOUR)).toBe('Home from 4 days away')
  })
})
