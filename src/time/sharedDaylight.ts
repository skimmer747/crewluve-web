import type { SunTimes } from './sun'
import { zonedParts } from './zoned'

/** A span on home's 24-hour clock, in hours from 0 up to 24. `start` is always before `end`. */
export interface DaylightSpan {
  start: number
  end: number
}

/** The time of `ms` on `timeZone`'s clock, in hours, with the minutes and seconds as a fraction. */
function clockHour(ms: number, timeZone: string): number {
  const { hour, minute } = zonedParts(ms, timeZone)
  // The seconds are the instant's own: every zone's offset has been whole minutes since 1972.
  const seconds = ((Math.floor(ms / 1000) % 60) + 60) % 60
  return hour + minute / 60 + seconds / 3600
}

/**
 * When the pilot and home are both in daylight, as spans on home's clock: none, one or two (SharedDaylight.windows in the
 * app, slice 2B2 §8). Only the time of day of each sunrise and sunset counts, not its date, so sun times for different
 * days still line up.
 */
export function sharedDaylight(pilot: SunTimes, home: SunTimes, homeTz: string): DaylightSpan[] {
  const homeStart = clockHour(home.sunrise, homeTz)
  const homeEnd = clockHour(home.sunset, homeTz)
  // Home's daylight never wraps past midnight on its own clock; anything else is degenerate polar data, so show no spans.
  if (!(homeStart < homeEnd)) return []
  const pilotStart = clockHour(pilot.sunrise, homeTz)
  const pilotEnd = clockHour(pilot.sunset, homeTz)
  // The pilot's daylight can wrap past midnight on home's clock: split it before comparing.
  const pieces: Array<[number, number]> = pilotStart <= pilotEnd ? [[pilotStart, pilotEnd]] : [[pilotStart, 24], [0, pilotEnd]]
  const oneSecond = 1 / 3600
  return pieces
    .map(([start, end]) => ({ start: Math.max(start, homeStart), end: Math.min(end, homeEnd) }))
    .filter((span) => span.end - span.start > oneSecond)
    .sort((a, b) => a.start - b.start)
}
