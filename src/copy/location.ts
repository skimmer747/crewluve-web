import { isDaytime, type SunTimes } from '../time/sun'
import { zoneOffsetMinutes } from '../time/zoned'
import { delayText, shortTimeText } from './format'

/** How far the pilot's clocks are from home's (TimeDifference in PilotStatusView.swift). */
export interface TimeDifference {
  hours: number
  minutes: number
  /** 'ahead' when the pilot's clocks show a later time than home's. */
  direction: 'ahead' | 'behind' | 'same'
}

/** The pilot's zone offset minus home's at `t` (slice 2B1 §6). "You", in the app's words, is the family at home. */
export function timeDifference(t: number, pilotTz: string, homeTz: string): TimeDifference {
  const diff = zoneOffsetMinutes(t, pilotTz) - zoneOffsetMinutes(t, homeTz)
  const abs = Math.abs(diff)
  return { hours: Math.floor(abs / 60), minutes: abs % 60, direction: diff > 0 ? 'ahead' : diff < 0 ? 'behind' : 'same' }
}

/** "ahead of you" or "behind you". */
export function directionText(direction: 'ahead' | 'behind'): string {
  return direction === 'ahead' ? 'ahead of you' : 'behind you'
}

/** "4h behind you", "1h 30m ahead of you", "30m ahead of you", or "same time as you". */
export function timeDifferenceText(d: TimeDifference): string {
  if (d.direction === 'same') return 'same time as you'
  const amount = [d.hours > 0 ? `${d.hours}h` : '', d.minutes > 0 ? `${d.minutes}m` : ''].filter(Boolean).join(' ')
  return `${amount} ${directionText(d.direction)}`
}

/** The same in words, for screen readers: "4 hours behind you", "1 hour 30 minutes ahead of you". */
export function spokenTimeDifference(d: TimeDifference): string {
  if (d.direction === 'same') return 'same time as you'
  return `${delayText(d.hours * 60 + d.minutes)} ${directionText(d.direction)}`
}

/** What screen readers hear for the sun dial: "Sunrise 8:12 AM, sunset 6:41 PM, daytime in Anchorage". */
export function sunDialLabel(sun: SunTimes, now: number, timeZone: string, h24: boolean, city: string): string {
  const time = (ms: number) => shortTimeText(ms, timeZone, h24)
  return `Sunrise ${time(sun.sunrise)}, sunset ${time(sun.sunset)}, ${isDaytime(now, sun) ? 'daytime' : 'nighttime'} in ${city}`
}
