import { describe, expect, it } from 'vitest'
import type { LandingForecast } from '../../src/data/weather'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legPathLength } from '../../src/facts/legCourse'
import {
  cardSummary, factsMilestones, forecastFor, hasTripSoFarRow, headline, isRecapOver, latestEvent, makeTripFacts, recapLongestLine, recapTiles,
  sheetHeadline, tripSoFar,
} from '../../src/facts/tripFacts'
import { factRows } from '../../src/facts/tripFactsRows'
import { airportMark, makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, HOUR } from '../map/tripMapLegs'
import { appGeography, box, EQUATOR, equatorFlight, flightMap, mark } from './factsTestData'
import { dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'

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

const europeMap = (now: number, options: { isNextTrip?: boolean; isRecap?: boolean } = {}) =>
  makeTripMap(EUROPE, { isNextTrip: options.isNextTrip ?? false, isRecap: options.isRecap, home: 'SDF', now, airports: AIRPORTS })!

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

  it('makes a flight with a real path a story of its own, along the path it flew', () => {
    // Not the route's, along the great circle (Stage 3 spec §8; factsStore.test.ts has how it's kept). Charlie is north
    // of Bravo, where only the real path goes.
    const seenUntil = liveTime(13)
    const real = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    const geography = makeGeography([...EQUATOR.areas, box('Charlie', 'country', 5.5, 10.5, null, 1, 3)], [])
    const facts = makeTripFacts(flightMap(real, null), { geography, comparisons: null, viewerTz: NY, h24: false })
    expect(facts.stories.eq.stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Bravo', 'the Test Sea'])
    expect(facts.stories.eq.length).toBe(legPathLength(real))
  })
})

describe('the latest event (latest event design §1)', () => {
  it('is the newest event of the flight in the air, until the next, and none at the gate', () => {
    const facts = equatorFacts()
    // Before the first event.
    expect(latestEvent(facts, t('10:59'))).toBeNull()
    expect(latestEvent(facts, Date.parse('2026-03-20T11:00:30Z'))).toEqual({
      title: 'Crossed into Bravo', when: 'Just now', sentence: 'Latest: crossed into Bravo, just now.',
    })
    expect(latestEvent(facts, t('11:12'))?.when).toBe('12 min ago')
    // It stays until the next.
    expect(latestEvent(facts, t('11:44'))?.title).toBe('Crossed into Bravo')
    expect(latestEvent(facts, t('11:46'))?.title).toBe('Halfway')
    expect(latestEvent(facts, t('12:10'))?.title).toBe('Out over the Test Sea')
    expect(latestEvent(facts, t('12:40'))).toEqual({
      title: 'Closest to home, 35 mi', when: '19 min ago', sentence: 'Latest: closest to home, 35 miles, 19 minutes ago.',
    })
    // It has reached the gate.
    expect(latestEvent(facts, t('13:30'))).toBeNull()
  })

  it('before the story is ready, is none, and the card’s sentence says nothing of it', () => {
    const facts = equatorFacts(null)
    expect(latestEvent(facts, t('11:10'))).toBeNull()
    expect(cardSummary(facts, t('11:10'), 'Alex')).toBe(`TST1 to E20. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`)
  })

  it('in a replay, says its clock time', () => {
    const facts = makeTripFacts(flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14)), {
      geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, isReplay: true,
    })
    expect(latestEvent(facts, t('11:12'))?.when).toBe(`7:00${AM} L`)
    expect(latestEvent(facts, t('11:12'))?.sentence).toBe(`Latest: crossed into Bravo, at 7:00${AM} your time.`)
  })

  it('on the ground and on a drive, is none', () => {
    // In Cologne, after a flight whose halfway, by the equator's story, has passed.
    const europe = makeTripFacts(europeMap(at(12)), { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(europe, at(6))?.title).toBe('Halfway')
    expect(latestEvent(europe, at(12))).toBeNull()
    const driving = makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0.5), airports: AIRPORTS })!
    const onTheRoad = makeTripFacts(driving, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(onTheRoad, at(0.5))).toBeNull()
    // Even were a drive given a story, with its halfway passed: an event is a flight's.
    const withAStory = { ...onTheRoad, stories: { d: equatorFacts().stories.eq } }
    expect(factsMilestones(withAStory, driving.legs[0]).some((m) => m.time <= at(0.75))).toBe(true)
    expect(latestEvent(withAStory, at(0.75))).toBeNull()
  })

  it('leaves events out of the headline beside it, which is otherwise as before', () => {
    const facts = equatorFacts()
    // As before, where the shared cases read it.
    expect(headline(facts, t('11:02'))).toBe('Just crossed into Bravo')
    expect(headline(facts, t('11:02'), false)).toBe('Over Bravo')
    expect(headline(facts, t('11:46'), false)).toBe('Over Bravo')
    expect(headline(facts, t('11:10'), false)).toBe('Over Bravo, near Testville')
  })

  it('is on the map above the full map’s panel, so the panel’s first line leaves events out', () => {
    expect(sheetHeadline(equatorFacts(), t('11:02'))).toBe('Over Bravo')
    expect(sheetHeadline(equatorFacts(), t('11:46'))).toBe('Over Bravo')
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

describe('the trip so far (Stage 2 spec §5.2, §5.5; best guesses design §4)', () => {
  it('lists this flight’s events newest first, as the flight in the air, then the totals', () => {
    const soFar = tripSoFar(equatorFacts(), t('12:30'))
    expect(soFar.flights.map((f) => f.title)).toEqual(['TST1 · E0 → E20'])
    // Newest first, so the latest is at the top, and the flight is the one in the air.
    expect(soFar.flights[0].events.map((e) => e.text)).toEqual([
      `Closest to home, 35 mi · 8:21${AM} L`, `Out over the Test Sea · 8:03${AM} L`, `Halfway · 7:45${AM} L`, `Crossed into Bravo · 7:00${AM} L`,
    ])
    // The schedule is told as it is.
    expect(soFar.flights[0].events.map((e) => e.isEstimate)).toEqual([false, false, false, false])
    expect(soFar.flights[0].tag).toBe('In the air now')
    expect(soFar.totalsTitle).toBe('Trip so far')
    expect(soFar.totals).toBe('Day 1 of 1 · 1,036 mi')
  })

  it('lists only the events that have happened', () => {
    expect(tripSoFar(equatorFacts(), t('11:50')).flights[0].events).toHaveLength(2)
  })

  it('lists the flight in the air before its first event, and an earlier flight only with an event', () => {
    // The equator flight has left the gate at 10:00 and crosses into Bravo at 11:00.
    expect(tripSoFar(equatorFacts(), t('10:30')).flights).toEqual([{ id: 'eq', title: 'TST1 · E0 → E20', tag: 'In the air now', events: [] }])
    // On the ground in Cologne the first flight is done, and with no story it has no event.
    const europe = makeTripFacts(europeMap(at(12)), { geography: null, comparisons: null, viewerTz: NY, h24: false })
    expect(tripSoFar(europe, at(12)).flights).toEqual([])
    expect(tripSoFar(europe, at(4)).flights.map((f) => [f.title, f.tag])).toEqual([['UPS201 · Louisville → Cologne', 'In the air now']])
  })

  it('lists earlier flights plain underneath the flight in the air, newest first', () => {
    // On the way home from Dubai, with the site's own geography, so each earlier flight has crossed something.
    const facts = makeTripFacts(europeMap(at(60)), { geography: appGeography(), comparisons: null, viewerTz: NY, h24: false })
    const soFar = tripSoFar(facts, at(60))
    expect(soFar.flights.map((f) => [f.title, f.tag])).toEqual([
      ['UPS203 · Dubai → Louisville', 'In the air now'], ['UPS202 · Cologne → Dubai', null], ['UPS201 · Louisville → Cologne', null],
    ])
    expect(soFar.flights.slice(1).every((f) => f.events.length > 0)).toBe(true)
  })

  it('on a layover, says "Trip so far" once, in the rows', () => {
    // The rows have "Trip so far" on a layover, so it isn't said again under the list (best guesses design §4).
    const facts = makeTripFacts(europeMap(at(12)), { geography: null, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 4 })
    expect(factRows(facts, at(12), at(12)).some((r) => r.kind === 'tripSoFar')).toBe(true)
    expect(hasTripSoFarRow(facts, at(12))).toBe(true)
    expect(tripSoFar(facts, at(12)).totals).toBeNull()
    // In flight the rows have none, so it's under the list.
    expect(factRows(facts, at(4), at(4)).some((r) => r.kind === 'tripSoFar')).toBe(false)
    expect(tripSoFar(facts, at(4)).totals).toMatch(/^Day 1 of 4 · [\d,]+ mi$/)
  })

  it('knows whether the rows have a "Trip so far" row, at every half hour of a trip, a trip ahead, a recap and a drive', () => {
    const maps: TripMap[] = [
      europeMap(at(0)),
      europeMap(at(-24), { isNextTrip: true }),
      europeMap(at(0), { isRecap: true }),
      makeTripMap([drive('d', 'LEX', 'SDF', 0, 1)], { isNextTrip: false, home: null, now: at(0), airports: AIRPORTS })!,
    ]
    let checked = 0
    for (const map of maps) {
      // With a day to tell, a "Trip so far" row always has something to say where there is one.
      const facts = makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 4 })
      for (let half = -60; half <= 200; half++) {
        const moment = at(half / 2)
        expect(hasTripSoFarRow(facts, moment), `${map.mode.kind} at ${half} half hours`).toBe(
          factRows(facts, moment, moment).some((r) => r.kind === 'tripSoFar'),
        )
        checked++
      }
    }
    expect(checked).toBe(4 * 261)
  })

  it('after a recap’s trip, is the recap', () => {
    const facts = europeRecap()
    const soFar = tripSoFar(facts, facts.map.span.end + HOUR)
    expect(soFar.totalsTitle).toBe('Trip recap')
    expect(soFar.totals).toBe('2 cities · 14,819 mi · 18 time zones · 1 sunset from the cockpit')
  })
})

describe('the card’s words (Stage 2 spec §6.4, §6.5)', () => {
  it('in flight, adds the place below to the spoken summary, and the latest event', () => {
    expect(cardSummary(equatorFacts(), t('11:10'), 'Alex')).toBe(
      `TST1 to E20, over Bravo. Lands at 9:22${AM} your time. Estimated from the schedule. Latest: crossed into Bravo, 10 minutes ago. ` +
        'Opens the full map.',
    )
    // Before its first event.
    expect(cardSummary(equatorFacts(), t('10:50'), 'Alex')).toBe(
      `TST1 to E20, over Alpha. Lands at 9:22${AM} your time. Estimated from the schedule. Opens the full map.`,
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
