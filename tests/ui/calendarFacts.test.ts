import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayOf, dayParts } from '../../src/time/zoned'
import { addMonths, barKind, firstWeekday, inMonth, monthGrid, monthOf, scrollDay, timeLine, weekBars, type Bar } from '../../src/ui/calendarFacts'
import { scheduleDays } from '../../src/ui/scheduleFacts'
import { drive, duty, flight, H, place } from '../fixtures/legs'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A grid's rows as their days of the month, with the days of the months either side in brackets. */
const dates = (rows: ReturnType<typeof monthGrid>) => rows.map((row) => row.map((d) => (d.inMonth ? `${d.date}` : `(${d.date})`)).join(' '))

describe('months (slice 3B §5.5)', () => {
  it('finds a day’s month, and steps months forward and back across years', () => {
    expect(monthOf(dayOf(2026, 10, 15))).toEqual({ year: 2026, month: 10 })
    expect(addMonths({ year: 2026, month: 10 }, 1)).toEqual({ year: 2026, month: 11 })
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths({ year: 2026, month: 10 }, -13)).toEqual({ year: 2025, month: 9 })
  })

  it('tells whether a day is in a month', () => {
    expect(inMonth(dayOf(2026, 10, 31), { year: 2026, month: 10 })).toBe(true)
    expect(inMonth(dayOf(2026, 11, 1), { year: 2026, month: 10 })).toBe(false)
    expect(inMonth(dayOf(2025, 10, 15), { year: 2026, month: 10 })).toBe(false)
  })
})

describe('firstWeekday (slice 3B §5.8)', () => {
  it('starts the week on the region’s first day: Sunday in the US, Monday in Germany and France, Saturday in Egypt', () => {
    expect(firstWeekday('en-US')).toBe(0)
    expect(firstWeekday('en')).toBe(0)
    expect(firstWeekday('de-DE')).toBe(1)
    expect(firstWeekday('fr')).toBe(1)
    expect(firstWeekday('ar-EG')).toBe(6)
  })

  it('starts on Sunday when the language can’t be read, or the browser has no week information', () => {
    expect(firstWeekday('')).toBe(0)
    vi.stubGlobal('Intl', { Locale: class { maximize() { return this } } })
    expect(firstWeekday('de-DE')).toBe(0)
  })

  it('reads the standard getWeekInfo() first, and the older weekInfo where a browser has only that', () => {
    // Each test machine's Node has one or the other, so both are stubbed here.
    vi.stubGlobal('Intl', { Locale: class { maximize() { return this } getWeekInfo() { return { firstDay: 1 } } } })
    expect(firstWeekday('xx')).toBe(1)
    vi.stubGlobal('Intl', { Locale: class { maximize() { return this } weekInfo = { firstDay: 6 } } })
    expect(firstWeekday('xx')).toBe(6)
    vi.stubGlobal('Intl', { Locale: class { maximize() { return this } getWeekInfo() { return { firstDay: 7 } } weekInfo = { firstDay: 1 } } })
    expect(firstWeekday('xx')).toBe(0)
  })
})

describe('monthGrid (slice 3B §4.4)', () => {
  it('fills October 2026’s first and last weeks with the days either side, in five rows from Sunday', () => {
    expect(dates(monthGrid({ year: 2026, month: 10 }, 0))).toEqual([
      '(27) (28) (29) (30) 1 2 3',
      '4 5 6 7 8 9 10',
      '11 12 13 14 15 16 17',
      '18 19 20 21 22 23 24',
      '25 26 27 28 29 30 31',
    ])
  })

  it('needs four rows for February 2026, which starts on a Sunday, but five for a week from Monday', () => {
    expect(monthGrid({ year: 2026, month: 2 }, 0)).toHaveLength(4)
    expect(monthGrid({ year: 2026, month: 2 }, 1)).toHaveLength(5)
    expect(dates(monthGrid({ year: 2026, month: 2 }, 1))[0]).toBe('(26) (27) (28) (29) (30) (31) 1')
  })

  it('needs six rows for August 2026, which starts on a Saturday, and for May 2026, whose last day spills into a sixth', () => {
    const rows = monthGrid({ year: 2026, month: 8 }, 0)
    expect(rows).toHaveLength(6)
    expect(dates(rows)[5]).toBe('30 31 (1) (2) (3) (4) (5)')
    expect(dates(monthGrid({ year: 2026, month: 5 }, 0))[5]).toBe('31 (1) (2) (3) (4) (5) (6)')
    // From Monday, March 2026, which starts on a Sunday, needs six too.
    expect(dates(monthGrid({ year: 2026, month: 3 }, 1))[5]).toBe('30 31 (1) (2) (3) (4) (5)')
  })

  it('gives each day its calendar day number, one after another from the week’s first day', () => {
    const days = monthGrid({ year: 2026, month: 10 }, 0).flat()
    expect(days[0].day).toBe(dayOf(2026, 9, 27))
    expect(dayParts(days[0].day).weekday).toBe(0)
    expect(days.every((d, i) => d.day === days[0].day + i)).toBe(true)
  })
})

const NY = 'America/New_York'
/** Sunday 11 Oct 2026, the first day of a week row, and its midnight in New York in the fixtures' hours. */
const SUN = dayOf(2026, 10, 11)
const T0 = Date.UTC(2026, 9, 11, 4) / H
/** A place in a week row as hours from its start, in a week without a clock change. */
const hours = (days: number) => Math.round(days * 24 * 100) / 100
const shape = (b: Bar) => [b.kind, hours(b.from), hours(b.to), b.code, b.roundStart, b.roundEnd]

describe('weekBars (slice 3B §4.5, §4.6)', () => {
  it('gives each leg its kind of bar, a rest at base among the rests, and time at home none', () => {
    const legs = [
      flight('SDF', 'RFD', T0 + 30, T0 + 31, 'A'),
      place('turn', 'RFD', T0 + 31, T0 + 32, 'A'),
      place('layover', 'ANC', T0 + 40, T0 + 41, 'B'),
      place('base', 'SDF', T0 + 50, T0 + 51, 'C'),
      place('home', 'LEX', T0 + 60, T0 + 61, 'D'),
      drive('LEX', 'SDF', false, T0 + 70, T0 + 71),
      duty('reserve', 'RSV-A', 'SDF', T0 + 80, T0 + 81),
      duty('hotStandby', 'Hot Standby', 'SDF', T0 + 90, T0 + 91),
      duty('training', 'CQ', 'SDF', T0 + 100, T0 + 101),
      duty('event', 'Dinner', null, T0 + 110, T0 + 111),
      flight('SDF', 'MCO', T0 + 120, T0 + 121, null),
    ]
    expect(legs.map(barKind)).toEqual(['duty', 'duty', 'rest', 'rest', null, 'rest', 'reserve', 'reserve', 'training', 'training', 'jumpseat'])
    const bars = weekBars(SUN, legs, NY)
    expect(bars.map((b) => b.kind)).toEqual(['duty', 'duty', 'rest', 'rest', 'rest', 'reserve', 'reserve', 'training', 'training', 'jumpseat'])
    // Codes only over the layover and the rest at base: not over the turn, though it has an airport too.
    expect(bars.map((b) => b.code)).toEqual([null, null, 'ANC', 'SDF', null, null, null, null, null, null])
  })

  it('measures bars across the row by time, from its first midnight, and cuts them at its edges', () => {
    const legs = [
      duty('reserve', 'RSV-A', 'SDF', T0 - 2, T0 + 2), // from the row before
      duty('training', 'CQ', 'SDF', T0 + 30, T0 + 42), // Monday 6am to 6pm
      flight('SDF', 'ANC', T0 + 164, T0 + 172, 'X'), // Saturday 8pm, into the next row
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['reserve', 0, 2, null, false, true],
      ['training', 30, 42, null, true, true],
      ['duty', 164, 168, null, true, false],
    ])
    expect(weekBars(SUN + 7, legs, NY).map(shape)).toEqual([['duty', 0, 4, null, false, true]])
  })

  it('stretches a trip’s leg to meet the next across a gap under 30 minutes, and leaves 30 minutes or more open', () => {
    const legs = [
      flight('SDF', 'RFD', T0 + 30, T0 + 31, 'T'),
      flight('RFD', 'ANC', T0 + 31.25, T0 + 33, 'T'), // 15 minutes later
      flight('ANC', 'SDF', T0 + 33.5, T0 + 36, 'T'), // 30 minutes later
      drive('SDF', 'LEX', true, T0 + 36.25, T0 + 37), // 15 minutes later, but not the trip’s
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['duty', 30, 31.25, null, true, false],
      ['duty', 31.25, 33, null, false, false],
      ['duty', 33.5, 36, null, false, true],
      ['rest', 36.25, 37, null, true, true],
    ])
    // 29 minutes still joins.
    const [first] = weekBars(SUN, [flight('SDF', 'RFD', T0 + 30, T0 + 31, 'U'), flight('RFD', 'SDF', T0 + 31 + 29 / 60, T0 + 33, 'U')], NY)
    expect(first.to * 24).toBeCloseTo(31 + 29 / 60, 10)
    // Legs that overlap keep their own ends, as the app's join only takes a gap.
    const [early] = weekBars(SUN, [flight('SDF', 'RFD', T0 + 30, T0 + 32, 'V'), flight('RFD', 'SDF', T0 + 31, T0 + 33, 'V')], NY)
    expect(early.to * 24).toBeCloseTo(32, 10)
  })

  it('rounds only where the whole trip starts and ends, and leaves a gap with square ends at a stop at home', () => {
    const legs = [
      flight('SDF', 'ANC', T0 + 30, T0 + 32),
      place('layover', 'ANC', T0 + 32, T0 + 50),
      flight('ANC', 'LEX', T0 + 50, T0 + 52),
      place('home', 'LEX', T0 + 52, T0 + 80),
      flight('LEX', 'SDF', T0 + 80, T0 + 82),
      place('base', 'SDF', T0 + 82, T0 + 100),
      flight('SDF', 'RFD', T0 + 100, T0 + 102),
    ]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([
      ['duty', 30, 32, null, true, false],
      ['rest', 32, 50, 'ANC', false, false],
      ['duty', 50, 52, null, false, false],
      ['duty', 80, 82, null, false, false],
      ['rest', 82, 100, 'SDF', false, false],
      ['duty', 100, 102, null, false, true],
    ])
  })

  it('takes a trip’s ends from all its legs, in other rows too: a row with its middle rounds nothing, one with its last leg only the end', () => {
    const middle = [flight('SDF', 'ANC', T0 - 10, T0 - 2), place('layover', 'ANC', T0 - 2, T0 + 200), flight('ANC', 'SDF', T0 + 200, T0 + 205)]
    expect(weekBars(SUN, middle, NY).map(shape)).toEqual([['rest', 0, 168, 'ANC', false, false]])
    const afterHome = [flight('SDF', 'LEX', T0 - 30, T0 - 28), place('home', 'LEX', T0 - 28, T0 + 20), flight('LEX', 'SDF', T0 + 20, T0 + 22)]
    expect(weekBars(SUN, afterHome, NY).map(shape)).toEqual([['duty', 20, 22, null, false, true]])
  })

  it('puts the code over both pieces of a layover that runs into the next row', () => {
    const legs = [flight('SDF', 'ANC', T0 + 150, T0 + 160, 'L'), place('layover', 'ANC', T0 + 160, T0 + 180, 'L'), flight('ANC', 'SDF', T0 + 180, T0 + 185, 'L')]
    expect(weekBars(SUN, legs, NY).map(shape)).toEqual([['duty', 150, 160, null, true, false], ['rest', 160, 168, 'ANC', false, false]])
    expect(weekBars(SUN + 7, legs, NY).map(shape)).toEqual([['rest', 0, 12, 'ANC', false, false], ['duty', 12, 17, null, false, true]])
  })

  it('draws overlapping legs in start order, a later one over an earlier', () => {
    const legs = [
      flight('SDF', 'MCO', T0 + 30, T0 + 40, 'A'),
      place('layover', 'MCO', T0 + 40, T0 + 60, 'A'),
      flight('MCO', 'SDF', T0 + 60, T0 + 62, 'A'),
      flight('MCO', 'TPA', T0 + 45, T0 + 47, null),
    ]
    expect(weekBars(SUN, legs, NY).map((b) => [b.kind, hours(b.from)])).toEqual([['duty', 30], ['rest', 40], ['jumpseat', 45], ['duty', 60]])
  })

  it('measures the week the clocks go back across its 169 hours, as the app does, and rounds legs at the row’s very edges', () => {
    const midnight = Date.UTC(2026, 10, 1, 4) / H // Sunday 1 Nov 2026, midnight EDT
    const legs = [
      duty('event', 'Dinner', null, midnight, midnight + 1), // from the row's first instant
      duty('training', 'CQ', 'SDF', midnight + 73, midnight + 169), // Wednesday midnight EST to the row's last
    ]
    const [first, bar] = weekBars(dayOf(2026, 11, 1), legs, NY)
    expect([first.from, first.roundStart, first.roundEnd]).toEqual([0, true, true])
    expect(bar.from).toBeCloseTo((73 / 169) * 7, 10)
    expect([bar.to, bar.roundStart, bar.roundEnd]).toEqual([7, true, true])
  })
})

describe('timeLine (slice 3B §4.7)', () => {
  it('sits at now’s place in its week row, measured as the bars are, and in no other row', () => {
    expect(timeLine(SUN, (T0 + 30) * H, NY)).toBeCloseTo(1.25, 10)
    expect(timeLine(SUN + 7, (T0 + 168) * H, NY)).toBe(0)
    expect(timeLine(SUN, (T0 + 168) * H, NY)).toBeNull()
    expect(timeLine(SUN, (T0 - 1) * H, NY)).toBeNull()
    // In the week the clocks go back, Wednesday 11am EST is 84 of its 169 hours in, where a bar starting then begins,
    // not 3 days and 11 hours, as the app measures its line within the day.
    const midnight = Date.UTC(2026, 10, 1, 4) / H
    expect(timeLine(dayOf(2026, 11, 1), (midnight + 84) * H, NY)).toBeCloseTo((84 / 169) * 7, 10)
  })
})

describe('scrollDay (slice 3B §5.2)', () => {
  /** Thursday 15 Oct 2026 in New York, and its midnight in the fixtures' hours. The list has Thursday, Friday and Sunday. */
  const THU = dayOf(2026, 10, 15)
  const T = Date.UTC(2026, 9, 15, 4) / H
  const legs = [
    flight('SDF', 'RFD', T + 6, T + 8, 'A'),
    place('layover', 'RFD', T + 8, T + 30, 'A'), // Thursday 8am to Friday 6am
    flight('RFD', 'SDF', T + 30, T + 32, 'A'),
    duty('training', 'CQ', 'SDF', T + 76, T + 80), // Sunday
  ]
  const days = scheduleDays(legs, NY)
  const fridayNoon = (T + 36) * H

  it('goes to a day that has legs', () => {
    expect(scrollDay(THU + 1, days, fridayNoon, NY)).toBe(THU + 1)
    expect(scrollDay(THU + 3, days, fridayNoon, NY)).toBe(THU + 3)
  })

  it('goes from a day without legs to the latest day before it that has some', () => {
    expect(scrollDay(THU + 2, days, fridayNoon, NY)).toBe(THU + 1)
    expect(scrollDay(THU + 20, days, fridayNoon, NY)).toBe(THU + 3)
  })

  it('stays put for a day before every leg', () => {
    expect(scrollDay(THU - 1, days, fridayNoon, NY)).toBeNull()
  })

  it('goes from today to the day a leg happening now started, though that was yesterday', () => {
    const friday2am = (T + 26) * H // the layover from Thursday is happening
    expect(scrollDay(THU + 1, days, friday2am, NY)).toBe(THU)
    expect(scrollDay(THU + 3, days, friday2am, NY)).toBe(THU + 3)
    // With a jumpseat from Friday 1am happening too, the earlier leg still decides, as the app's first match does.
    const both = scheduleDays([...legs, flight('RFD', 'ORD', T + 25, T + 27, null)], NY)
    expect(scrollDay(THU + 1, both, friday2am, NY)).toBe(THU)
  })

  it('takes today like any other day when nothing is happening', () => {
    const saturdayNoon = (T + 60) * H
    expect(scrollDay(THU + 2, days, saturdayNoon, NY)).toBe(THU + 1)
  })
})
