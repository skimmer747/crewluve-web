import type { AppleMapStyle } from '../map/appleMapStyle'
import type { LiveLabel } from '../map/liveLabel'
import { mapFlightProgress } from '../map/mapFlight'
import {
  dayCount, destinationsOf, isArrivalEstimated, legInMotion, legStillOnGround, nextFlight, pilotLocation, currentLeg, type AirportMark, type MapLeg,
  type TripMap,
} from '../map/tripMap'
import { milesFlown, totalMiles } from '../facts/tripTotals'
import { calendarDay, MONTHS, WEEKDAYS, zoneOffsetMinutes, zonedParts } from '../time/zoned'
import type { TripActivity } from '../map/tripActivity'
import { recapChip } from './factsTrip'
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

/** "Home · next trip Wednesday", or "At base · next trip Wednesday" while the pilot waits at base (base waits design §3). */
export const nextTripChip = (start: number, now: number, viewerTz: string, isAtBase = false) =>
  `${isAtBase ? 'At base' : 'Home'} · next trip ${dayPhrase(start, now, viewerTz)}`

/** "Landing in 2 h 10 min", to the gate arrival. */
export function landingCountdown(leg: MapLeg, now: number): string {
  const minutes = Math.ceil((leg.end - now) / 60_000)
  return minutes <= 0 ? 'Landing now' : `Landing in ${minutesText(minutes)}`
}

/** "about " before a landing time that's the real plane's estimate, else nothing (Stage 3 spec §9). */
export const about = (leg: MapLeg) => (isArrivalEstimated(leg) ? 'about ' : '')

/**
 * What the card's bar and the full map's pill say of a flight between its gates (Stage 3 spec §9): the real plane's
 * label, or "In flight" when it has none. A moment of the replay is always "In flight" (§7.3).
 */
export function flightStatus(leg: MapLeg, now: number, isReplay = false): string {
  const label = !isReplay && leg.flight ? mapFlightProgress(leg.flight, now).label : null
  return label ? liveLabelText(label) : 'In flight'
}

/** "45 min", "2 h" or "2 h 10 min": the landing countdown's length, and the real plane's gap. */
export function minutesText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/**
 * "12 min ahead", "About 20 min behind", "Still on the ground · 20 min behind" or "Landed 8 min early": the real plane
 * against the schedule (Stage 3 spec §5.3), as the app's TripMapWording.liveLabel.
 */
export function liveLabelText(label: LiveLabel): string {
  switch (label.kind) {
    case 'onSchedule':
      return 'On schedule'
    case 'ahead':
      return `${label.isEstimated ? 'About ' : ''}${minutesText(label.minutes)} ahead`
    case 'behind':
      return `${label.isEstimated ? 'About ' : ''}${minutesText(label.minutes)} behind`
    case 'stillOnGround':
      return label.minutesBehind == null ? 'Still on the ground' : `Still on the ground · ${minutesText(label.minutesBehind)} behind`
    case 'landedOnTime':
      return 'Landed on time'
    case 'landedEarly':
      return `Landed ${minutesText(label.minutes)} early`
    case 'landedLate':
      return `Landed ${minutesText(label.minutes)} late`
  }
}

/** "1 minute", "45 minutes", "2 hours" or "2 hours 10 minutes": a length as a screen reader says it. */
export function spokenMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hoursText = hours === 1 ? '1 hour' : `${hours} hours`
  const restText = rest === 1 ? '1 minute' : `${rest} minutes`
  if (hours === 0) return restText
  return rest === 0 ? hoursText : `${hoursText} ${restText}`
}

/** The label as a screen reader hears it in the card's sentence: "12 minutes ahead of schedule", "landed 8 minutes early". */
export function spokenLiveLabel(label: LiveLabel): string {
  switch (label.kind) {
    case 'onSchedule':
      return 'on schedule'
    case 'ahead':
      return `${label.isEstimated ? 'about ' : ''}${spokenMinutes(label.minutes)} ahead of schedule`
    case 'behind':
      return `${label.isEstimated ? 'about ' : ''}${spokenMinutes(label.minutes)} behind schedule`
    case 'stillOnGround':
      return label.minutesBehind == null ? 'still on the ground' : `still on the ground, ${spokenMinutes(label.minutesBehind)} behind schedule`
    case 'landedOnTime':
      return 'landed on time'
    case 'landedEarly':
      return `landed ${spokenMinutes(label.minutes)} early`
    case 'landedLate':
      return `landed ${spokenMinutes(label.minutes)} late`
  }
}

/**
 * The card's sentence for a flight with a real plane (Stage 3 spec §9, §15): "UPS207 to Cologne, 12 minutes ahead of
 * schedule, over Québec. Lands about 3:18 PM your time." Once it's down, "…, landed 8 minutes early. Reaches the gate at
 * 3:18 PM your time." Null when the plane has no label, and the schedule's sentence stands.
 * - `over` is what's below.
 * - `lastSeen` is where a plane that's out of tracking range was last seen, as `spokenLastSeen` words it: "near
 *   Montréal", "over Québec" or "2 hours ago". It follows what's below, which is then a best guess: "…, about 14 minutes
 *   ahead of schedule, over Ohio, last tracked near Columbus." (Stage 3 spec §15, best guesses design §2).
 * Both are said only of a plane in the air: one on the ground or landed is over nothing, and out of sight of nothing.
 */
export function liveSummary(
  leg: MapLeg, now: number, viewerTz: string, h24: boolean, over: string | null = null, lastSeen: string | null = null,
): string | null {
  const label = leg.flight ? mapFlightProgress(leg.flight, now).label : null
  if (!label) return null
  const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
  const time = shortTimeText(leg.end, viewerTz, h24)
  const isDown = label.kind === 'landedOnTime' || label.kind === 'landedEarly' || label.kind === 'landedLate'
  const isFlying = label.kind === 'onSchedule' || label.kind === 'ahead' || label.kind === 'behind'
  // It's down and on its way in: "landed 8 minutes early. Lands at 3:18 PM" would say so twice.
  const arrival = isDown ? `Reaches the gate at ${time} your time.` : `Lands ${isArrivalEstimated(leg) ? 'about' : 'at'} ${time} your time.`
  const where = isFlying ? `${over ? `, over ${over}` : ''}${lastSeen ? `, last tracked ${lastSeen}` : ''}` : ''
  return `${lead} ${leg.destination.city}, ${spokenLiveLabel(label)}${where}. ${arrival}`
}

/** The destination's own time at landing, or null when it keeps the family's. */
function thereAtLanding(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = leg.destination.timeZone
  if (!there || zoneOffsetMinutes(leg.end, there) === zoneOffsetMinutes(leg.end, viewerTz)) return null
  return shortTimeText(leg.end, there, h24)
}

/**
 * "Lands Cologne 9:30 PM · 3:30 PM your time", or "Lands Louisville 3:30 PM". With the real plane's estimate, "Lands
 * Cologne about 9:18 PM · 3:18 PM your time": "about" once.
 */
export function landingLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const yours = shortTimeText(leg.end, viewerTz, h24)
  const there = thereAtLanding(leg, viewerTz, h24)
  const city = `Lands ${leg.destination.city} ${about(leg)}`
  return there ? `${city}${there} · ${yours} your time` : `${city}${yours}`
}

/**
 * "Reaches the gate at 3:52 PM · 7:52 PM your time", or "Reaches the gate at 3:30 PM": the landing line once the real
 * plane is down and not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026). "about" where the
 * time is the real plane's estimate, else "at", as the plane's popup says it.
 */
export function gateLine(leg: MapLeg, viewerTz: string, h24: boolean): string {
  const yours = shortTimeText(leg.end, viewerTz, h24)
  const there = thereAtLanding(leg, viewerTz, h24)
  const lead = `Reaches the gate ${about(leg) || 'at '}`
  return there ? `${lead}${there} · ${yours} your time` : `${lead}${yours}`
}

/**
 * "Landed in Anchorage": a real plane down at its arrival airport and not yet at the gate, at the head of the facts (the
 * landed, not yet at the gate design §3, Todd, 17 Nov 2026).
 */
export const landedText = (city: string) => `Landed in ${city}`

/** "Lands 3:30 PM", for the card's bar. With the real plane's estimate, "Lands about 3:18 PM". */
export const landsAt = (leg: MapLeg, viewerTz: string, h24: boolean) => `Lands ${about(leg)}${shortTimeText(leg.end, viewerTz, h24)}`

/** "9:30 PM in Cologne", or null when the destination keeps the family's time. */
export function arrivalLocalTime(leg: MapLeg, viewerTz: string, h24: boolean): string | null {
  const there = thereAtLanding(leg, viewerTz, h24)
  return there ? `${there} in ${leg.destination.city}` : null
}

const milesText = (miles: number) => miles.toLocaleString('en-US')

/** The airports the trip's flights reach, in order, each once, home left out. */
const destinations = (map: TripMap) => destinationsOf(map.legs, map.home)

/** The bar's words on the ground (moving map spec §5.3); empty in flight, where the bar shows the flight. */
export function statsItems(map: TripMap, t: number, day: number | null, days: number | null, viewerTz: string): string[] {
  const flights = map.legs.filter((l) => l.kind === 'flight')
  const cities = destinations(map)
  // In flight the bar shows the flight; on the recap, the recap bar takes its place (Stage 2 spec §6.5).
  if (map.mode.kind === 'inFlight' || map.mode.kind === 'recap') return []
  if (map.mode.kind === 'onTrip') {
    return [
      ...(day != null && days != null ? [`Day ${day} of ${days}`] : []),
      ...(cities.length > 0 ? [cities.length === 1 ? '1 city' : `${cities.length} cities`] : []),
      ...(flights.length > 0 ? [`${milesText(milesFlown(map.legs, t))} mi so far`] : []),
    ]
  }
  const distance = flights.length > 0 ? `${milesText(totalMiles(map.legs))} mi` : ''
  return [dateRangeText(map.span.start, map.span.end, viewerTz), cities.map((c) => c.code).join(' · '), distance].filter((s) => s !== '')
}

/** The drive under way at `t`, if the leg in motion is one. */
function driveUnderWay(map: TripMap, t: number): MapLeg | null {
  const leg = legInMotion(map, t)
  return leg?.kind === 'drive' ? leg : null
}

/** The chips on the card's map (moving map spec §5.1, §5.2). */
export function cardChips(map: TripMap, t: number, viewerTz: string, h24: boolean): { top: string | null; bottom: string | null } {
  if (map.mode.kind === 'recap') return { top: recapChip(dayCount(map, viewerTz)), bottom: 'Replay the trip' }
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    return { top: null, bottom: leg ? landingCountdown(leg, t) : null }
  }
  if (map.mode.kind === 'nextTrip') return { top: nextTripChip(map.span.start, t, viewerTz, map.isWaitingAtBase), bottom: null }
  const place = pilotLocation(map, t)
  const drive = driveUnderWay(map, t)
  const next = nextFlight(map, t)
  const top = place ? placeChip(place, t, h24) : drive ? `Driving to ${drive.destination.city}` : null
  return { top, bottom: next ? nextDepartureChip(next, t, viewerTz, h24) : null }
}

/**
 * The full map's pill: "UPS207 · In flight", "UPS207 · 12 min ahead", "Driving to Louisville", "Day 2 of 4" or "Next
 * trip". A moment of the replay (`isReplay`) is "In flight" (Stage 3 spec §7.3).
 */
export function topPill(map: TripMap, t: number, day: number | null, days: number | null, isReplay = false): string {
  if (map.mode.kind === 'recap' && t >= map.span.end) return 'Trip recap'
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? [leg.flightNumber, flightStatus(leg, t, isReplay)].filter(Boolean).join(' · ') : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return 'Next trip'
  return day != null && days != null ? `Day ${day} of ${days}` : 'Trip map'
}

/** The full map panel's first line: the landing line in the air, else where they are. */
export function panelHeadline(map: TripMap, t: number, viewerTz: string, h24: boolean): string {
  const leg = legInMotion(map, t)
  if (leg) return leg.kind === 'flight' ? landingLine(leg, viewerTz, h24) : `Driving to ${leg.destination.city}`
  if (map.mode.kind === 'nextTrip' && t < map.span.start) return nextTripChip(map.span.start, t, viewerTz, map.isWaitingAtBase)
  const place = pilotLocation(map, t)
  return place ? placeChip(place, t, h24) : ''
}

/** "Fri 9:14 PM", under the timeline and as the slider's spoken value. */
export const timelineTime = (ms: number, viewerTz: string, h24: boolean) => `${shortWeekday(ms, viewerTz)} ${shortTimeText(ms, viewerTz, h24)}`

/** The words under the timeline (activity markers design §4.2): "Flying to San Francisco", "Layover in Denver", "Home". */
export function activityWords({ kind, place }: TripActivity): string {
  switch (kind) {
    case 'flying': return `Flying to ${place.city}`
    case 'driving': return `Driving to ${place.city}`
    case 'layover': return `Layover in ${place.city}`
    case 'turn': return `Turn in ${place.city}`
    case 'base': return `At base in ${place.city}`
    case 'home': return 'Home'
  }
}

/**
 * The words under the timeline: the activity's, or "On the ground in Rockford" where the flight's real plane is still on
 * the ground at its departure airport, `stillOnGroundIn` (the website's own, Todd, 16 Nov 2026).
 */
function lineWords(activity: TripActivity | null, stillOnGroundIn: AirportMark | null): string | null {
  if (stillOnGroundIn) return `On the ground in ${stillOnGroundIn.city}`
  return activity ? activityWords(activity) : null
}

/**
 * "Sat 1:40 PM · Layover in Denver": the line under the timeline, when and what (activity markers design §4.2). While
 * the flight's real plane is still on the ground at its departure airport, `stillOnGroundIn`, "Mon 12:21 PM · On the
 * ground in Rockford" (the website's own, Todd, 16 Nov 2026).
 */
export function timelineLine(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = timelineTime(ms, viewerTz, h24)
  const words = lineWords(activity, stillOnGroundIn)
  return words ? `${time} · ${words}` : time
}

/** "Saturday 1:40 PM, layover in Denver": the timeline's value for screen readers (activity markers design §4.3), as the line under it. */
export function timelineSpokenValue(
  ms: number, activity: TripActivity | null, viewerTz: string, h24: boolean, stillOnGroundIn: AirportMark | null = null,
): string {
  const time = `${WEEKDAYS[zonedParts(ms, viewerTz).weekday]} ${shortTimeText(ms, viewerTz, h24)}`
  const words = lineWords(activity, stillOnGroundIn)
  if (!words) return time
  return `${time}, ${words.charAt(0).toLowerCase()}${words.slice(1)}`
}

/**
 * The map card's heading, for screen readers: "In flight", or "On the ground" while the flight's real plane is still
 * on the ground at its departure airport (the website's own, Todd, 16 Nov 2026); else "Trip recap" or "Trip map".
 */
export function cardHeading(map: TripMap, now: number): string {
  const leg = currentLeg(map)
  if (leg) return legStillOnGround(leg, now) ? 'On the ground' : 'In flight'
  return map.mode.kind === 'recap' ? 'Trip recap' : 'Trip map'
}

/** The card as one sentence for screen readers (moving map spec §14), ending with what it opens. */
export function tripMapSummary(map: TripMap, t: number, name: string, viewerTz: string, h24: boolean): string {
  const opens = 'Opens the full map.'
  if (map.mode.kind === 'recap') {
    const chip = recapChip(dayCount(map, viewerTz))
    return `Trip recap: ${chip.charAt(0).toLowerCase()}${chip.slice(1)}. Opens the map to replay the trip.`
  }
  if (map.mode.kind === 'inFlight') {
    const leg = currentLeg(map)
    if (!leg) return `Trip map. ${opens}`
    const live = liveSummary(leg, t, viewerTz, h24)
    if (live) return `${live} ${opens}`
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

/** The map styles by name, on the full map's style button (Apple Maps spec §4.1). */
export const MAP_STYLE_NAMES: Record<AppleMapStyle, string> = { hybrid: 'Hybrid', standard: 'Map', satellite: 'Satellite' }
