import { belowWords, cockpitCountdown, flightTitle, milestoneHeadline, milestoneLine } from '../copy/facts'
import { longestText, recapChip, recapSummary, soFarText, totalsTiles, type RecapTile } from '../copy/factsTrip'
import { shortTimeText } from '../copy/format'
import { landingCountdown, panelHeadline, tripMapSummary } from '../copy/tripMap'
import type { LandingForecast } from '../data/weather'
import type { GeoPoint } from '../map/greatCircle'
import { currentLeg, dayCount, legInMotion, legProgress, positionAtTime, type AirportMark, type MapLeg, type TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Comparison } from './comparisons'
import type { TripSoFar } from './factRow'
import { cityNear, type Geography } from './geography'
import { landsWithinHorizon } from './landingWeather'
import { legStory, placeAtFraction, type LegStory } from './legStory'
import { MILESTONE_HEADLINE_MS, milestones, type Milestone } from './milestone'
import { sunEvents, type SunEvent } from './sky'
import { longestFlight, totalsSoFar, wholeTotals, type SunEventsByLeg } from './tripTotals'

/**
 * Everything the facts say about a trip at a moment (Stage 2 spec §3.1, §4.4, §5), as the app's TripFacts: the
 * headline, the trip so far and the card's words here, and the rows in tripFactsRows.ts. Each answer is a lookup in the
 * flights' stories and sun events, so replay and scrubbing need nothing extra (§4.10).
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
}

/**
 * Each route's story, by geography: the status page remakes its map every second, and a story is worked out once per
 * route and home, as the app's LegStoryStore keeps them (§3.2).
 */
const stories = new WeakMap<Geography, Map<string, LegStory>>()
/** Each flight's sun events, by its route and its delay-moved times: a new delay works them out again (§3.2). */
const sunEventsByRoute = new Map<string, SunEvent[]>()

const pointKey = (p: GeoPoint) => `${p.lat},${p.lng}`

function storyOf(leg: MapLeg, geography: Geography, home: AirportMark | null): LegStory {
  let kept = stories.get(geography)
  if (!kept) stories.set(geography, (kept = new Map()))
  const key = [leg.origin.code, pointKey(leg.origin.place), leg.destination.code, pointKey(leg.destination.place), home?.code ?? '', home ? pointKey(home.place) : ''].join('|')
  let story = kept.get(key)
  if (!story) kept.set(key, (story = legStory(leg, geography, home)))
  return story
}

function sunEventsOf(leg: MapLeg): SunEvent[] {
  const key = [pointKey(leg.origin.place), pointKey(leg.destination.place), leg.start, leg.end].join('|')
  let events = sunEventsByRoute.get(key)
  if (!events) sunEventsByRoute.set(key, (events = sunEvents(leg)))
  return events
}

/** The facts for `map`: each flight's story, once the geography has loaded, and its sun events. */
export function makeTripFacts(map: TripMap, options: FactsOptions): TripFacts {
  const legStories: Record<string, LegStory> = {}
  const events: SunEventsByLeg = {}
  for (const leg of map.legs) {
    if (leg.kind !== 'flight') continue
    if (options.geography) legStories[leg.id] = storyOf(leg, options.geography, map.home)
    events[leg.id] = sunEventsOf(leg)
  }
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
  }
}

/** A flight's milestones, once its story is ready. */
export function factsMilestones(facts: TripFacts, leg: MapLeg): Milestone[] {
  const story = facts.stories[leg.id]
  return story ? milestones(leg, story) : []
}

/** "Over Kansas", "Over Québec, near Montréal", from the flight's story. */
export function belowText(facts: TripFacts, leg: MapLeg, t: number): string | null {
  const story = facts.stories[leg.id]
  const place = story ? placeAtFraction(story, legProgress(leg, t)) : null
  if (!place) return null
  return belowWords(place, facts.geography ? cityNear(facts.geography, positionAtTime(leg, t)) : null)
}

/**
 * In flight: a milestone from the last 5 minutes, else a cockpit sunrise or sunset in the next 30, else the place below,
 * else the landing countdown (§4.4). Null on the ground and on a drive, where Stage 1B's words stay.
 */
export function headline(facts: TripFacts, t: number): string | null {
  const leg = legInMotion(facts.map, t)
  if (!leg || leg.kind !== 'flight') return null
  const recent = factsMilestones(facts, leg).filter((m) => m.time <= t && t - m.time < MILESTONE_HEADLINE_MS).pop()
  if (recent) return milestoneHeadline(recent)
  const soon = (facts.sunEvents[leg.id] ?? []).find((e) => e.time > t && e.time - t <= SUN_HEADLINE_MS)
  if (soon) return cockpitCountdown(soon, t)
  return belowText(facts, leg, t) ?? landingCountdown(leg, t)
}

/** True once a recap's trip is over at `t`. */
export const isRecapOver = (facts: TripFacts, t: number) => facts.map.mode.kind === 'recap' && t >= facts.map.span.end

/** The panel's first line: the headline in flight, "Home from 4 days away" after a recap's trip, else Stage 1B's. */
export function sheetHeadline(facts: TripFacts, t: number): string {
  const inFlight = headline(facts, t)
  if (inFlight) return inFlight
  if (isRecapOver(facts, t)) return recapChip(dayCount(facts.map, facts.viewerTz))
  return panelHeadline(facts.map, t, facts.viewerTz, facts.h24)
}

/** The forecast for `leg` when it lands between the real `now` and 48 hours on, whatever moment the timeline shows (§7.3). */
export function forecastFor(facts: TripFacts, leg: MapLeg, now: number): LandingForecast | null {
  return landsWithinHorizon(leg, now) ? (facts.forecasts[leg.id] ?? null) : null
}

/** Each started flight's milestones so far, newest flight first, then the totals: the trip so far, or the recap (§5.2, §5.5). */
export function tripSoFar(facts: TripFacts, t: number): TripSoFar {
  const started = facts.map.legs.filter((l) => l.kind === 'flight' && l.start <= t).reverse()
  const flights = started.flatMap((leg) => {
    const lines = factsMilestones(facts, leg).filter((m) => m.time <= t).map((m) => milestoneLine(m, facts.viewerTz, facts.h24))
    return lines.length > 0 ? [{ id: leg.id, title: flightTitle(leg), milestones: lines }] : []
  })
  if (isRecapOver(facts, t)) {
    return { flights, totalsTitle: 'Trip recap', totals: soFarText(wholeTotals(facts.map, facts.sunEvents), null, null) }
  }
  return { flights, totalsTitle: 'Trip so far', totals: soFarText(totalsSoFar(facts.map, t, facts.sunEvents), facts.day, facts.days) }
}

/** The card as one sentence for screen readers, ending with what it opens (§6.4, §6.5). */
export function cardSummary(facts: TripFacts, now: number, name: string): string {
  const { map, viewerTz, h24 } = facts
  if (map.mode.kind === 'recap') {
    const summary = recapSummary(dayCount(map, viewerTz), wholeTotals(map, facts.sunEvents), longestFlight(map.legs))
    return `${summary} Opens the map to replay the trip.`
  }
  const leg = currentLeg(map)
  if (leg) {
    const lead = leg.flightNumber ? `${leg.flightNumber} to` : 'Flying to'
    const story = facts.stories[leg.id]
    const place = story ? placeAtFraction(story, legProgress(leg, now)) : null
    const over = place ? `, over ${place.name}` : ''
    return `${lead} ${leg.destination.city}${over}. Lands at ${shortTimeText(leg.end, viewerTz, h24)} your time. Estimated from the schedule. Opens the full map.`
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
