import {
  belowWords, cockpitCountdown, eventTitle, eventWhen, flightTitle, inTheAirTag, LANDED_TAG, lastSeenLine, milestoneHeadline, milestoneLine,
  spokenLastSeen, spokenLatestEvent, stillOnGroundText,
} from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
import { shortTimeText } from '../copy/format'
import { landedText, landingCountdown, liveSummary, panelHeadline, returnedText, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
import { pointAtDistance } from '../map/flightPath'
import type { GeoPoint } from '../map/greatCircle'
import {
  currentLeg, dayCount, isMoving, legInMotion, legLandedBeforeGate, legReturned, legStillOnGround, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Comparison } from './comparisons'
import type { LatestEvent, TripSoFar } from './factRow'
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, isOcean, samePlace, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { hasLiveData, legPath } from './legCourse'
import { legStory, placeAtDistance, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { GUESS_HORIZON_MS, isPastGuessHorizon, legPlane, type PlanePosition } from './planePosition'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'
import { longestFlight, totalsSoFar, wholeTotals, type SunEventsByLeg } from './tripTotals'

/**
 * Everything the facts say about a trip at a moment (Stage 2 spec §3.1, §4.4, §5), as the app's TripFacts: the
 * headline, the trip so far and the card's words here, and the rows in tripFactsRows.ts. Each answer is a lookup in the
 * flights' stories and sun events, so replay and scrubbing need nothing extra (§4.10). A flight with a real plane is read
 * where the real plane is, along the path it really flew (Stage 3 spec §8).
 */

/** A cockpit sunrise or sunset this close leads the headline (§4.4). */
export const SUN_HEADLINE_MS = 30 * MINUTE

export interface FactsOptions {
  /** Null until geography.json has loaded: the facts that need a story are left out until then (§3.3). */
  geography: Geography | null
  comparisons: Comparison[] | null
  /** Landing-hour forecasts, by leg id. */
  forecasts?: Record<string, LandingForecast>
  viewerTz: string
  h24: boolean
  /** The status's trip day, for "Day 2 of 4". */
  day?: number | null
  days?: number | null
  /** The moments asked about are a replay's, not now: the full map's clock isn't live. False unless it's said. */
  isReplay?: boolean
  /**
   * Where a real path's story and sun events are kept between renders, made again at most once a minute as the path
   * grows (Stage 3 spec §8). The page owns one. Without it, as in the tests, they're made afresh each time.
   */
  store?: FactsStore | null
}

export interface TripFacts {
  map: TripMap
  geography: Geography | null
  comparisons: Comparison[]
  /** By leg id, for the flights whose story is ready. */
  stories: Record<string, LegStory>
  sunEvents: SunEventsByLeg
  forecasts: Record<string, LandingForecast>
  viewerTz: string
  h24: boolean
  day: number | null
  days: number | null
  /**
   * The moments asked about are a replay's, not now: the full map's clock isn't live. A real plane is then where its
   * record has it, and what only its newest fix tells is left out (Stage 3 spec §7.3).
   */
  isReplay: boolean
}

/**
 * Each route's story, by geography: the status page remakes its map every second, and a story is worked out once per
 * route and home, as the app's LegStoryStore keeps them (§3.2).
 */
const stories = new WeakMap<Geography, Map<string, LegStory>>()
/** Each flight's sun events, by its route, its delay-moved times and its sky's height: a new delay works them out again (§3.2). */
const sunEventsByRoute = new Map<string, SunEvent[]>()
/** More than this many kept means a page open across many delays and trips: it starts again rather than grow. */
const SUN_EVENTS_KEPT = 200

const pointKey = (p: GeoPoint) => `${p.lat},${p.lng}`

/**
 * The route's story, along the great circle, for a flight with no real path: another flight on the route shares it. A
 * real path's story is factsStore.ts's (Stage 3 spec §8).
 */
function storyOf(leg: MapLeg, geography: Geography, home: AirportMark | null): LegStory {
  let kept = stories.get(geography)
  if (!kept) stories.set(geography, (kept = new Map()))
  const key = [leg.origin.code, pointKey(leg.origin.place), leg.destination.code, pointKey(leg.destination.place), home?.code ?? '', home ? pointKey(home.place) : ''].join('|')
  let story = kept.get(key)
  if (!story) {
    const { flight: _, ...route } = leg
    kept.set(key, (story = legStory(route, geography, home)))
  }
  return story
}

/**
 * The sun events of a flight with no record, kept by its route, its times and the height its sky is seen from: a fix at
 * its cruise moves them, so two flights alike but for that don't share them. With no live data it's 35,000 ft, as before.
 */
function sunEventsOf(leg: MapLeg): SunEvent[] {
  const key = [pointKey(leg.origin.place), pointKey(leg.destination.place), leg.start, leg.end, cockpitHorizonOnLeg(leg)].join('|')
  let events = sunEventsByRoute.get(key)
  if (!events) {
    if (sunEventsByRoute.size >= SUN_EVENTS_KEPT) sunEventsByRoute.clear()
    sunEventsByRoute.set(key, (events = sunEvents(leg)))
  }
  return events
}

/**
 * The facts for `map`: each flight's story, once the geography has loaded, and its sun events. A flight with a real
 * path has its own, from the store; any other, the route's story and its times' sun events.
 */
export function makeTripFacts(map: TripMap, options: FactsOptions): TripFacts {
  const legStories: Record<string, LegStory> = {}
  const events: SunEventsByLeg = {}
  const store = options.store ?? null
  for (const leg of map.legs) {
    if (leg.kind !== 'flight') continue
    const real = realPathFacts(store, leg, options.geography, map.home)
    if (real) {
      if (real.story) legStories[leg.id] = real.story
      events[leg.id] = real.sunEvents
      continue
    }
    if (options.geography) legStories[leg.id] = storyOf(leg, options.geography, map.home)
    events[leg.id] = sunEventsOf(leg)
  }
  if (store) forgetOldPaths(store, map)
  return {
    map,
    geography: options.geography,
    comparisons: options.comparisons ?? [],
    stories: legStories,
    sunEvents: events,
    forecasts: options.forecasts ?? {},
    viewerTz: options.viewerTz,
    h24: options.h24,
    day: options.day ?? null,
    days: options.days ?? null,
    isReplay: options.isReplay ?? false,
  }
}

/** A flight's milestones, once its story is ready. */
export function factsMilestones(facts: TripFacts, leg: MapLeg): Milestone[] {
  const story = facts.stories[leg.id]
  return story ? milestones(leg, story) : []
}

/**
 * The flight's milestones as they're told at `t`. While the flight is in the air, one guessed more than 2 hours after the
 * plane was last seen waits until it's tracked again, as it can be hundreds of miles out. Once the flight is over they're
 * all told, as best guesses (long gap design §3). Everything up to the last place the plane was seen happened before it,
 * so only a guess ahead can be held. `factsMilestones` still gives them all, for the shared cases.
 */
export function toldMilestones(facts: TripFacts, leg: MapLeg, t: number): Milestone[] {
  const all = factsMilestones(facts, leg)
  const knots = leg.flight?.path.knots ?? []
  const lastSeen = knots[knots.length - 1]
  if (!lastSeen) return all
  return all.filter((m) => isToldAt(m.time, lastSeen.time, leg.end, t))
}

/**
 * Whether a milestone at `time` is told at `t`, the plane last seen at `lastSeen` and the flight over at `end`: from the
 * flight's end, always; before it, if it's guessed no more than 2 hours after the last sighting (long gap design §3).
 * Both edges count as told.
 */
export const isToldAt = (time: number, lastSeen: number, end: number, t: number): boolean =>
  t >= end || time - lastSeen <= GUESS_HORIZON_MS

/**
 * "Over Kansas", "Over Québec, near Montréal", from the flight's story, read where the plane is (Stage 3 spec §8). A real
 * plane that's out of sight is where the plan has it, flying on from the last place it was seen, and reads the same
 * (best guesses design §2), but for one out of tracking range for more than 2 hours: only an ocean, with no city (long
 * gap design §3).
 */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const plane = legPlane(leg, t, facts.isReplay)
  const place = placeBelow(facts, leg, plane)
  if (!place) return null
  return belowWords(place, facts.geography && !isPastGuessHorizon(plane) ? cityNear(facts.geography, plane.place) : null)
}

/**
 * What's under `plane`. Past `GUESS_HORIZON_MS` out of tracking range, the guess can be hundreds of miles from the plane,
 * and only an ocean is wide enough to be right (long gap design §3).
 */
function placeBelow(facts: TripFacts, leg: MapLeg, plane: PlanePosition): Place | null {
  const story = facts.stories[leg.id]
  const place = story ? placeAtDistance(story, plane.distance) : null
  return place && (!isPastGuessHorizon(plane) || isOcean(place)) ? place : null
}

/** What was under the real plane where it was last seen, and the city by it. */
function lastSeenPlace(facts: TripFacts, leg: MapLeg): [place: Place | null, city: City | null] {
  const path = legPath(leg)
  const story = facts.stories[leg.id]
  return [
    story ? placeAtDistance(story, path.flownLength) : null,
    facts.geography ? cityNear(facts.geography, pointAtDistance(path, path.flownLength)) : null,
  ]
}

/**
 * "Last tracked near Montréal · 12 min ago", while the real plane is out of tracking range, or null while it's seen (best
 * guesses design §2).
 */
export function lastSeenText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const { unseenFor } = legPlane(leg, t, facts.isReplay)
  return unseenFor == null ? null : lastSeenLine(...lastSeenPlace(facts, leg), unseenFor)
}

/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, is still on the ground at its departure airport.
 * The facts then say so in place of what's below, and count nothing as flown: "Still on the ground in Rockford" (the
 * website's own, Todd, 16 Nov 2026). Now only: a replay reads where the map has the plane, as the app does.
 */
export function isStillOnGround(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && legStillOnGround(leg, t)
}

/**
 * What the facts say in place of what's below while `isStillOnGround` holds: "Still on the ground in Rockford" (the
 * website's own, Todd, 16 Nov 2026), or "Returned to Rockford" once the plane is back there after an air return (air
 * return design §3).
 */
export const atDepartureText = (leg: MapLeg, t: number): string =>
  legReturned(leg, t) ? returnedText(leg.origin.city) : stillOnGroundText(leg.origin.city)

/**
 * Whether the real plane of `leg`, the leg between its gates at `t`, has landed and isn't at the gate yet. The facts then
 * say "Landed in Anchorage" in place of what's below, and nothing to go (the landed, not yet at the gate design §2, §3,
 * Todd, 17 Nov 2026). Now only, as "Still on the ground" is: a replay reads where the map has the plane.
 */
export function isLandedBeforeGate(facts: TripFacts, leg: MapLeg, t: number): boolean {
  return !facts.isReplay && legLandedBeforeGate(leg, t)
}

/** Whether a flight with live data shows, which adsb.lol is credited for (Stage 3 spec §8). */
export const showsLiveData = (facts: TripFacts): boolean => facts.map.legs.some(hasLiveData)

/**
 * In flight: a milestone from the last 5 minutes, else a cockpit sunrise or sunset in the next 30, else the place below,
 * else the landing countdown (§4.4). While the real plane is out of sight they're its best guesses, in the same plain
 * words (best guesses design §2), and a milestone guessed more than 2 hours after it was last seen waits
 * (`toldMilestones`, long gap design §3). Null on the ground and on a drive, where Stage 1B's words stay.
 * `includesEvents` is false beside the latest event's banner, which shows the milestone already (latest event design
 * §2); the shared cases read the headline with them.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them, or "Returned to Rockford" once it's back there after an air return (air
 * return design §3). It has crossed nothing yet, whatever the schedule's times say. And at the
 * other end, down and not yet at the gate, "Landed in Anchorage", ahead of them too (the landed, not yet at the gate
 * design §3, Todd, 17 Nov 2026).
 */
export function headline(facts: TripFacts, t: number, includesEvents = true): string | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight') return null
  if (isStillOnGround(facts, leg, t)) return atDepartureText(leg, t)
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
  const recent = includesEvents ? toldMilestones(facts, leg, t).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
  if (recent) return milestoneHeadline(recent)
  const soon = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t && e.time - t <= SUN_HEADLINE_MS)
  if (soon) return cockpitCountdown(soon, t)
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}

/**
 * The newest event of the flight between its gates at `t`, for the banner (latest event design §1): what it was, how
 * long ago, and its sentence for screen readers. It stays until the next. Null on the ground, on a drive, and before the
 * flight's first event. One held past 2 hours out of tracking range isn't told yet (`toldMilestones`, long gap design §3).
 *
 * The website's own (Todd, 16 Nov 2026): none for a real plane still on the ground at its departure airport after the
 * plan's takeoff time, which has passed nothing yet, whatever the schedule's times say.
 */
export function latestEvent(facts: TripFacts, t: number): LatestEvent | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight' || isStillOnGround(facts, leg, t)) return null
  // By time, not by the way along: a best guess and a sighting can disagree a little.
  const newest = toldMilestones(facts, leg, t)
    .filter((m) => m.time <= t)
    .reduce<Milestone | null>((latest, m) => (latest == null || m.time > latest.time ? m : latest), null)
  if (!newest) return null
  const { viewerTz, h24, isReplay } = facts
  return {
    title: eventTitle(newest),
    when: eventWhen(newest, t, viewerTz, h24, isReplay),
    sentence: spokenLatestEvent(newest, t, viewerTz, h24, isReplay),
  }
}

/** True once a recap's trip is over at `t`. */
export const isRecapOver = (facts: TripFacts, t: number) => facts.map.mode.kind === 'recap' && t >= facts.map.span.end

/**
 * The panel's first line: the headline in flight, "Home from 4 days away" after a recap's trip, else Stage 1B's. The
 * latest event's banner is on the map above it, so the headline here leaves events out (latest event design §2).
 */
export function sheetHeadline(facts: TripFacts, t: number): string {
  const inFlight = headline(facts, t, false)
  if (inFlight) return inFlight
  if (isRecapOver(facts, t)) return recapChip(dayCount(facts.map, facts.viewerTz))
  return panelHeadline(facts.map, t, facts.viewerTz, facts.h24)
}

/** The forecast for `leg` when it lands between the real `now` and 48 hours on, whatever moment the timeline shows (§7.3). */
export function forecastFor(facts: TripFacts, leg: MapLeg, now: number): LandingForecast | null {
  return landsWithinHorizon(leg, now) ? (facts.forecasts[leg.id] ?? null) : null
}

/**
 * Whether the rows at `t` have a "Trip so far" row: on a drive, and on a layover, as `factRows` (tripFactsRows.ts) has
 * them. The list under the rows then doesn't say it again (best guesses design §4).
 */
export function hasTripSoFarRow(facts: TripFacts, t: number): boolean {
  const leg = legInMotion(facts.map, t)
  if (leg) return leg.kind !== 'flight'
  if (isRecapOver(facts, t)) return false
  return !(facts.map.mode.kind === 'nextTrip' && t < facts.map.span.start)
}

/**
 * The trip so far, or the recap (§5.2, §5.5; best guesses design §4): the flight between its gates, set apart and listed
 * even before its first event, then each earlier flight with an event, newest first. Under each, its events, newest
 * first, so the latest is at the top, but for those held past 2 hours out of tracking range (`toldMilestones`, long gap
 * design §3). Then the totals, unless the rows already have them.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport after the plan's
 * takeoff time has passed none of its flight's events, whatever the schedule's times say, and its flight is left out
 * until it takes off, with no "In the air now". Down and not yet at the gate, it's tagged "Landed" (the landed, not yet
 * at the gate design §3, Todd, 17 Nov 2026).
 */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t && !isStillOnGround(facts, l, t)).reverse()
  const flights = started.flatMap((leg) => {
    const events = toldMilestones(facts, leg, t)
      .filter((m) => m.time <= t)
      .reverse()
      .map((m) => ({ text: milestoneLine(m, facts.viewerTz, facts.h24), isEstimate: m.isEstimate === true }))
    const tag = !isMoving(leg, t) ? null : isLandedBeforeGate(facts, leg, t) ? LANDED_TAG : inTheAirTag(facts.isReplay)
    return tag != null || events.length > 0 ? [{ id: leg.id, title: flightTitle(leg), tag, events }] : []
  })
  if (isRecapOver(facts, t)) {
    return { flights, totalsTitle: 'Trip recap', totals: soFarText(wholeTotals(facts.map, facts.sunEvents), null, null) }
  }
  // Where the rows already have a "Trip so far" row, it isn't said again under the list.
  const totals = hasTripSoFarRow(facts, t) ? null : soFarText(totalsSoFar(facts.map, t, facts.sunEvents, facts.isReplay), facts.day, facts.days)
  return { flights, totalsTitle: 'Trip so far', totals }
}

/**
 * The card as one sentence for screen readers, ending with what it opens (§6.4, §6.5). In flight the latest event's
 * banner comes after the flight's words, as its own sentence (latest event design §3).
 */
export function cardSummary(facts: TripFacts, now: number, name: string): string {
  const { map, viewerTz, h24 } = facts
  if (map.mode.kind === 'recap') {
    const summary = recapSummary(dayCount(map, viewerTz), wholeTotals(map, facts.sunEvents), longestFlight(map.legs))
    return `${summary} Opens the map to replay the trip.`
  }
  const leg = currentLeg(map)
  if (leg) {
    const latest = latestEvent(facts, now)
    const ending = latest ? `${latest.sentence} Opens the full map.` : 'Opens the full map.'
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const plane = legPlane(leg, now, facts.isReplay)
    const place = placeBelow(facts, leg, plane)
    // With a real plane the sentence says how it's doing against the schedule (Stage 3 spec §9), and while it's out of
    // sight, where it was last seen (§15). Past 2 hours out of sight, what's below is only an ocean, or left out (long
    // gap design §3).
    const ago = plane.unseenFor
    const [seenPlace, seenCity] = ago == null ? [null, null] : lastSeenPlace(facts, leg)
    const lastSeen = ago == null ? null : spokenLastSeen(seenPlace, seenCity, ago)
    // "Over Québec, last tracked over Québec" says one place twice: the second says it all. It compares the places, not
    // their names, so a state and a country that share a name are both said.
    const isOverWhereLastTracked = seenCity == null && samePlace(seenPlace, place)
    const live = liveSummary(leg, now, viewerTz, h24, isOverWhereLastTracked ? null : (place?.name ?? null), lastSeen)
    if (live) return `${live} ${ending}`
    const over = place ? `, over ${place.name}` : ''
    return `${lead} ${leg.destination.city}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. ${ending}`
  }
  return tripMapSummary(map, now, name, viewerTz, h24)
}

/** The recap card's numbers. */
export const recapTiles = (facts: TripFacts): RecapTile[] => totalsTiles(wholeTotals(facts.map, facts.sunEvents))

/** "Longest: Dubai → Louisville, 7,382 mi". */
export function recapLongestLine(facts: TripFacts): string | null {
  const longest = longestFlight(facts.map.legs)
  return longest ? `Longest: ${longestText(longest)}` : null
}
