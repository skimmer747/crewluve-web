import { dayOf, dayParts } from '../time/zoned'

/** A month the calendar shows: its year, and its month, 1–12. */
export interface Month {
  year: number
  month: number
}

/** The month a calendar day falls in. */
export function monthOf(day: number): Month {
  const { year, month } = dayParts(day)
  return { year, month }
}

/** The month `count` months after `m`, or before it when `count` is negative: the calendar's arrows (slice 3B §5.5). */
export function addMonths(m: Month, count: number): Month {
  return monthOf(dayOf(m.year, m.month + count, 1))
}

/** Whether a calendar day falls in month `m`. */
export function inMonth(day: number, m: Month): boolean {
  const { year, month } = dayParts(day)
  return year === m.year && month === m.month
}

/**
 * The first day of the visitor's week, 0 = Sunday, from the browser's week information for their region, as the app
 * follows the phone's region: Sunday in the US, Monday in much of Europe. Sunday when the browser has none (§5.8).
 */
export function firstWeekday(locale: string = navigator.language): number {
  try {
    const region = new Intl.Locale(locale).maximize() as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    // getWeekInfo() is the standard; Safari 17 and older Chromes have a weekInfo property instead. Its 7 is Sunday.
    const info = region.getWeekInfo?.() ?? region.weekInfo
    return info ? info.firstDay % 7 : 0
  } catch {
    return 0
  }
}

/** A day in the calendar's grid: its calendar day number, its day of the month, and whether it's in the month shown. */
export interface GridDay {
  day: number
  date: number
  inMonth: boolean
}

/**
 * The month's week rows, CalendarDataBuilder.buildMonthGrid: its days, led and trailed by the days of the months either
 * side to fill the first and last weeks. Four to six rows of seven (§4.4).
 */
export function monthGrid(m: Month, firstDay: number): GridDay[][] {
  const first = dayOf(m.year, m.month, 1)
  const last = dayOf(m.year, m.month + 1, 0)
  const start = first - ((dayParts(first).weekday - firstDay + 7) % 7)
  return Array.from({ length: Math.ceil((last - start + 1) / 7) }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const day = start + row * 7 + column
      return { day, date: dayParts(day).day, inMonth: day >= first && day <= last }
    }),
  )
}
