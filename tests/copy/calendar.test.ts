import { describe, expect, it } from 'vitest'
import { dayName, monthTitle, weekdayColumns } from '../../src/copy/calendar'
import { dayOf } from '../../src/time/zoned'

describe('monthTitle (slice 3B §4.2)', () => {
  it('names the month and its year, as the app’s "MMMM yyyy"', () => {
    expect(monthTitle(2026, 10)).toBe('October 2026')
    expect(monthTitle(2027, 1)).toBe('January 2027')
    expect(monthTitle(2026, 12)).toBe('December 2026')
  })
})

describe('weekdayColumns (slice 3B §4.3, §5.7)', () => {
  it('runs from Sunday in the US, a letter each as the app’s, with full names for screen readers', () => {
    const columns = weekdayColumns(0)
    expect(columns.map((c) => c.letter).join(' ')).toBe('S M T W T F S')
    expect(columns.map((c) => c.name)).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })

  it('starts on whichever day the visitor’s week starts', () => {
    expect(weekdayColumns(1).map((c) => c.letter).join(' ')).toBe('M T W T F S S')
    expect(weekdayColumns(1)[6].name).toBe('Sunday')
    expect(weekdayColumns(6).map((c) => c.name).slice(0, 2)).toEqual(['Saturday', 'Sunday'])
  })
})

describe('dayName (slice 3B §5.7)', () => {
  it('says the weekday and the date in full', () => {
    expect(dayName(dayOf(2026, 10, 15))).toBe('Thursday, October 15')
    expect(dayName(dayOf(2027, 1, 1))).toBe('Friday, January 1')
  })
})
