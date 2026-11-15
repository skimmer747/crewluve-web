import { HOUR } from '../time/zoned'
import { isMoving, legInMotion, pilotLocation, type AirportMark, type GroundStop, type TripMap } from './tripMap'

/**
 * What the pilot is doing at a moment of the trip map, and where (the app's activity markers design §2.2), as the app's
 * TripActivity and TripMap+Activity: flying, driving, on a layover, at a turn, at base or at home. The kinds are the
 * shared cases' names (tests/fixtures/trip-map/activity-cases.json, a copy of the app's: change both together).
 */

export type ActivityKind = 'flying' | 'driving' | 'layover' | 'turn' | 'base' | 'home'

/** What a wait on the ground can be. */
export type GroundKind = Exclude<ActivityKind, 'flying' | 'driving'>

export interface TripActivity {
  kind: ActivityKind
  /** The flight's or the drive's destination, or where the pilot waits. */
  place: AirportMark
}

/** The pilot on the ground: what their marker shows. */
export interface GroundActivity extends TripActivity {
  kind: GroundKind
}

/** A stretch of the trip with no leg moving: from one leg's end, delay included, to the next one's start. */
export interface TripWait {
  start: number
  end: number
  kind: GroundKind
}

/** With no ground leg to name it, a wait this long or longer is a layover, and a shorter one a turn. */
export const SHORTEST_LAYOVER = 8 * HOUR

/** Layover, turn, base and home are waits, with the pilot's marker. Flying and driving show the plane and the car. */
export const isGroundKind = (kind: ActivityKind): kind is GroundKind => kind !== 'flying' && kind !== 'driving'

/** Every stretch of the span with no leg moving, earliest first, each named. A leg with no length never moves. */
export function tripWaits(map: TripMap): TripWait[] {
  const waits: TripWait[] = []
  let movingUntil = map.span.start
  for (const leg of [...map.legs].sort((a, b) => a.start - b.start)) {
    if (leg.end <= leg.start) continue
    if (leg.start > movingUntil) waits.push(namedWait(map, movingUntil, leg.start))
    movingUntil = Math.max(movingUntil, leg.end)
  }
  if (map.span.end > movingUntil) waits.push(namedWait(map, movingUntil, map.span.end))
  return waits
}

/** What the pilot is doing at `t`, and where. A flight wins over a drive that overlaps it. */
export function activityAt(map: TripMap, t: number): TripActivity | null {
  const moving = map.legs.find((l) => l.kind === 'flight' && isMoving(l, t)) ?? legInMotion(map, t)
  if (moving) return { kind: moving.kind === 'flight' ? 'flying' : 'driving', place: moving.destination }
  const place = pilotLocation(map, t)
  return place ? { kind: groundKind(map, t, place), place } : null
}

/**
 * Before the first departure, home for a next trip, or base while the pilot waits there, else home or base by where
 * the trip starts. From the last arrival on, home for a recap, else home or base by where it ends. In between, the
 * wait's kind.
 */
function groundKind(map: TripMap, t: number, place: AirportMark): GroundKind {
  const isHomeAirport = place.code === map.home?.code
  if (t < map.span.start && map.mode.kind === 'nextTrip') return map.isWaitingAtBase && !isHomeAirport ? 'base' : 'home'
  if (t < map.span.start) return isHomeAirport ? 'home' : 'base'
  if (t >= map.span.end) return map.mode.kind === 'recap' || isHomeAirport ? 'home' : 'base'
  // Inside the span with nothing moving, one of the waits holds `t`.
  return tripWaits(map).find((w) => w.start <= t && t < w.end)?.kind ?? 'turn'
}

/**
 * The wait from `start` to `end`, named by the ground stop overlapping it most, the earlier on a tie; with none, by
 * where it is, then by its length (the app's base waits design §2).
 */
function namedWait(map: TripMap, start: number, end: number): TripWait {
  let best: GroundStop | null = null
  let most = 0
  for (const stop of map.groundStops) {
    const overlap = Math.min(stop.end, end) - Math.max(stop.start, start)
    if (overlap <= 0) continue
    if (best && (overlap < most || (overlap === most && stop.start >= best.start))) continue
    best = stop
    most = overlap
  }
  return { start, end, kind: best?.kind ?? unnamedKind(map, start, end) }
}

/**
 * A wait no ground leg names: home at the home airport, base at the base airport, else a layover from 8 hours and a
 * turn under. It's where the pilot's marker stands as the wait starts. Home comes first, for a pilot based at home.
 */
function unnamedKind(map: TripMap, start: number, end: number): GroundKind {
  const code = pilotLocation(map, start)?.code
  if (code != null && code === map.home?.code) return 'home'
  if (code != null && code === map.base?.code) return 'base'
  return end - start >= SHORTEST_LAYOVER ? 'layover' : 'turn'
}
