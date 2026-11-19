import { isKnownZone, zoneOffsetMinutes, zonedParts } from '../time/zoned'

/**
 * Whose time a time is (time labels design §2, §3.1), as the app's ClockLabel: the family's own, the viewer's zone, is
 * marked "L", and a city's is followed by its name. `clockTime` writes a time; the rest label it. Screen readers hear the
 * "L" as "your time" (`spoken`). The shared cases, tests/fixtures/trip-map/clock-label-cases.json, hold both sides to the
 * same words.
 */

/** The mark after the family's own time: "4:35 PM L". */
export const MARK = 'L'

/**
 * "4:35 PM", with the narrow no-break space Apple's formatter puts before AM or PM, or "16:35" in 24-hour time. Apple
 * writes a 24-hour morning hour without a leading zero, "5:35", and so does this.
 */
export function clockTime(ms: number, timeZone: string, h24: boolean): string {
  const { hour, minute } = zonedParts(ms, timeZone)
  const mm = String(minute).padStart(2, '0')
  if (h24) return `${hour}:${mm}`
  return `${hour % 12 === 0 ? 12 : hour % 12}:${mm} ${hour < 12 ? 'AM' : 'PM'}`
}

/** "4:35 PM L": `ms` in the family's time, `viewerTz`. */
export const yours = (ms: number, viewerTz: string, h24: boolean): string => `${clockTime(ms, viewerTz, h24)} ${MARK}`

/** "7:02 AM Cologne": `ms` in `zone`, the city's. */
export const place = (ms: number, zone: string, city: string, h24: boolean): string => `${clockTime(ms, zone, h24)} ${city}`

/** Whether `zone` reads the same clock as `viewerTz` at `ms`. */
export const keepsTheSameClock = (zone: string, viewerTz: string, ms: number): boolean =>
  zoneOffsetMinutes(ms, zone) === zoneOffsetMinutes(ms, viewerTz)

/**
 * "12:35 PM · 4:35 PM L": `ms` in a city the line has just named, then in the family's time. The family's alone, "4:35 PM
 * L", where the city keeps their clock at `ms` or its zone isn't known.
 */
export function pair(ms: number, zone: string | null, viewerTz: string, h24: boolean): string {
  const mine = yours(ms, viewerTz, h24)
  if (zone == null || !isKnownZone(zone) || keepsTheSameClock(zone, viewerTz, ms)) return mine
  return `${clockTime(ms, zone, h24)} · ${mine}`
}

const zoneNameFormatters = new Map<string, Intl.DateTimeFormat>()

/** "Eastern Standard Time", or "Eastern Daylight Time" while the zone keeps summer time at `ms`; the zone itself where it can't be named. */
export function zoneName(zone: string, ms: number): string {
  if (!isKnownZone(zone)) return zone
  let f = zoneNameFormatters.get(zone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'long' })
    zoneNameFormatters.set(zone, f)
  }
  return f.formatToParts(ms).find((p) => p.type === 'timeZoneName')?.value ?? zone
}

/** The key under the facts and the status: "L = your time (Eastern Standard Time)", by the zone's name at `ms`. */
export const key = (viewerTz: string, ms: number): string => `${MARK} = your time (${zoneName(viewerTz, ms)})`

/**
 * " L" straight after a time, its last digit or the AM or PM after its digits, and not the start of a word such as
 * "Lisbon" or "L'Aquila". Global, so `spoken` finds every one; `hasMark` makes its own copy, as a global pattern
 * remembers where it last matched.
 */
const MARK_AFTER_A_TIME = /([0-9](?:[  ]?[AaPp][Mm])?) L(?![\p{L}'’])/gu

/** The words as a screen reader says them: "Lands Anchorage 12:35 PM · 4:35 PM L" says "… 4:35 PM your time". */
export const spoken = (text: string): string => text.replace(MARK_AFTER_A_TIME, '$1 your time')

/** Whether `text` holds a time marked "L". */
export const hasMark = (text: string): boolean => new RegExp(MARK_AFTER_A_TIME.source, 'u').test(text)
