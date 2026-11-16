import { describe, expect, it } from 'vitest'
import {
  aircraftText, averageSpeedText, belowWords, chaseText, closestToHomeText, cockpitCountdown, cockpitEventText, flightTitle, flownText,
  flyingInto, groundSunText, halfwayText, heightAndSpeedText, landsText, lastSeenLine, LIVE_CREDIT, midLine, milestoneHeadline, milestoneLine,
  moonText, SPOKEN_LIVE_CREDIT, spokenLastSeen, stillOnGroundText, timeDifferenceText, toGoText,
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

  it('says "about" before a best guess’s time (best guesses design §2)', () => {
    expect(milestoneLine({ kind: 'outOver', name: 'the Pacific', time: NOW }, NY, false)).toBe(`Out over the Pacific · 3:14${PM}`)
    expect(milestoneLine({ kind: 'outOver', name: 'the Pacific', time: NOW, isEstimate: true }, NY, false)).toBe(`Out over the Pacific · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'halfway', time: NOW, isEstimate: true }, NY, false)).toBe(`Halfway · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'crossedInto', name: 'Kansas', time: NOW, isEstimate: true }, NY, false)).toBe(`Crossed into Kansas · about 3:14${PM}`)
    expect(milestoneLine({ kind: 'closestToHome', miles: 40, time: NOW, isEstimate: true }, NY, false)).toBe(`Closest to home, 40 mi · about 3:14${PM}`)
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

  it('says "about" before the closest point’s time ahead of a real plane, and after it where nobody saw it pass', () => {
    expect(closestToHomeText(40, NOW + 60 * MIN, NOW, NY, false, true)).toBe(`Passes 40 mi from home at about 4:14${PM}`)
    // Where nobody saw the plane pass, it's still a best guess.
    expect(closestToHomeText(40, NOW, NOW + 60 * MIN, NY, false, true)).toBe(`Closest to home was 40 mi at about 3:14${PM}`)
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

  it('says where a real plane still at its departure airport is, and only what’s to go (the website’s own, Todd, 16 Nov 2026)', () => {
    expect(stillOnGroundText('Rockford')).toBe('Still on the ground in Rockford')
    expect(toGoText(2_788)).toBe('2,788 mi to go')
  })

  it('says "about" before the halfway time that’s the real plane’s estimate (Stage 3 spec §8)', () => {
    expect(halfwayText(NOW, NY, false)).toBe(`Halfway at 3:14${PM}`)
    expect(halfwayText(NOW, NY, false, true)).toBe(`Halfway at about 3:14${PM}`)
  })
})

describe('the real plane in words (Stage 3 spec §8, best guesses design §2)', () => {
  const quebec = { name: 'Québec', kind: 'province' as const, country: 'Canada' }
  const montreal = { name: 'Montréal', lat: 45.5, lon: -73.57 }

  it('says where it was last seen, by the city near it, else the place under it, and how long ago', () => {
    expect(lastSeenLine(quebec, montreal, 10 * MIN)).toBe('Last seen near Montréal · 10 min ago')
    expect(lastSeenLine(quebec, null, 130 * MIN)).toBe('Last seen over Québec · 2 h 10 min ago')
    expect(lastSeenLine(null, null, 120 * MIN)).toBe('Last seen 2 h ago')
  })

  it('says it for a screen reader, by the city near it, else the place under it, else how long ago', () => {
    expect(spokenLastSeen(quebec, montreal, 10 * MIN)).toBe('near Montréal')
    expect(spokenLastSeen(quebec, null, 10 * MIN)).toBe('over Québec')
    expect(spokenLastSeen(null, null, 10 * MIN)).toBe('10 minutes ago')
    expect(spokenLastSeen(null, null, 130 * MIN)).toBe('2 hours 10 minutes ago')
  })

  it('holds a time that can’t be right from a minute to a year', () => {
    expect(lastSeenLine(null, null, 20_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, -500_000)).toBe('Last seen 1 min ago')
    expect(lastSeenLine(null, null, Infinity)).toBe('Last seen 8760 h ago')
    expect(lastSeenLine(null, null, NaN)).toBe('Last seen 1 min ago')
    expect(spokenLastSeen(null, null, NaN)).toBe('1 minute ago')
  })

  it('says how long ago to the nearest minute', () => {
    expect(lastSeenLine(null, null, 10 * MIN + 29_000)).toBe('Last seen 10 min ago')
    expect(lastSeenLine(null, null, 10 * MIN + 31_000)).toBe('Last seen 11 min ago')
    expect(spokenLastSeen(null, null, 10 * MIN + 31_000)).toBe('11 minutes ago')
  })

  it('names the plane by its type and registration, each where it’s known', () => {
    expect(aircraftText('B763', 'N370UP')).toBe('Boeing 767-300 · N370UP')
    // An unknown type shows as itself.
    expect(aircraftText('ZZZZ', 'N370UP')).toBe('ZZZZ · N370UP')
    expect(aircraftText('B763', null)).toBe('Boeing 767-300')
    expect(aircraftText(null, 'N370UP')).toBe('N370UP')
    expect(aircraftText(null, null)).toBeNull()
    expect(aircraftText('  ', '')).toBeNull()
  })

  it('leaves the spaces off a registration', () => {
    expect(aircraftText(' b763 ', ' N370UP ')).toBe('Boeing 767-300 · N370UP')
  })

  it('says the height to the nearest 100 ft and the speed to the nearest 10 mph', () => {
    // 470 kt is 540.9 mph.
    expect(heightAndSpeedText(34_975, 470)).toBe('35,000 ft · 540 mph')
    expect(heightAndSpeedText(35_000, null)).toBe('35,000 ft')
    expect(heightAndSpeedText(null, 470)).toBe('540 mph')
    expect(heightAndSpeedText(null, null)).toBeNull()
    expect(heightAndSpeedText(34_949, null)).toBe('34,900 ft')
    expect(heightAndSpeedText(34_950, null)).toBe('35,000 ft')
  })

  it('shows a height and a speed at the edges of what’s believed', () => {
    expect(heightAndSpeedText(0, 0)).toBe('0 ft · 0 mph')
    // 800 kt is 920.6 mph.
    expect(heightAndSpeedText(60_000, 800)).toBe('60,000 ft · 920 mph')
    expect(heightAndSpeedText(60_001, 801)).toBeNull()
  })

  it('leaves out a number that can’t be right', () => {
    expect(heightAndSpeedText(1e12, 470)).toBe('540 mph')
    expect(heightAndSpeedText(-500, 470)).toBe('540 mph')
    expect(heightAndSpeedText(35_000, 5_000)).toBe('35,000 ft')
    expect(heightAndSpeedText(NaN, Infinity)).toBeNull()
  })

  it('never writes a minus before nothing', () => {
    // JSON can carry -0, and JavaScript writes it "-0": a number rounded to nothing is 0.
    expect(heightAndSpeedText(-0, -0)).toBe('0 ft · 0 mph')
    expect(heightAndSpeedText(20, 0.001)).toBe('0 ft · 0 mph')
  })

  it('credits adsb.lol', () => {
    expect(LIVE_CREDIT).toBe('Live position: adsb.lol')
    expect(SPOKEN_LIVE_CREDIT).toBe('Live position from adsb.lol.')
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
