import { describe, expect, it } from 'vitest'
import { dayHeading, gapText, legClock, legDuration, legTimes } from '../../src/copy/schedule'

const NY = 'America/New_York'
const S = 1000
const M = 60 * S
const H = 60 * M
/** Thu 15 Oct 2026, noon in New York. */
const NOON = Date.UTC(2026, 9, 15, 16)

describe('legDuration', () => {
  it.each([
    [26 * H, false, '1d 2h'], [24 * H, false, '1d'], [24 * H + 59 * M, false, '1d'],
    [4 * H + 30 * M, false, '4h 30m'], [4 * H, false, '4h'], [35 * M, false, '35m'], [59 * S, false, '0m'],
    [3 * H + 12 * M + 45 * S, true, '3:12:45'], [2 * H + 5 * S, true, '2:00:05'], [12 * M + 9 * S, true, '12:09'],
    [9 * S, true, '0:09'], [50 * H, true, '2d 2h'], [-5 * M, false, '0m'],
  ])('%i ms, with seconds %s → %s', (ms, seconds, text) => expect(legDuration(ms, seconds)).toBe(text))
})

describe('dayHeading', () => {
  it('names today, yesterday and tomorrow, and spells out other days (EventTimelineView.sectionHeaderText)', () => {
    expect(dayHeading(NOON, NOON, NY)).toBe('Today')
    expect(dayHeading(NOON - 24 * H, NOON, NY)).toBe('Yesterday')
    expect(dayHeading(NOON + 24 * H, NOON, NY)).toBe('Tomorrow')
    expect(dayHeading(NOON + 48 * H, NOON, NY)).toBe('Saturday, Oct 17')
    expect(dayHeading(NOON - 72 * H, NOON, NY)).toBe('Monday, Oct 12')
    expect(dayHeading(Date.UTC(2026, 8, 1, 16), NOON, NY)).toBe('Tuesday, Sep 1')
  })

  it('goes by the calendar day in the visitor’s zone, so 11:30pm and 12:30am are different days', () => {
    const lateTonight = Date.UTC(2026, 9, 16, 3, 30) // 11:30pm in New York on Thursday
    const justAfter = Date.UTC(2026, 9, 16, 4, 30) // 12:30am in New York on Friday, 11:30pm in Chicago on Thursday
    expect(dayHeading(lateTonight, NOON, NY)).toBe('Today')
    expect(dayHeading(justAfter, NOON, NY)).toBe('Tomorrow')
    expect(dayHeading(justAfter, NOON, 'America/Chicago')).toBe('Today')
  })
})

describe('legTimes', () => {
  const out = Date.UTC(2026, 9, 15, 10, 5)
  const landed = Date.UTC(2026, 9, 15, 11, 40)

  it('gives both times in the visitor’s zone, each with its abbreviation, in lower case (TimelineRowView.subtitle)', () => {
    expect(legTimes(out, landed, NY, false)).toBe('6:05am edt – 7:40am edt')
  })

  it('uses 24-hour times on 24-hour devices', () => {
    expect(legTimes(out, landed, NY, true)).toBe('06:05 edt – 07:40 edt')
  })

  it('gives each time the abbreviation in force then, across the change back to standard time', () => {
    // Sunday 1 November 2026: New York's clocks go back from 2am EDT to 1am EST.
    expect(legTimes(Date.UTC(2026, 10, 1, 4), Date.UTC(2026, 10, 1, 12), NY, false)).toBe('12:00am edt – 7:00am est')
  })

  it('lower-cases a zone with no letter abbreviation', () => {
    expect(legTimes(Date.UTC(2026, 9, 15, 8), Date.UTC(2026, 9, 15, 9), 'Europe/Berlin', false)).toBe('10:00am gmt+2 – 11:00am gmt+2')
  })
})

describe('gapText', () => {
  it('names a gap by the leg after it, with its length (TimeGapView)', () => {
    expect(gapText('home', 2 * H)).toBe('Home 2h')
    expect(gapText('turn', 45 * M)).toBe('Turn 45m')
    expect(gapText('layover', 3 * H + 10 * M)).toBe('Layover 3h 10m')
    expect(gapText('gap', 85 * M)).toBe('Gap 1h 25m')
    expect(gapText('gap', 26 * H)).toBe('Gap 1d 2h')
  })
})

describe('legClock', () => {
  const start = NOON
  const end = NOON + 4 * H + 30 * M

  it('counts down to the end while the leg is happening, with seconds', () => {
    expect(legClock(start, end, NOON + H + 17 * M + 15 * S, 'happening')).toEqual({
      label: 'Ends in', value: '3:12:45', spoken: 'Ends in 3 hours, 12 minutes',
    })
  })

  it('counts down to the start of the next leg, with seconds under a day', () => {
    expect(legClock(start, end, NOON - 12 * M - 9 * S, 'next')).toEqual({ label: 'Starts in', value: '12:09', spoken: 'Starts in 12 minutes' })
    expect(legClock(start, end, NOON - 50 * H, 'next')).toEqual({ label: 'Starts in', value: '2d 2h', spoken: 'Starts in 2 days, 2 hours' })
  })

  it('gives every other leg its length, without seconds', () => {
    expect(legClock(start, end, NOON + 9 * H, 'other')).toEqual({ label: 'Duration', value: '4h 30m', spoken: 'Duration 4 hours, 30 minutes' })
  })
})
