import type { Leg } from '../engine/legs'
import { calendarDay, dayOf, dayParts, dayStart, MINUTE } from '../time/zoned'
import { isHappening, type ScheduleDay } from './scheduleFacts'

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

/** A bar's kind, which gives its color (CalendarBarSegment.Category; §4.5). */
export type BarKind = 'duty' | 'rest' | 'reserve' | 'training' | 'jumpseat'

/**
 * The kind of bar a leg draws, as CalendarDataBuilder sorts them, or null for time at home, which draws none. A rest at
 * base is rest: the app draws it as duty, its catch-all for the legs it doesn't name (decision 2).
 */
export function barKind(leg: Leg): BarKind | null {
  switch (leg.kind) {
    case 'home':
      return null
    case 'layover':
    case 'base':
    case 'drive':
      return 'rest'
    case 'reserve':
    case 'hotStandby':
      return 'reserve'
    case 'training':
    case 'event':
      return 'training'
    case 'jumpseat':
      return 'jumpseat'
    default:
      // Trip flights, ground transport and turns.
      return 'duty'
  }
}

/** A bar in a week row: where it starts and ends, in days from the row's start (0–7), and how it looks. */
export interface Bar {
  /** Its leg's id. */
  id: string
  from: number
  to: number
  kind: BarKind
  /** The airport code over a layover or a rest at base (§4.6). */
  code: string | null
  /** Rounded where its trip starts or ends, in this row (§4.5). */
  roundStart: boolean
  roundEnd: boolean
}

/** A trip's leg stretches to meet the next when that begins less than this after it ends, as in the app. */
const JOIN_UNDER = 30 * MINUTE

/**
 * A week row's span: from its first day's midnight to the midnight seven days later, both in the visitor's zone.
 * `rowStart` is that first day, as calendarDay gives it.
 */
function rowSpan(rowStart: number, timeZone: string) {
  const start = dayStart(rowStart, timeZone)
  const end = dayStart(rowStart + 7, timeZone)
  return { start, end, at: (ms: number) => ((ms - start) / (end - start)) * 7 }
}

/**
 * A week row's bars, CalendarDataBuilder.buildSegments: one for each leg the row overlaps, cut at its edges, measured
 * across it by time, and drawn in start order. A trip's legs stretch to meet the next across gaps under 30 minutes, and
 * a leg with no trip is a trip of its own. `rowStart` is the row's first day, as calendarDay gives it. `legs` are all
 * the list's legs, so a trip's start and end come from all of them, not only this row's (§4.5, §4.6).
 */
export function weekBars(rowStart: number, legs: readonly Leg[], timeZone: string): Bar[] {
  const { start, end, at } = rowSpan(rowStart, timeZone)
  // A trip's legs gather under its id; a leg with no trip under itself, so it can't meet any trip's id.
  const trips = new Map<string | Leg, Leg[]>()
  for (const leg of legs) {
    if (barKind(leg) === null || leg.start >= end || leg.end <= start) continue
    const key = leg.tripId ?? leg
    trips.set(key, [...(trips.get(key) ?? []), leg])
  }
  const bars: Bar[] = []
  for (const [key, inRow] of trips) {
    const sorted = [...inRow].sort((a, b) => a.start - b.start)
    const whole = typeof key === 'string' ? legs.filter((leg) => leg.tripId === key) : sorted
    const tripStart = Math.min(...whole.map((leg) => leg.start))
    const tripEnd = Math.max(...whole.map((leg) => leg.end))
    sorted.forEach((leg, i) => {
      const next = sorted[i + 1]
      const joins = next !== undefined && next.start > leg.end && next.start - leg.end < JOIN_UNDER
      const from = at(Math.max(leg.start, start))
      const to = joins ? at(next.start) : at(Math.min(leg.end, end))
      if (to <= from) return
      bars.push({
        id: leg.id,
        from,
        to,
        kind: barKind(leg)!,
        code: leg.kind === 'layover' || leg.kind === 'base' ? leg.airport : null,
        roundStart: leg.start <= tripStart && tripStart >= start && tripStart < end,
        roundEnd: leg.end >= tripEnd && tripEnd > start && tripEnd <= end,
      })
    })
  }
  return bars.sort((a, b) => a.from - b.from)
}

/**
 * Where the time line sits in the week row starting on `rowStart`, in days from its start, measured as the bars are;
 * null outside it (§4.7).
 */
export function timeLine(rowStart: number, now: number, timeZone: string): number | null {
  const { start, end, at } = rowSpan(rowStart, timeZone)
  return now >= start && now < end ? at(now) : null
}

/**
 * The day whose heading a tap on calendar day `day` scrolls the list to, as EventTimelineView does on a new selection,
 * or null to stay: the day a leg happening now started, when `day` is today; else the latest day of the list on or
 * before `day` (slice 3B §5.2).
 */
export function scrollDay(day: number, days: readonly ScheduleDay[], now: number, timeZone: string): number | null {
  if (day === calendarDay(now, timeZone)) {
    const happening = days.flatMap((d) => d.legs).find((leg) => isHappening(leg, now))
    if (happening) return calendarDay(happening.start, timeZone)
  }
  let target: number | null = null
  for (const d of days) if (d.day <= day) target = d.day
  return target
}
