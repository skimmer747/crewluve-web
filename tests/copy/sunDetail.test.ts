import { describe, expect, it } from 'vitest'
import {
  bigDialLabel,
  daylightText,
  departureCountdownText,
  departureOffset,
  departureTime,
  hourDifference,
  moonPhaseName,
} from '../../src/copy/sunDetail'
import { DAY, HOUR, MINUTE } from '../../src/time/zoned'

const NY = 'America/New_York'
const ANC = 'America/Anchorage'
const OCT = Date.UTC(2026, 9, 10, 16) // Saturday 10 October, noon in New York

describe('departureOffset and departureTime', () => {
  const scheduled = Date.UTC(2026, 9, 11, 11, 25)
  it('count a departure as late or early only at 15 minutes or more, as everywhere on the site', () => {
    expect(departureOffset({ scheduled, actual: scheduled + 40 * MINUTE })).toBe(40)
    expect(departureOffset({ scheduled, actual: scheduled - 20 * MINUTE })).toBe(-20)
    expect(departureOffset({ scheduled, actual: scheduled + 14 * MINUTE })).toBeNull()
    expect(departureOffset({ scheduled, actual: scheduled + 15 * MINUTE })).toBe(15)
  })

  it('leave at the estimated time when it counts as off, else at the scheduled time', () => {
    expect(departureTime({ scheduled, actual: scheduled + 40 * MINUTE })).toBe(scheduled + 40 * MINUTE)
    expect(departureTime({ scheduled, actual: scheduled + 10 * MINUTE })).toBe(scheduled)
  })
})

describe('daylightText', () => {
  it('reads like the app, always with hours and minutes', () => {
    expect(daylightText({ sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) })).toBe('10h 33m of daylight')
    expect(daylightText({ sunrise: Date.UTC(2026, 9, 10, 12), sunset: Date.UTC(2026, 9, 10, 21) })).toBe('9h 0m of daylight')
  })

  it('rounds down to the minute and never goes below zero', () => {
    expect(daylightText({ sunrise: 0, sunset: 59_999 })).toBe('0h 0m of daylight')
    expect(daylightText({ sunrise: 10 * HOUR, sunset: 9 * HOUR })).toBe('0h 0m of daylight')
  })
})

describe('hourDifference', () => {
  it('gives whole hours with a sign, and whether the pilot is ahead', () => {
    expect(hourDifference(OCT, 'Europe/Berlin', NY)).toEqual({ amount: '+6h', ahead: true })
    expect(hourDifference(OCT, ANC, NY)).toEqual({ amount: '-4h', ahead: false })
  })

  it('gives hours and minutes for a half-hour zone', () => {
    expect(hourDifference(OCT, 'Asia/Kolkata', NY)).toEqual({ amount: '+9:30', ahead: true })
    expect(hourDifference(OCT, NY, 'Asia/Kolkata')).toEqual({ amount: '-9:30', ahead: false })
    expect(hourDifference(OCT, 'Asia/Kathmandu', 'Asia/Kolkata')).toEqual({ amount: '+0:15', ahead: true })
  })

  it('gives "+0h", not ahead, when the clocks match', () => {
    expect(hourDifference(OCT, 'America/Detroit', NY)).toEqual({ amount: '+0h', ahead: false })
  })
})

describe('departureCountdownText', () => {
  it.each([
    [DAY + 3 * HOUR + 40 * MINUTE, '1d 3h'],
    [2 * DAY + 20 * MINUTE, '2d'],
    [5 * HOUR + 20 * MINUTE + 59_000, '5h20m'],
    [5 * HOUR, '5h'],
    [45 * MINUTE + 30_000, '45m'],
    [30_000, '0m'],
    [-MINUTE, '0m'],
  ])('%i ms reads "%s"', (ms, text) => {
    expect(departureCountdownText(ms)).toBe(text)
  })
})

describe('moonPhaseName', () => {
  it('uses Apple’s eight names', () => {
    expect(
      (['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'] as const).map(moonPhaseName),
    ).toEqual(['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'])
  })
})

describe('bigDialLabel', () => {
  // Anchorage on 10 October 2026: sunrise 8:30 AM, sunset 7:03 PM; 10:05 PM now.
  const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) }
  const now = Date.UTC(2026, 9, 11, 6, 5)
  const scheduled = now + 5 * HOUR + 20 * MINUTE // 3:25 AM
  const base = { sun, now, timeZone: ANC, homeTz: NY, h24: false, city: 'Anchorage' }

  it('reads the sun, the time difference and the next departure', () => {
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
    )
  })

  it('names the actual time, and says how late or early', () => {
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled + 40 * MINUTE } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 4:05\u202FAM, in 6 hours, 40 minutes late.',
    )
    expect(bigDialLabel({ ...base, departure: { scheduled, actual: scheduled - 20 * MINUTE } })).toContain('Next departure 3:05\u202FAM, in 5 hours, 20 minutes early.')
  })

  it('leaves out what doesn’t apply: the same clock as home, and a departure already gone or missing', () => {
    expect(bigDialLabel({ ...base, homeTz: ANC, departure: null })).toBe('Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage.')
    expect(bigDialLabel({ ...base, departure: { scheduled: now - MINUTE, actual: now - MINUTE } })).toBe(
      'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you.',
    )
  })
})
