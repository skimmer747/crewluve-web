export const MINUTE = 60_000
export const HOUR = 3_600_000
export const DAY = 86_400_000

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/** Calendar parts of an instant as seen in an IANA time zone. `weekday` is 0 = Sunday. */
export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
    })
    formatters.set(timeZone, f)
  }
  return f
}

export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(ms)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: SHORT_WEEKDAYS.indexOf(get('weekday')),
  }
}

/** Days since the epoch for the calendar date of `ms` in `timeZone` (for "today"/"tomorrow" math). */
export function calendarDay(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day) / DAY
}

/** Zone abbreviation the way iOS prints it: "EDT", "HST", or "GMT+2" outside the US. */
export function zoneAbbr(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(ms)
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
}

export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** True when the locale uses a 24-hour clock (Crewluve follows the device's 12/24-hour setting). */
export function prefers24Hour(locale?: string): boolean {
  const options = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions()
  if (options.hourCycle) return options.hourCycle === 'h23' || options.hourCycle === 'h24'
  return options.hour12 === false
}
