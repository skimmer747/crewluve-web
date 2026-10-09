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
const abbrFormatters = new Map<string, Intl.DateTimeFormat>()
const knownZones = new Map<string, boolean>()

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

function abbrFormatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = abbrFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    abbrFormatters.set(timeZone, f)
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
  const parts = abbrFormatterFor(timeZone).formatToParts(ms)
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
}

/**
 * Whether this runtime's Intl accepts the IANA zone. Older tz data rejects newer zones (for example
 * America/Coyhaique before tzdata 2025b), and formatting a time in one throws. Checked once per zone.
 */
export function isKnownZone(timeZone: string): boolean {
  let known = knownZones.get(timeZone)
  if (known === undefined) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone })
      known = true
    } catch {
      known = false
    }
    knownZones.set(timeZone, known)
  }
  return known
}

/** The viewer's IANA zone, or "UTC" when the browser reports none (some engines don't) or one it cannot format times in. */
export function viewerTimeZone(resolve: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const zone = resolve()
  return typeof zone === 'string' && isKnownZone(zone) ? zone : 'UTC'
}

/** True when the locale uses a 24-hour clock (Crewluve follows the device's 12/24-hour setting). */
export function prefers24Hour(locale?: string): boolean {
  // lib.es2020 leaves hourCycle off the resolved options, although every browser reports it.
  const options = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & {
    hourCycle?: string
  }
  if (options.hourCycle) return options.hourCycle === 'h23' || options.hourCycle === 'h24'
  return options.hour12 === false
}
