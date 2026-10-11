import { departureOffset, type Departure } from '../engine/snapshot'
import type { MoonPhase } from '../time/moon'
import type { SunTimes } from '../time/sun'
import { MINUTE } from '../time/zoned'
import { delayText, shortTimeText, spokenDuration } from './format'
import { spokenTimeDifference, sunDialLabel, timeDifference, type TimeDifference } from './location'

/** "10h 33m of daylight": sunset minus sunrise, never below zero, always with both parts (daylightDurationText in the app). */
export function daylightText(sun: SunTimes): string {
  const minutes = Math.max(0, Math.floor((sun.sunset - sun.sunrise) / MINUTE))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m of daylight`
}

/**
 * The middle of the big dial during the home-time turn: "+6h" or "+5:30", and whether the pilot is ahead
 * (hourDifferenceText in the app). The sign is "+" when the pilot is ahead or level.
 */
export function hourDifference(d: TimeDifference): { amount: string; ahead: boolean } {
  const sign = d.direction === 'behind' ? '-' : '+'
  return {
    amount: d.minutes === 0 ? `${sign}${d.hours}h` : `${sign}${d.hours}:${String(d.minutes).padStart(2, '0')}`,
    ahead: d.direction === 'ahead',
  }
}

/** The big dial's departure countdown: "1d 3h", "1d", "5h20m", "5h" or "45m" (departureCountdownText in the app). */
export function departureCountdownText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const totalHours = Math.floor(seconds / 3600)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0 && hours > 0) return `${days}d ${hours}h`
  if (days > 0) return `${days}d`
  if (hours > 0 && minutes > 0) return `${hours}h${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

const MOON_NAMES: Record<MoonPhase, string> = {
  new: 'New Moon',
  waxingCrescent: 'Waxing Crescent',
  firstQuarter: 'First Quarter',
  waxingGibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waningGibbous: 'Waning Gibbous',
  lastQuarter: 'Third Quarter',
  waningCrescent: 'Waning Crescent',
}

/** The moon phase in Apple's words (MoonPhase.displayName in the app): "Third Quarter", not "Last Quarter". */
export function moonPhaseName(phase: MoonPhase): string {
  return MOON_NAMES[phase]
}

export interface BigDialLabelArgs {
  sun: SunTimes
  now: number
  timeZone: string
  homeTz: string
  h24: boolean
  city: string
  departure: Departure | null
}

/**
 * What screen readers hear for the big dial (slice 2B2 §5.3): "Sunrise 8:30 AM, sunset 7:03 PM, nighttime in Anchorage,
 * 4 hours behind you. Next departure 3:25 AM, in 5 hours, 20 minutes." A delay or an early departure is named right
 * after the time ("Next departure 4:05 AM, 40 minutes late, in 6 hours"), so it can't be heard as part of the
 * countdown. Parts that don't apply are left out.
 */
export function bigDialLabel({ sun, now, timeZone, homeTz, h24, city, departure }: BigDialLabelArgs): string {
  const difference = timeDifference(now, timeZone, homeTz)
  const sunWords = sunDialLabel(sun, now, timeZone, h24, city)
  const sentences = [difference.direction === 'same' ? sunWords : `${sunWords}, ${spokenTimeDifference(difference)}`]
  if (departure && departure.actual > now) {
    const offset = departureOffset(departure)
    const offsetWords = offset == null ? '' : `, ${delayText(offset)} ${offset > 0 ? 'late' : 'early'}`
    sentences.push(`Next departure ${shortTimeText(departure.actual, timeZone, h24)}${offsetWords}, in ${spokenDuration(departure.actual - now)}`)
  }
  return `${sentences.join('. ')}.`
}
