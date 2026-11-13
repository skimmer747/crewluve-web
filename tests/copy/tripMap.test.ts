import { describe, expect, it } from 'vitest'
import {
  cardChips, dateRangeText, dayPhrase, landingCountdown, landingLine, landsAt, arrivalLocalTime, nextDepartureChip,
  nextTripChip, placeChip, statsItems, timelineTime, tripMapSummary,
} from '../../src/copy/tripMap'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

const NY = 'America/New_York'
/** Friday 2026-11-13, 3:14 PM in Louisville and 9:14 PM in Cologne. */
const NOW = Date.UTC(2026, 10, 13, 20, 14)
const PM = ' PM'
const AM = ' AM'
const mark = (code: string) => airportMark(code, AIRPORTS)!
const leg = (from: string, to: string, start: number, end: number): MapLeg => ({
  id: 'f', kind: 'flight', origin: mark(from), destination: mark(to), start, end, flightNumber: 'UPS207',
})
const MIN = 60_000

describe('the trip map words (moving map spec §5, §6, §14)', () => {
  it('names the place and its time there', () => {
    expect(placeChip(mark('CGN'), NOW, false)).toBe(`Cologne · 9:14${PM} there`)
  })

  it('names the next departure in your time', () => {
    expect(nextDepartureChip(leg('CGN', 'DXB', NOW + (14 * 60 + 56) * MIN, NOW + 21 * 60 * MIN), NOW, NY, false)).toBe(`Next: Dubai, tomorrow 6:10${AM}`)
  })

  it('counts down to landing', () => {
    const lands = (minutes: number) => landingCountdown(leg('SDF', 'CGN', NOW - 60 * MIN, NOW + minutes * MIN), NOW)
    expect([lands(130), lands(120), lands(45), lands(-1)]).toEqual(['Landing in 2 h 10 min', 'Landing in 2 h', 'Landing in 45 min', 'Landing now'])
  })

  it('gives the landing in both times, or one when it is yours', () => {
    const away = leg('SDF', 'CGN', NOW - 360 * MIN, NOW + 16 * MIN)
    expect(landingLine(away, NY, false)).toBe(`Lands Cologne 9:30${PM} · 3:30${PM} your time`)
    expect(landsAt(away, NY, false)).toBe(`Lands 3:30${PM}`)
    expect(arrivalLocalTime(away, NY, false)).toBe(`9:30${PM} in Cologne`)
    const home = leg('CGN', 'SDF', NOW - 360 * MIN, NOW + 16 * MIN)
    expect(landingLine(home, NY, false)).toBe(`Lands Louisville 3:30${PM}`)
    expect(arrivalLocalTime(home, NY, false)).toBeNull()
    expect(landsAt(away, NY, true)).toBe('Lands 15:30')
  })

  it('says today, tomorrow, a weekday or a date', () => {
    const day = 86_400_000
    expect([0, 1, 5, 7].map((n) => dayPhrase(NOW + n * day, NOW, NY))).toEqual(['today', 'tomorrow', 'Wednesday', 'Nov 20'])
    expect(nextTripChip(NOW + 5 * day, NOW, NY)).toBe('Home · next trip Wednesday')
  })

  it('gives a trip’s days, or its dates when it runs a week', () => {
    const day = 86_400_000
    expect(dateRangeText(NOW + 7 * day, NOW + 10 * day, NY)).toBe('Fri–Mon')
    expect(dateRangeText(NOW, NOW + 3_600_000, NY)).toBe('Fri')
    expect(dateRangeText(NOW, NOW + 7 * day, NY)).toBe('Nov 13–Nov 20')
  })

  it('fills the bar on a layover and before a trip', () => {
    const resting = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const items = statsItems(resting, at(12), 1, 4, NY)
    expect(items[0]).toBe('Day 1 of 4')
    expect(items[1]).toBe('2 cities')
    expect(items[2]).toMatch(/^[\d,]+ mi so far$/)
    const ahead = makeTripMap(EUROPE, { isNextTrip: true, home: 'SDF', now: at(-24), airports: AIRPORTS })!
    const next = statsItems(ahead, at(-24), null, null, NY)
    expect(next.slice(0, 2)).toEqual(['Fri–Mon', 'CGN · DXB'])
    expect(next[2]).toMatch(/^[\d,]+ mi$/)
  })

  it('puts the right words on the card in each mode', () => {
    const flying = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    expect(cardChips(flying, at(4), NY, false)).toEqual({ top: null, bottom: 'Landing in 4 h' })
    const resting = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const chips = cardChips(resting, at(12), NY, false)
    expect(chips.top?.startsWith('Cologne · ')).toBe(true)
    expect(chips.bottom?.startsWith('Next: Dubai, ')).toBe(true)
  })

  it('reads the card as one sentence', () => {
    const flying = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    expect(tripMapSummary(flying, at(4), 'Alex', NY, false)).toBe(
      `${flying.legs[0].flightNumber} to Cologne, landing at 3:00${PM} your time. Estimated from the schedule. Opens the full map.`,
    )
    const ahead = makeTripMap(EUROPE, { isNextTrip: true, home: 'SDF', now: at(-24), airports: AIRPORTS })!
    expect(tripMapSummary(ahead, at(-24), 'Alex', NY, false)).toBe('Map of the next trip, tomorrow: Cologne, Dubai. Opens the full map.')
  })

  it('gives the timeline a weekday and a time', () => {
    expect(timelineTime(NOW, NY, false)).toBe(`Fri 3:14${PM}`)
  })

  it('names a drive under way, and leaves out the counts a trip without flights lacks', () => {
    const commute = makeTripMap([drive('d1', 'LEX', 'SDF', 0, 1.5)], { isNextTrip: false, home: 'SDF', now: at(0.5), airports: AIRPORTS })!
    expect(statsItems(commute, at(0.5), null, null, NY)).toEqual([])
    expect(cardChips(commute, at(0.5), NY, false).top).toBe('Driving to Louisville')
    expect(tripMapSummary(commute, at(0.5), 'Alex', NY, false)).toBe('Trip map. Alex is driving to Louisville. Opens the full map.')
  })

  it('reads a next trip that only comes home without an empty list of cities', () => {
    const homeward = makeTripMap([flight('f9', 'CGN', 'SDF', 30, 9)], { isNextTrip: true, home: 'SDF', now: at(0), airports: AIRPORTS })!
    expect(tripMapSummary(homeward, at(0), 'Alex', NY, false)).toBe('Map of the next trip, tomorrow. Opens the full map.')
  })
})
