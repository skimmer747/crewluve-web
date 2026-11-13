import { METERS_PER_MILE } from '../map/greatCircle'
import {
  legDistanceMeters, legInMotion, legProgress, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
import { shortTimeText } from './format'

/**
 * Every sentence the trip map shows or speaks (moving map spec §5, §6, §14), as the app's TripMapWording. Times are the
 * family's own, in `viewerTz`, unless the words say "there".
 */

const shortWeekday = (ms: number, tz: string) => WEEKDAYS[zonedParts(ms, tz).weekday].slice(0, 3)
const monthDay = (ms: number, tz: string) => {
  const p = zonedParts(ms, tz)
  return `${MONTHS[p.month - 1].slice(0, 3)} ${p.day}`
}

/** "today", "tomorrow", a weekday within the week, else "Nov 20". */
export function dayPhrase(ms: number, now: number, tz: string): string {
  const days = calendarDay(ms, tz) - calendarDay(now, tz)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days >= 2 && days <= 6) return WEEKDAYS[zonedParts(ms, tz).weekday]
  return monthDay(ms, tz)
}

/** "Fri–Mon", "Fri" for one day, or "Nov 13–Nov 20" for six days or more. */
export function dateRangeText(start: number, end: number, tz: string): string {
  const days = calendarDay(end, tz) - calendarDay(start, tz)
  if (days >= 6) return `${monthDay(start, tz)}–${monthDay(end, tz)}`
  return days === 0 ? shortWeekday(start, tz) : `${shortWeekday(start, tz)}–${shortWeekday(end, tz)}`
}

/** "Cologne · 9:14 PM there". */
export function placeChip(place: AirportMark, now: number, h24: boolean): string {
  return place.timeZone ? `${place.city} · ${shortTimeText(now, place.timeZone, h24)} there` : place.city
}

/** "Next: Dubai, tomorrow 6:10 AM". */
export function nextDepartureChip(leg: MapLeg, now: number, viewerTz: string, h24: boolean): string {
  return `Next: ${leg.destination.city}, ${dayPhrase(leg.start, now, viewerTz)} ${shortTimeText(leg.start, viewerTz, h24)}`
}

/** "Home · next trip Wednesday". */
export const nextTripChip = (start: number, now: number, viewerTz: string) => `Home · next trip ${dayPhrase(start, now, viewerTz)}`

/** "Landing in 2 h 10 min", to the gate arrival. */
export function landingCountdown(leg: MapLeg, now: number): string {
  const minutes = Math.ceil((leg.end - now) / 60_000)
  if (minutes <= 0) return 'Landing now'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `Landing in ${rest} min`
  return rest === 0 ? `Landing in ${hours} h` : `Landing in ${hours} h ${rest} min`
}

/** The destination's own time at landing, or null when it keeps the family's. */
function thereAtLanding(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = leg.destination.timeZone
  if (!there || zoneOffsetMinutes(leg.end, there) === zoneOffsetMinutes(leg.end, viewerTz)) return null
  return shortTimeText(leg.end, there, h24)
}

/** "Lands Cologne 9:30 PM · 3:30 PM your time", or "Lands Louisville 3:30 PM". */
export function landingLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const yours = shortTimeText(leg.end, viewerTz, h24)
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `Lands ${leg.destination.city} ${there} · ${yours} your time` : `Lands ${leg.destination.city} ${yours}`
}

/** "Lands 3:30 PM", for the card's bar. */
export const landsAt = (leg: MapLeg, viewerTz: string, h24: boolean) => `Lands ${shortTimeText(leg.end, viewerTz, h24)}`

/** "9:30 PM in Cologne", or null when the destination keeps the family's time. */
export function arrivalLocalTime(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `${there} in ${leg.destination.city}` : null
}

const miles = (meters: number) => Math.round(meters / METERS_PER_MILE).toLocaleString('en-US')

/** The airports the trip's flights reach, in order, each once, home left out. */
function destinations(map: TripMap): AirportMark[] {
  const seen = new Set(map.home ? [map.home.code] : [])
  return map.legs.filter((l) => l.kind === 'flight').map((l) => l.destination).filter((a) => !seen.has(a.code) && seen.add(a.code))
}

/** The bar's words on the ground (moving map spec §5.3); empty in flight, where the bar shows the flight. */
export function statsItems(map: TripMap, t: number, day: number | null, days: number | null, viewerTz: string): string[] {
  const flights = map.legs.filter((l) => l.kind === 'flight')
  const cities = destinations(map)
  if (map.mode.kind === 'inFlight') return []
  if (map.mode.kind === 'onTrip') {
    const flown = flights.reduce((sum, l) => sum + legDistanceMeters(l) * legProgress(l, t), 0)
    return [
      ...(day != null && days != null ? [`Day ${day} of ${days}`] : []),
      ...(cities.length > 0 ? [cities.length === 1 ? '1 city' : `${cities.length} cities`] : []),
      ...(flights.length > 0 ? [`${miles(flown)} mi so far`] : []),
    ]
  }
  const total = flights.reduce((sum, l) => sum + legDistanceMeters(l), 0)
  const distance = flights.length > 0 ? `${miles(total)} mi` : ''
  return [dateRangeText(map.span.start, map.span.end, viewerTz), cities.map((c) => c.code).join(' · '), distance].filter((s) => s !== '')
}

/** The drive under way at `t`, if the leg in motion is one. */
function driveUnderWay(map: TripMap, t: number): MapLeg | null {
  const leg = legInMotion(map, t)
  return leg?.kind === 'drive' ? leg : null
}

/** The chips on the card's map (moving map spec §5.1, §5.2). */
export function cardChips(map: TripMap, t: number, viewerTz: string, h24: boolean): { top: string | null; bottom: string | null } {
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    return { top: null, bottom: leg ? landingCountdown(leg, t) : null }
  }
  if (map.mode.kind === 'nextTrip') return { top: nextTripChip(map.span.start, t, viewerTz), bottom: null }
  const place = pilotLocation(map, t)
  const drive = driveUnderWay(map, t)
  const next = nextFlight(map, t)
  const top = place ? placeChip(place, t, h24) : drive ? `Driving to ${drive.destination.city}` : null
  return { top, bottom: next ? nextDepartureChip(next, t, viewerTz, h24) : null }
}

/** The full map's pill: "UPS207 · In flight", "Driving to Louisville", "Day 2 of 4" or "Next trip". */
export function topPill(map: TripMap, t: number, day: number | null, days: number | null): string {
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? [leg.flightNumber, 'In flight'].filter(Boolean).join(' · ') : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return 'Next trip'
  return day != null && days != null ? `Day ${day} of ${days}` : 'Trip map'
}

/** The full map panel's first line: the landing line in the air, else where they are. */
export function panelHeadline(map: TripMap, t: number, viewerTz: string, h24: boolean): string {
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? landingLine(leg, viewerTz, h24) : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return nextTripChip(map.span.start, t, viewerTz)
  const place = pilotLocation(map, t)
  return place ? placeChip(place, t, h24) : ''
}

/** "Fri 9:14 PM", under the timeline and as the slider's spoken value. */
export const timelineTime = (ms: number, viewerTz: string, h24: boolean) => `${shortWeekday(ms, viewerTz)} ${shortTimeText(ms, viewerTz, h24)}`

/** The card as one sentence for screen readers (moving map spec §14), ending with what it opens. */
export function tripMapSummary(map: TripMap, t: number, name: string, viewerTz: string, h24: boolean): string {
  const opens = 'Opens the full map.'
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    if (!leg) return `Trip map. ${opens}`
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    return `${lead} ${leg.destination.city}, landing at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. ${opens}`
  }
  if (map.mode.kind === 'nextTrip') {
    const day = dayPhrase(map.span.start, t, viewerTz)
    const cities = destinations(map).map((c) => c.city)
    return cities.length > 0 ? `Map of the next trip, ${day}: ${cities.join(', ')}. ${opens}` : `Map of the next trip, ${day}. ${opens}`
  }
  const parts = ['Trip map.']
  const place = pilotLocation(map, t)
  const drive = driveUnderWay(map, t)
  if (place) parts.push(`${name} is in ${place.city}.`)
  else if (drive) parts.push(`${name} is driving to ${drive.destination.city}.`)
  const next = nextFlight(map, t)
  if (next) parts.push(`${nextDepartureChip(next, t, viewerTz, h24)}.`)
  return [...parts, opens].join(' ')
}
