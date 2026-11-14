import { describe, expect, it } from 'vitest'
import {
  averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText, flyingInto,
  groundSunText, landsText, midLine, milestoneHeadline, milestoneLine, moonText, timeDifferenceText,
} from '../../src/copy/facts'
import { longestText, onTheWayText, recapChip, recapSummary, soFarText, totalsTiles } from '../../src/copy/factsTrip'
import type { MapLeg } from '../../src/map/tripMap'
import { mark } from '../facts/factsTestData'

const NY = 'America/New_York'
/** Friday 2026-11-13, 3:14 PM in Louisville. */
const NOW = Date.UTC(2026, 10, 13, 20, 14)
const MIN = 60_000
const PM = ' PM'

const louisville = mark('SDF', 38.17, -85.74, 'Louisville', NY)
const cologne = mark('CGN', 50.87, 7.14, 'Cologne', 'Europe/Berlin')
const toCologne: MapLeg = { id: 'f', kind: 'flight', origin: louisville, destination: cologne, start: NOW - 60 * MIN, end: NOW, flightNumber: 'UPS207' }
const home: MapLeg = { ...toCologne, origin: cologne, destination: louisville, flightNumber: null }

describe('milestones in words (Stage 2 spec §4.3)', () => {
  it('leads the headline', () => {
    expect(milestoneHeadline({ kind: 'crossedInto', name: 'Kansas' })).toBe('Just crossed into Kansas')
    expect(milestoneHeadline({ kind: 'outOver', name: 'the Atlantic' })).toBe('Out over the Atlantic')
    expect(milestoneHeadline({ kind: 'halfway' })).toBe('Halfway!')
    expect(milestoneHeadline({ kind: 'closestToHome', miles: 40 })).toBe('Closest to home: 40 mi, wave!')
  })

  it('lists them with the time in your zone', () => {
    expect(milestoneLine({ kind: 'crossedInto', name: 'Canada', time: NOW }, NY, false)).toBe(`Crossed into Canada · 3:14${PM}`)
    expect(milestoneLine({ kind: 'closestToHome', miles: 40, time: NOW }, NY, false)).toBe(`Closest to home, 40 mi · 3:14${PM}`)
  })

  it('names a flight by its number and cities', () => {
    expect(flightTitle(toCologne)).toBe('UPS207 · Louisville → Cologne')
    expect(flightTitle(home)).toBe('Cologne → Louisville')
  })
})

describe('below, the sky and the distance in words (Stage 2 spec §4.1, §4.5, §4.6)', () => {
  it('says what’s below, with a city when one is near', () => {
    const quebec = { name: 'Québec', kind: 'province' as const, country: 'Canada' }
    expect(belowWords(quebec, null)).toBe('Over Québec')
    expect(belowWords(quebec, { name: 'Montréal', lat: 45.5, lon: -73.57 })).toBe('Over Québec, near Montréal')
  })

  it('says when it passes closest to home, before and after', () => {
    expect(closestToHomeText(40, NOW + 60 * MIN, NOW, NY, false)).toBe(`Passes 40 mi from home at 4:14${PM}`)
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false)).toBe(`Closest to home was 40 mi at 3:14${PM}`)
  })

  it('counts down to a cockpit sunset, rounding up', () => {
    expect(cockpitCountdown({ kind: 'sunset', time: NOW + 24.5 * MIN, peopleBelowGap: null }, NOW)).toBe('Sunset from the cockpit in 25 min')
  })

  it('says how far the people below are behind a sunset soon', () => {
    expect(cockpitEventText({ kind: 'sunset', time: NOW + 24.5 * MIN, peopleBelowGap: 12.2 * MIN }, NOW, NY, false))
      .toBe('Sunset in 25 min, about 12 min after the people below')
  })

  it('gives the time of an event an hour or more away', () => {
    expect(cockpitEventText({ kind: 'sunrise', time: NOW + 120 * MIN, peopleBelowGap: 22 * MIN }, NOW, NY, false))
      .toBe(`Sunrise at 5:14${PM}, about 22 min before the people below`)
  })

  it('has the sky’s other lines', () => {
    expect(flyingInto('sunset')).toBe('Flying into the night')
    expect(flyingInto('sunrise')).toBe('Flying into the morning')
    expect(chaseText('afternoon')).toBe('Chasing the sun: their afternoon is stretching')
    expect(moonText({ phase: 'waxingGibbous', isUp: true })).toBe('Waxing gibbous moon, up')
    expect(moonText({ phase: 'full', isUp: false })).toBe('Full moon, below the horizon')
    expect(groundSunText('sunrise', NOW, 'Europe/Berlin', false)).toBe(`sunrise at 9:14${PM} there`)
  })

  it('counts down only under 59 minutes, so it never reads "in 60 min", as the app does', () => {
    expect(cockpitEventText({ kind: 'sunset', time: NOW + 58.5 * MIN, peopleBelowGap: null }, NOW, NY, false)).toBe('Sunset in 59 min')
    expect(cockpitEventText({ kind: 'sunset', time: NOW + 59.5 * MIN, peopleBelowGap: null }, NOW, NY, false)).toBe(`Sunset at 4:13${PM}`)
  })

  it('says the distance and speed', () => {
    expect(flownText(2_140, 1_960)).toBe('2,140 mi flown · 1,960 to go')
    expect(averageSpeedText(504)).toBe('Averaging about 500 mph')
    expect(averageSpeedText(506)).toBe('Averaging about 510 mph')
    expect(midLine('Like driving coast to coast')).toBe('like driving coast to coast')
  })
})

describe('where they’re headed in words (Stage 2 spec §4.7)', () => {
  it('says the time difference, in quarters of an hour', () => {
    expect(timeDifferenceText('Europe/Berlin', NY, NOW)).toBe('6 hours ahead of you')
    expect(timeDifferenceText('America/Los_Angeles', NY, NOW)).toBe('3 hours behind you')
    expect(timeDifferenceText('Asia/Kolkata', NY, NOW)).toBe('10½ hours ahead of you')
    expect(timeDifferenceText('America/St_Johns', 'America/Halifax', NOW)).toBe('½ hour ahead of you')
    expect(timeDifferenceText('America/Chicago', NY, NOW)).toBe('1 hour behind you')
    expect(timeDifferenceText('America/Detroit', NY, NOW)).toBeNull()
  })

  it('says when a flight lands, there or in your time', () => {
    expect(landsText(toCologne, NY, false)).toBe(`lands 9:14${PM} there`)
    expect(landsText(home, NY, false)).toBe(`lands 3:14${PM}`)
  })
})

describe('the whole trip in words (Stage 2 spec §4.8, §5, §6.5)', () => {
  it('says the trip so far, leaving out zeros', () => {
    expect(soFarText({ cities: 1, miles: 4_351, timeZones: 6, cockpitSunsets: 0 }, 2, 4)).toBe('Day 2 of 4 · 1 city · 4,351 mi · 6 time zones')
    expect(soFarText({ cities: 0, miles: 0, timeZones: 0, cockpitSunsets: 0 }, null, null)).toBeNull()
  })

  it('says "about" for a trip ahead', () => {
    const totals = { cities: 2, miles: 9_800, timeZones: 8, cockpitSunsets: 2 }
    expect(onTheWayText(totals, true)).toBe('8 time zones · about 2 sunsets from the cockpit')
    expect(onTheWayText(totals, false)).toBe('8 time zones · 2 sunsets from the cockpit')
    expect(onTheWayText({ cities: 1, miles: 100, timeZones: 0, cockpitSunsets: 0 }, true)).toBeNull()
  })

  it('reads the recap card', () => {
    expect(recapChip(1)).toBe('Home from a day away')
    expect(recapChip(4)).toBe('Home from 4 days away')
    expect(totalsTiles({ cities: 2, miles: 14_819, timeZones: 0, cockpitSunsets: 1 })).toEqual([
      { value: '2', label: 'cities' },
      { value: '14,819', label: 'miles' },
      { value: '1', label: 'sunset aloft' },
    ])
  })

  it('forecasts one cockpit sunset as "a sunset", without "about", as the app does', () => {
    expect(onTheWayText({ cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 }, true)).toBe('18 time zones · a sunset from the cockpit')
    expect(onTheWayText({ cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 }, false)).toBe('18 time zones · 1 sunset from the cockpit')
  })

  it('says the recap as one paragraph', () => {
    const longest: MapLeg = {
      id: 'f3', kind: 'flight', origin: mark('DXB', 25.2532, 55.3657, 'Dubai'), destination: mark('SDF', 38.1744, -85.736, 'Louisville'),
      start: NOW, end: NOW + 14 * 60 * MIN, flightNumber: 'UPS209',
    }
    expect(longestText(longest)).toBe('Dubai → Louisville, 7,382 mi')
    expect(recapSummary(4, { cities: 2, miles: 14_819, timeZones: 18, cockpitSunsets: 1 }, longest)).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles.',
    )
  })
})
