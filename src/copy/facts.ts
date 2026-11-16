import type { City, Place } from '../facts/geography'
import type { Milestone, MilestoneKind } from '../facts/milestone'
import type { Chase, MoonSight, SunEvent, SunKind } from '../facts/sky'
import { isArrivalEstimated, type MapLeg } from '../map/tripMap'
import type { MoonPhase } from '../time/moon'
import { MINUTE, zoneOffsetMinutes } from '../time/zoned'
import { shortTimeText } from './format'

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

/** The trip so far's list: "Crossed into Kansas · 1:12 PM". */
export function milestoneLine(milestone: Milestone, viewerTz: string, h24: boolean): string {
  const time = shortTimeText(milestone.time, viewerTz, h24)
  switch (milestone.kind) {
    case 'crossedInto':
      return `Crossed into ${milestone.name} · ${time}`
    case 'outOver':
      return `Out over ${milestone.name} · ${time}`
    case 'halfway':
      return `Halfway · ${time}`
    case 'closestToHome':
      return `Closest to home, ${milestone.miles} mi · ${time}`
  }
}

/** "UPS207 · Louisville → Cologne", or the cities alone without a flight number. */
export function flightTitle(leg: MapLeg): string {
  const route = `${leg.origin.city} → ${leg.destination.city}`
  return leg.flightNumber ? `${leg.flightNumber} · ${route}` : route
}

// Below (§4.1)

/** "Over Kansas", "Over Québec, near Montréal". */
export const belowWords = (place: Place, city: City | null) => (city ? `Over ${place.name}, near ${city.name}` : `Over ${place.name}`)

/** "Passes 40 mi from home at 1:05 PM", or "Closest to home was 40 mi at 1:05 PM" once it's passed. */
export function closestToHomeText(miles: number, at: number, now: number, viewerTz: string, h24: boolean): string {
  const clock = shortTimeText(at, viewerTz, h24)
  return at > now ? `Passes ${miles} mi from home at ${clock}` : `Closest to home was ${miles} mi at ${clock}`
}

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

export const halfwayText = (time: number, viewerTz: string, h24: boolean) => `Halfway at ${shortTimeText(time, viewerTz, h24)}`

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
