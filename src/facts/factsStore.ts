import type { AirportMark, MapLeg, TripMap } from '../map/tripMap'
import { MINUTE } from '../time/zoned'
import type { Geography } from './geography'
import { legStory, type LegStory } from './legStory'
import { cockpitHorizonOnLeg, sunEvents, type SunEvent } from './sky'

/**
 * The facts kept for each flight with a real path between renders (Stage 3 spec §8), as the app's LegStoryStore keeps
 * them. The page owns one store and hands it to every TripFacts it makes, so the card and the full map read the same.
 * - A flight with a real path has a story of its own, along that path, by its leg's id, and its sun events with it.
 * - They're made again when the path changes, but no oftener than once a minute by the store's clock: meanwhile, what
 *   the flight has shows, so the sky row and the trip's sunset count don't blink at each new landing estimate.
 * - The first are made at once: the website works the facts out as it draws them, so there's no wait for them, and the
 *   route's story never has to stand in.
 * A flight with no real path keeps the route's story and its sun events by its times, tripFacts.ts's caches as before.
 */

/** A flight with a real path gets its story again no sooner than this after the last one was made (Stage 3 spec §8). */
export const PATH_STORY_INTERVAL_MS = MINUTE

/** More flights kept than this, and those not on the map asked about are forgotten. */
export const PATHS_KEPT = 20

/** A flight's story and sun events along its real path, and what they were made from. */
export interface PathFacts {
  /** The path's key (`pathKey`) when they were made. */
  key: string
  /** When they were made, by the store's clock. */
  madeAt: number
  /** The geography and home the story was made with: another is a story made afresh, at once. */
  geography: Geography | null
  home: string
  /** Null when there was no geography to make it with. */
  story: LegStory | null
  sunEvents: SunEvent[]
}

export interface FactsStore {
  /** This browser's clock, in epoch ms. Tests hand in their own. */
  now: () => number
  /** By leg id. */
  paths: Map<string, PathFacts>
}

export const makeFactsStore = (now: () => number = () => Date.now()): FactsStore => ({ now, paths: new Map() })

/**
 * What tells one state of a flight's real path from the next, or null for a flight without one: the places it was
 * seen, its landing, real or estimated, and the height its sky is seen from. Its story and its sun events are made
 * from these, so they're made again when it changes.
 */
export function pathKey(leg: MapLeg): string | null {
  const record = leg.flight?.record
  if (!record) return null
  const { path } = record
  return [leg.id, path.knots.length, path.flownLength, path.length, path.hasLanded, record.touchdown, cockpitHorizonOnLeg(leg)].join('|')
}

const homeKey = (home: AirportMark | null) => (home ? `${home.code}|${home.place.lat},${home.place.lng}` : '')

/**
 * Whether `kept` must be made again for the path whose key is `key`, at `now`: it was made for another geography or
 * home while there's one to make a story with, or the path changed and its facts weren't made in the last minute. A
 * clock that was set back doesn't hold them up: only facts made in the last minute do.
 */
function isStale(kept: PathFacts, key: string, geography: Geography | null, home: string, now: number): boolean {
  if (geography && (kept.geography !== geography || kept.home !== home)) return true
  if (kept.key === key) return false
  const age = now - kept.madeAt
  return !(age >= 0 && age < PATH_STORY_INTERVAL_MS)
}

/**
 * The story and sun events of `leg` along its real path, or null for a flight without one, which reads the route's.
 * With `store`, what it has is kept and remade by the rules above. Without, as in the tests, they're made afresh. The
 * story is left out while there's no geography (Stage 2 spec §3.3).
 */
export function realPathFacts(
  store: FactsStore | null, leg: MapLeg, geography: Geography | null, home: AirportMark | null,
): { story: LegStory | null; sunEvents: SunEvent[] } | null {
  const key = pathKey(leg)
  if (key == null) {
    // Back on the schedule, as when its live data goes: should a real path come back, its facts are made afresh, at once.
    store?.paths.delete(leg.id)
    return null
  }
  const now = store ? store.now() : 0
  let kept = store?.paths.get(leg.id)
  if (!kept || isStale(kept, key, geography, homeKey(home), now)) {
    kept = {
      key, madeAt: now, geography, home: homeKey(home), story: geography ? legStory(leg, geography, home) : null, sunEvents: sunEvents(leg),
    }
    store?.paths.set(leg.id, kept)
  }
  return { story: geography ? kept.story : null, sunEvents: kept.sunEvents }
}

/** Keeps `store` small: once it holds more than PATHS_KEPT flights, it forgets those `map` doesn't have. */
export function forgetOldPaths(store: FactsStore, map: TripMap): void {
  if (store.paths.size <= PATHS_KEPT) return
  const onMap = new Set(map.legs.map((l) => l.id))
  for (const id of [...store.paths.keys()]) if (!onMap.has(id)) store.paths.delete(id)
}
