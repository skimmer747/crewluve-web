import {
  belowWords, cockpitCountdown, eventTitle, eventWhen, flightTitle, inTheAirTag, LANDED_TAG, lastSeenLine, milestoneHeadline, milestoneLine,
  spokenLastSeen, spokenLatestEvent, stillOnGroundText,
} from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
import { shortTimeText } from '../copy/format'
import { landedText, landingCountdown, liveSummary, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
import { pointAtDistance } from '../map/flightPath'
import type { GeoPoint } from '../map/greatCircle'
import {
  currentLeg, dayCount, isMoving, legInMotion, legLandedBeforeGate, legStillOnGround, type AirportMark, type MapLeg, type TripMap,
} from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Comparison } from './comparisons'
import type { LatestEvent, TripSoFar } from './factRow'
import { forgetOldPaths, realPathFacts, type FactsStore } from './factsStore'
import { cityNear, samePlace, type City, type Geography, type Place } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { hasLiveData, legPath } from './legCourse'
import { legStory, placeAtDistance, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { legPlane } from './planePosition'
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
 * "Over Kansas", "Over Québec, near Montréal", from the flight's story, read where the plane is (Stage 3 spec §8). A real
 * plane that's out of sight is where the plan has it, flying on from the last place it was seen, and reads the same
 * (best guesses design §2).
 */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const plane = legPlane(leg, t, facts.isReplay)
  const place = story ? placeAtDistance(story, plane.distance) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, plane.place) : null)
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
 * words (best guesses design §2). Null on the ground and on a drive, where Stage 1B's words stay. `includesEvents` is
 * false beside the latest event's banner, which shows the milestone already (latest event design §2); the shared
 * cases read the headline with them.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport is "Still on the
 * ground in Rockford", ahead of all of them. It has crossed nothing yet, whatever the schedule's times say. And at the
 * other end, down and not yet at the gate, "Landed in Anchorage", ahead of them too (the landed, not yet at the gate
 * design §3, Todd, 17 Nov 2026).
 */
export function headline(facts: TripFacts, t: number, includesEvents = true): string | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight') return null
  if (isStillOnGround(facts, leg, t)) return stillOnGroundText(leg.origin.city)
  if (isLandedBeforeGate(facts, leg, t)) return landedText(leg.destination.city)
  const recent = includesEvents ? factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop() : null
  if (recent) return milestoneHeadline(recent)
  const soon = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t && e.time - t <= SUN_HEADLINE_MS)
  if (soon) return cockpitCountdown(soon, t)
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}

/**
 * The newest event of the flight between its gates at `t`, for the banner (latest event design §1): what it was, how
 * long ago, and its sentence for screen readers. It stays until the next. Null on the ground, on a drive, and before the
 * flight's first event.
 *
 * The website's own (Todd, 16 Nov 2026): none for a real plane still on the ground at its departure airport after the
 * plan's takeoff time, which has passed nothing yet, whatever the schedule's times say.
 */
export function latestEvent(facts: TripFacts, t: number): LatestEvent | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight' || isStillOnGround(facts, leg, t)) return null
  // By time, not by the way along: a best guess and a sighting can disagree a little.
  const newest = factsMilestones(facts, leg)
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
 * first, so the latest is at the top. Then the totals, unless the rows already have them.
 *
 * The website's own (Todd, 16 Nov 2026): a real plane still on the ground at its departure airport after the plan's
 * takeoff time has passed none of its flight's events, whatever the schedule's times say, and its flight is left out
 * until it takes off, with no "In the air now". Down and not yet at the gate, it's tagged "Landed" (the landed, not yet
 * at the gate design §3, Todd, 17 Nov 2026).
 */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t && !isStillOnGround(facts, l, t)).reverse()
  const flights = started.flatMap((leg) => {
    const events = factsMilestones(facts, leg)
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
    const story = facts.stories[leg.id]
    const plane = legPlane(leg, now, facts.isReplay)
    const place = story ? placeAtDistance(story, plane.distance) : null
    // With a real plane the sentence says how it's doing against the schedule (Stage 3 spec §9), and while it's out of
    // sight, where it was last seen (§15).
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
