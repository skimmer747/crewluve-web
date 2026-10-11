import { calendarDay, MONTHS, WEEKDAYS, zoneAbbr, zonedParts } from '../time/zoned'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "st" | "nd" | "rd" | "th" (Crewluve ordinalSuffix). */
export function ordinalSuffix(day: number): string {
  const lastTwo = day % 100
  if (lastTwo >= 11 && lastTwo <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

export function daysText(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

/** Narrative countdown (NarrativeCardView.countdownText): "2d 8h 8m", "8h 8m", "8m", "<1m", "now!". */
export function narrativeCountdown(ms: number): string {
  if (ms <= 0) return 'now!'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return '<1m'
}

/**
 * A countdown in words for screen readers, so "49m" isn't read as "49 meters": "1 day, 6 hours, 59 minutes".
 * Whole minutes, rounded down like the visible countdowns; zero parts are left out.
 */
export function spokenDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'less than a minute'
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  const d = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  const m = minutes % 60
  return [d && part(d, 'day'), h && part(h, 'hour'), m && part(m, 'minute')].filter(Boolean).join(', ')
}

export interface CountdownPart {
  value: string
  unit: 'd' | 'h' | 'm' | 's'
}

/** Big countdown (CountdownCardView): "2d 08h 08m", "8h 08m", "7m 05s". Null means "Now!". */
export function cardCountdown(ms: number): CountdownPart[] | null {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return [{ value: String(d), unit: 'd' }, { value: pad2(h), unit: 'h' }, { value: pad2(m), unit: 'm' }]
  if (h > 0) return [{ value: String(h), unit: 'h' }, { value: pad2(m), unit: 'm' }]
  return [{ value: String(m), unit: 'm' }, { value: pad2(s % 60), unit: 's' }]
}

/** Footer age (SyncStatusBarView.elapsedText). Null under 5 s, meaning "just now". */
export function ageText(ms: number): string | null {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 5) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 24) return '>1 day'
  if (h > 0) return `${h}h ${pad2(m)}m`
  if (m > 0) return `${m}m ${pad2(s % 60)}s`
  return `${s}s`
}

export function agoText(prefix: string, ms: number): string {
  const age = ageText(ms)
  return age == null ? `${prefix} just now` : `${prefix} ${age} ago`
}

/** "2 hours 30 minutes", "1 hour", "45 minutes" (formattedDelayDuration). The sign is ignored. */
export function delayText(minutes: number): string {
  const total = Math.abs(Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  const hours = `${h} ${h === 1 ? 'hour' : 'hours'}`
  const mins = `${m} ${m === 1 ? 'minute' : 'minutes'}`
  if (h > 0 && m > 0) return `${hours} ${mins}`
  return h > 0 ? hours : mins
}

/** The time in `timeZone` as "8:12" plus `am` or `pm`, or as "08:12" in 24-hour: what the clock formats below share. */
function clock(ms: number, timeZone: string, h24: boolean, am: string, pm: string): string {
  const { hour, minute } = zonedParts(ms, timeZone)
  if (h24) return `${pad2(hour)}:${pad2(minute)}`
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad2(minute)}${hour < 12 ? am : pm}`
}

/** "1:00pm" (12-hour, lowercase, no space: Crewluve "h:mma") or "13:00" ("HH:mm"). */
export function clockText(ms: number, timeZone: string, h24: boolean): string {
  return clock(ms, timeZone, h24, 'am', 'pm')
}

/**
 * A clock time with its day when that isn't today in `timeZone`: "7:59am", "Thu 7:59am", or "Oct 2, 7:59am".
 * A weekday name is unambiguous only for the six days before today (a week back it repeats today's),
 * so anything older, or ahead of `now`, gets the date.
 */
export function clockWithDayText(ms: number, now: number, timeZone: string, h24: boolean): string {
  const time = clockText(ms, timeZone, h24)
  const daysAgo = calendarDay(now, timeZone) - calendarDay(ms, timeZone)
  if (daysAgo === 0) return time
  const p = zonedParts(ms, timeZone)
  if (daysAgo >= 1 && daysAgo <= 6) return `${WEEKDAYS[p.weekday].slice(0, 3)} ${time}`
  return `${MONTHS[p.month - 1].slice(0, 3)} ${p.day}, ${time}`
}

/** The location card's clock: "9:14 AM", with iOS's narrow no-break space before AM, or "09:14" (DateFormatter's short time). */
export function shortTimeText(ms: number, timeZone: string, h24: boolean): string {
  return clock(ms, timeZone, h24, '\u202FAM', '\u202FPM')
}

/** A sun dial label: "8:12a" or "6:41p" (SunCircleView.formatTime, "h:mma" with a and p), or "08:12" in 24-hour. */
export function dialTimeText(ms: number, timeZone: string, h24: boolean): string {
  return clock(ms, timeZone, h24, 'a', 'p')
}

/** {T}: "1:00pm EST" or "13:00 EST" (formattedLocalTime). */
export function timeWithZone(ms: number, timeZone: string, h24: boolean): string {
  return `${clockText(ms, timeZone, h24)} ${zoneAbbr(ms, timeZone)}`
}

/** {dep}: "today at 6:00am", "tomorrow at 6:00am", or "Sunday the 1st at 6:00am" (formattedDepartureDate). */
export function departureText(ms: number, now: number, timeZone: string, h24: boolean): string {
  const time = clockText(ms, timeZone, h24)
  const diff = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (diff === 0) return `today at ${time}`
  if (diff === 1) return `tomorrow at ${time}`
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday]} the ${p.day}${ordinalSuffix(p.day)} at ${time}`
}

/** Upcoming trip card: "Departs today at 6:00am", "Departs tomorrow at 6:00am", or "Departs Tue Oct 13 at 6:00am" (UpcomingTripCard.formattedDeparture, with 24-hour times respected). */
export function tripCardDepartsText(ms: number, now: number, timeZone: string, h24: boolean): string {
  const time = clockText(ms, timeZone, h24)
  const diff = calendarDay(ms, timeZone) - calendarDay(now, timeZone)
  if (diff === 0) return `Departs today at ${time}`
  if (diff === 1) return `Departs tomorrow at ${time}`
  const p = zonedParts(ms, timeZone)
  return `Departs ${WEEKDAYS[p.weekday].slice(0, 3)} ${MONTHS[p.month - 1].slice(0, 3)} ${p.day} at ${time}`
}

function longDate(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday]} ${MONTHS[p.month - 1]} ${p.day}${ordinalSuffix(p.day)}`
}

/** {HB} date: "Monday October 12th at 8:02pm EDT" (homecomingText). */
export function longDateTimeText(ms: number, timeZone: string, h24: boolean): string {
  return `${longDate(ms, timeZone)} at ${timeWithZone(ms, timeZone, h24)}`
}

/** Arrival card date: "Sun, Mar 1 at 5:57 PM", with iOS's narrow no-break space before PM; or "Sun, Mar 1 at 17:57". */
export function arrivalWhenText(ms: number, timeZone: string, h24: boolean): string {
  const p = zonedParts(ms, timeZone)
  return `${WEEKDAYS[p.weekday].slice(0, 3)}, ${MONTHS[p.month - 1].slice(0, 3)} ${p.day} at ${shortTimeText(ms, timeZone, h24)}`
}

/** Leave card subtitle: "Departs Sunday March 1st at 5:57pm" (24-hour: "… at 17:57", fixing the app's "17:57pm"). */
export function leaveWhenText(ms: number, timeZone: string, h24: boolean): string {
  return `Departs ${longDate(ms, timeZone)} at ${clockText(ms, timeZone, h24)}`
}

/** Commuter with no logged commute: "Trip departs Louisville Sunday March 1st at 5:57pm". */
export function tripDepartsText(city: string, ms: number, timeZone: string, h24: boolean): string {
  return `Trip departs ${city} ${longDate(ms, timeZone)} at ${clockText(ms, timeZone, h24)}`
}
