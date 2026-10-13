import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayOf, dayParts } from '../../src/time/zoned'
import { addMonths, firstWeekday, inMonth, monthGrid, monthOf } from '../../src/ui/calendarFacts'

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
  })

  it('gives each day its calendar day number, one after another from the week’s first day', () => {
    const days = monthGrid({ year: 2026, month: 10 }, 0).flat()
    expect(days[0].day).toBe(dayOf(2026, 9, 27))
    expect(dayParts(days[0].day).weekday).toBe(0)
    expect(days.every((d, i) => d.day === days[0].day + i)).toBe(true)
  })
})
