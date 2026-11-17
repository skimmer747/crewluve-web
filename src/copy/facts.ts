import { aircraftTypeName } from '../facts/aircraftTypeNames'
import type { City, Place } from '../facts/geography'
import type { Milestone, MilestoneKind } from '../facts/milestone'
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import { METERS_PER_MILE, METERS_PER_NM } from '../map/greatCircle'
import { isArrivalEstimated, type MapLeg } from '../map/tripMap'
import type { MoonPhase } from '../time/moon'
import { MINUTE, zoneOffsetMinutes } from '../time/zoned'
import { shortTimeText } from './format'
import { minutesText, spokenMinutes } from './tripMap'

/**
 * The facts' sentences about a flight (Stage 2 spec §4, §5), as the app's FactsWording: milestones, what's below, the
 * sky, distance and landing. Times are the family's own, in `viewerTz`, unless the words say "there". The whole trip's
 * sentences are in src/copy/factsTrip.ts.
 */

/** "4,351". */
export const numberText = (value: number) => value.toLocaleString('en-US')

// Milestones (§4.3)

/** The headline: "Just crossed into Kansas", "Out over the Atlantic", "Halfway!", "Closest to home: 40 mi, wave!". */
export function milestoneHeadline(milestone: MilestoneKind): string {
  switch (milestone.kind) {
    case 'crossedInto':
      return `Just crossed into ${milestone.name}`
    case 'outOver':
      return `Out over ${milestone.name}`
    case 'halfway':
      return 'Halfway!'
    case 'closestToHome':
      return `Closest to home: ${milestone.miles} mi, wave!`
  }
}

/** "about " before a time that's a best guess, else nothing (best guesses design §2). */
const aboutIf = (isEstimate: boolean | undefined) => (isEstimate ? 'about ' : '')

/**
 * The trip so far's list: "Crossed into Kansas · 1:12 PM". A best guess reads "about": "Out over the Pacific · about
 * 4:05 PM" (best guesses design §2).
 */
export const milestoneLine = (milestone: Milestone, viewerTz: string, h24: boolean) =>
  `${eventTitle(milestone)} · ${aboutIf(milestone.isEstimate)}${shortTimeText(milestone.time, viewerTz, h24)}`

/**
 * What an event was, on its own: "Crossed into Kansas", "Out over the Atlantic", "Halfway", "Closest to home, 40 mi".
 * The latest event's banner shows it large (latest event design §1).
 */
export function eventTitle(milestone: MilestoneKind): string {
  switch (milestone.kind) {
    case 'crossedInto':
      return `Crossed into ${milestone.name}`
    case 'outOver':
      return `Out over ${milestone.name}`
    case 'halfway':
      return 'Halfway'
    case 'closestToHome':
      return `Closest to home, ${milestone.miles} mi`
  }
}

/**
 * The whole minutes from `time` to `t`, to the nearest and held to a year, or null under a minute, and for a time that
 * can't be right.
 */
function minutesSince(time: number, t: number): number | null {
  const elapsed = t - time
  if (!(elapsed >= MINUTE)) return null
  return Math.min(Math.round(elapsed / MINUTE), 365 * 24 * 60)
}

/**
 * When an event was, under it in the banner (latest event design §1): "Just now" in its first minute, then "12 min ago".
 * A best guess says so: "About now", "About 12 min ago". At a moment of the replay, where "ago" means nothing, its clock
 * time: "10:37 AM", "About 10:37 AM".
 */
export function eventWhen(milestone: Milestone, t: number, viewerTz: string, h24: boolean, isReplay = false): string {
  const about = milestone.isEstimate ? 'About ' : ''
  if (isReplay) return `${about}${shortTimeText(milestone.time, viewerTz, h24)}`
  const minutes = minutesSince(milestone.time, t)
  if (minutes == null) return milestone.isEstimate ? 'About now' : 'Just now'
  return `${about}${minutesText(minutes)} ago`
}

/**
 * The widest "when" of a flight in the air: a best guess two-digit hours ago, in eights, as wide as any digit. A replay's
 * clock time, "About 10:37 AM", is narrower. The banner keeps room for it when it decides where the key goes, so the key
 * doesn't move while the same event shows.
 */
export const WIDEST_EVENT_WHEN = 'About 88 h 88 min ago'

/**
 * The banner as a screen reader reads it, as its own sentence (latest event design §3): "Latest: crossed into Canada, 12
 * minutes ago.", "Latest: halfway, about 40 minutes ago.", or at a moment of the replay "Latest: crossed into Canada, at
 * 10:37 AM." The card's sentence has it too.
 */
export function spokenLatestEvent(milestone: Milestone, t: number, viewerTz: string, h24: boolean, isReplay = false): string {
  const what = milestone.kind === 'closestToHome' ? `closest to home, ${milestone.miles} miles` : midLine(eventTitle(milestone))
  const about = aboutIf(milestone.isEstimate)
  const minutes = minutesSince(milestone.time, t)
  const when = isReplay ? `at ${about}${shortTimeText(milestone.time, viewerTz, h24)}`
    : minutes != null ? `${about}${spokenMinutes(minutes)} ago`
    : milestone.isEstimate ? 'about now' : 'just now'
  return `Latest: ${what}, ${when}.`
}

/**
 * The tag on the flight between its gates, in the list: "In the air now", or "In the air" at a moment of the replay
 * (best guesses design §4).
 */
export const inTheAirTag = (isReplay: boolean) => (isReplay ? 'In the air' : 'In the air now')

/** "UPS207 · Louisville → Cologne", or the cities alone without a flight number. */
export function flightTitle(leg: MapLeg): string {
  const route = `${leg.origin.city} → ${leg.destination.city}`
  return leg.flightNumber ? `${leg.flightNumber} · ${route}` : route
}

// Below (§4.1)

/** "Over Kansas", "Over Québec, near Montréal". */
export const belowWords = (place: Place, city: City | null) => (city ? `Over ${place.name}, near ${city.name}` : `Over ${place.name}`)

/**
 * In place of what's below, a real plane still on the ground at its departure airport once its leg has begun: "Still on
 * the ground in Rockford" (the website's own, Todd, 16 Nov 2026).
 */
export const stillOnGroundText = (city: string) => `Still on the ground in ${city}`

/**
 * "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. Where nobody saw the
 * real plane (`isEstimate`) the time is a best guess: "Passes 40 mi from home at about 1:05 PM".
 */
export function closestToHomeText(miles: number, at: number, now: number, viewerTz: string, h24: boolean, isEstimate = false): string {
  const clock = `${aboutIf(isEstimate)}${shortTimeText(at, viewerTz, h24)}`
  return at > now ? `Passes ${miles} mi from home at ${clock}` : `Closest to home was ${miles} mi at ${clock}`
}

// The real plane (Stage 3 spec §8)

/** Whole minutes in `ago` ms, held from a minute to a year, so a length that can't be right never reaches the screen. */
function minutesAgo(ago: number): number {
  const asked = Math.round(ago / MINUTE)
  return Number.isNaN(asked) ? 1 : Math.min(Math.max(asked, 1), 365 * 24 * 60)
}

/**
 * Under what's below, while the real plane is out of sight, `ago` ms after it was last seen: "Last seen near Montréal ·
 * 12 min ago" by a city of a million or more, else "Last seen over Québec · 12 min ago", else "Last seen 12 min ago".
 * It's the one line that says the place above it is worked out, not seen (best guesses design §2).
 */
export function lastSeenLine(place: Place | null, city: City | null, ago: number): string {
  const time = `${minutesText(minutesAgo(ago))} ago`
  if (city) return `Last seen near ${city.name} · ${time}`
  if (place) return `Last seen over ${place.name} · ${time}`
  return `Last seen ${time}`
}

/**
 * Where a plane that's out of sight was last seen, for the card's sentence for a screen reader: "near Montréal" by a
 * city of a million or more, else "over Québec", else how long ago, "2 hours ago".
 */
export function spokenLastSeen(place: Place | null, city: City | null, ago: number): string {
  if (city) return `near ${city.name}`
  if (place) return `over ${place.name}`
  return `${spokenMinutes(minutesAgo(ago))} ago`
}

/** `text` without the spaces around it, or null when nothing is left. */
const nonEmpty = (text: string | null) => text?.trim() || null

/**
 * The plane's row: "Boeing 767-300 · N370UP". An unknown type code shows as itself, "ZZZZ · N370UP", and a missing type
 * or registration is left out. Null with neither.
 */
export function aircraftText(typeCode: string | null, registration: string | null): string | null {
  const type = nonEmpty(typeCode)
  const parts = [type == null ? null : aircraftTypeName(type), nonEmpty(registration)].filter((p): p is string => p != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * A height or a speed outside these is left out: no airliner sends one, and a number that can't be right mustn't reach
 * the screen.
 */
export const BELIEVED_HEIGHTS_FEET = { lowest: 0, highest: 60_000 }
export const BELIEVED_SPEEDS_KNOTS = { lowest: 0, highest: 800 }

/** Whether `value` is within `range`: never a value that isn't a number. */
const isWithin = (value: number, range: { lowest: number; highest: number }) => value >= range.lowest && value <= range.highest

/** `value` to the nearest `step`, as a whole number: "35,000", never "-0". */
const toNearest = (value: number, step: number) => numberText(Math.round(value / step) * step + 0)

/**
 * "35,000 ft · 540 mph": the real plane's height to the nearest 100 ft and its speed over the ground to the nearest 10
 * mph, each where the plane sent one that could be right. Null with neither.
 */
export function heightAndSpeedText(altitudeFeet: number | null, groundSpeedKnots: number | null): string | null {
  const height = altitudeFeet != null && isWithin(altitudeFeet, BELIEVED_HEIGHTS_FEET) ? `${toNearest(altitudeFeet, 100)} ft` : null
  const speed = groundSpeedKnots != null && isWithin(groundSpeedKnots, BELIEVED_SPEEDS_KNOTS)
    ? `${toNearest((groundSpeedKnots * METERS_PER_NM) / METERS_PER_MILE, 10)} mph`
    : null
  const parts = [height, speed].filter((p): p is string => p != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The credit under the facts wherever a flight with live data shows: adsb.lol's data is under the ODbL. */
export const LIVE_CREDIT = 'Live position: adsb.lol'
/** The credit as a screen reader reads it. */
export const SPOKEN_LIVE_CREDIT = 'Live position from adsb.lol.'

// The sky (§4.5)

const sunName = (kind: SunKind) => (kind === 'sunrise' ? 'Sunrise' : 'Sunset')

/** Whole minutes until `time`, rounded up, and at least 1. */
const minutesUntil = (now: number, time: number) => Math.max(1, Math.ceil((time - now) / MINUTE))

/** The headline: "Sunset from the cockpit in 25 min". */
export const cockpitCountdown = (event: SunEvent, now: number) => `${sunName(event.kind)} from the cockpit in ${minutesUntil(now, event.time)} min`

/** The sky row: "Sunset in 25 min, about 12 min after the people below", or "Sunrise at 6:38 AM" 59 minutes or more ahead. */
export function cockpitEventText(event: SunEvent, now: number, viewerTz: string, h24: boolean): string {
  // Under 59 minutes as a countdown, so it never reads "in 60 min", as the app's FactsWording does.
  const when = event.time - now < 59 * MINUTE ? `in ${minutesUntil(now, event.time)} min` : `at ${shortTimeText(event.time, viewerTz, h24)}`
  if (event.peopleBelowGap == null) return `${sunName(event.kind)} ${when}`
  const side = event.kind === 'sunset' ? 'after' : 'before'
  return `${sunName(event.kind)} ${when}, about ${Math.round(event.peopleBelowGap / MINUTE)} min ${side} the people below`
}

export const flyingInto = (kind: SunKind) => (kind === 'sunset' ? 'Flying into the night' : 'Flying into the morning')

export const chaseText = (chase: Chase) => `Chasing the sun: their ${chase} is stretching`

const MOON_NAMES: Record<MoonPhase, string> = {
  new: 'New moon',
  waxingCrescent: 'Waxing crescent moon',
  firstQuarter: 'First quarter moon',
  waxingGibbous: 'Waxing gibbous moon',
  full: 'Full moon',
  waningGibbous: 'Waning gibbous moon',
  lastQuarter: 'Last quarter moon',
  waningCrescent: 'Waning crescent moon',
}

/** "Waxing gibbous moon", in sentence case. */
export const moonName = (phase: MoonPhase) => MOON_NAMES[phase]

/** "Waxing gibbous moon, up", "Full moon, below the horizon". */
export const moonText = (sight: MoonSight) => `${moonName(sight.phase)}, ${sight.isUp ? 'up' : 'below the horizon'}`

/** On the ground at an airport: "sunrise at 7:02 AM there". */
export const groundSunText = (kind: SunKind, time: number, zone: string, h24: boolean) => `${kind} at ${shortTimeText(time, zone, h24)} there`

// Distance (§4.6)

/** "2,140 mi flown · 1,960 to go". */
export const flownText = (flown: number, toGo: number) => `${numberText(flown)} mi flown · ${numberText(toGo)} to go`

/** "2,788 mi to go": a real plane still at its departure airport has flown nothing yet (the website's own, Todd, 16 Nov 2026). */
export const toGoText = (toGo: number) => `${numberText(toGo)} mi to go`

/** "Halfway at 4:12 PM", or with the real plane's estimate "Halfway at about 12:05 PM" (Stage 3 spec §8). */
export const halfwayText = (time: number, viewerTz: string, h24: boolean, isEstimate = false) =>
  `Halfway at ${aboutIf(isEstimate)}${shortTimeText(time, viewerTz, h24)}`

/** "Averaging about 510 mph", to the nearest 10. */
export const averageSpeedText = (milesPerHour: number) => `Averaging about ${Math.round(milesPerHour / 10) * 10} mph`

/** A comparison in the middle of a line: "like driving coast to coast". */
export const midLine = (phrase: string) => phrase.charAt(0).toLowerCase() + phrase.slice(1)

// Where they're headed (§4.7)

/** "6 hours ahead of you", "5½ hours behind you", "½ hour ahead of you" at `t`, or null when the clocks match. */
export function timeDifferenceText(zone: string, viewerTz: string, t: number): string | null {
  const minutes = zoneOffsetMinutes(t, zone) - zoneOffsetMinutes(t, viewerTz)
  if (minutes === 0) return null
  const quarters = Math.floor(Math.abs(minutes) / 15)
  const whole = Math.floor(quarters / 4)
  const part = ['', '¼', '½', '¾'][quarters % 4]
  const amount = whole === 0 ? part : `${whole}${part}`
  return `${amount} ${quarters <= 4 ? 'hour' : 'hours'} ${minutes > 0 ? 'ahead of' : 'behind'} you`
}

/** "lands 4:05 PM there", or in the family's time when the destination keeps it or its zone isn't known. */
export function landsText(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const there = leg.destination.timeZone
  // "lands about 4:05 PM there" when it's the real plane's estimate (Stage 3 spec §9).
  const about = isArrivalEstimated(leg) ? 'about ' : ''
  if (there && zoneOffsetMinutes(leg.end, there) !== zoneOffsetMinutes(leg.end, viewerTz)) return `lands ${about}${shortTimeText(leg.end, there, h24)} there`
  return `lands ${about}${shortTimeText(leg.end, viewerTz, h24)}`
}
