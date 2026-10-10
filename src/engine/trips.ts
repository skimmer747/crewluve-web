import { calendarDay } from '../time/zoned'
import type { Trip } from './types'

/** Trip length in days: trips.days when it is above 0 (Duty writes 0 for a trip under 24 hours), else the inclusive calendar-day count in `timeZone`. */
export function tripDays(trip: Trip, timeZone: string): number {
  return trip.days != null && trip.days > 0 ? trip.days : calendarDay(trip.end, timeZone) - calendarDay(trip.start, timeZone) + 1
}

/**
 * "Day N" of a trip: calendar days since it started, plus one, counted in `timeZone` (the base's) and kept between 1 and
 * tripDays. Duty counts in UTC, which late on a US evening reads "Day 5 of 4" (slice 2A spec §5).
 */
export function tripDayNumber(trip: Trip, t: number, timeZone: string): number {
  const day = calendarDay(t, timeZone) - calendarDay(trip.start, timeZone) + 1
  return Math.min(Math.max(day, 1), tripDays(trip, timeZone))
}
