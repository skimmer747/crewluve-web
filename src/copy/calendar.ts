import { dayParts, MONTHS, WEEKDAYS } from '../time/zoned'

/** The month header's title, TripCalendarView's "MMMM yyyy": "October 2026". `month` is 1–12 (slice 3B §4.2). */
export function monthTitle(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

/** A weekday column: the app's very short symbol, "S", and the full name screen readers hear, "Sunday". */
export interface WeekdayColumn {
  letter: string
  name: string
}

/** The seven weekday columns, from the week's first day, 0 = Sunday (slice 3B §4.3, §5.7). */
export function weekdayColumns(firstDay: number): WeekdayColumn[] {
  return Array.from({ length: 7 }, (_, i) => {
    const name = WEEKDAYS[(firstDay + i) % 7]
    return { letter: name[0], name }
  })
}

/** A calendar day as screen readers hear it: "Thursday, October 15" (slice 3B §5.7). */
export function dayName(day: number): string {
  const { month, day: date, weekday } = dayParts(day)
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${date}`
}
