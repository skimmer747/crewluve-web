import { DAY, HOUR } from '../time/zoned'
import { progressAt, type ReplayClock } from './replayClock'
import { isGroundKind, tripWaits, type ActivityKind, type TripWait } from './tripActivity'
import type { MapLeg, TripMap } from './tripMap'

/**
 * The timeline bar's blocks (the app's activity markers design §4.1), as the app's TripTimeline: the trip's span in
 * replay time at 1x, at the clock's pace, each part colored by what the pilot is doing. A wait carries its real length,
 * "20h" or "4d", which the bar writes on it when it fits.
 */

export interface TimelineBlock {
  kind: ActivityKind
  /** Where it starts and ends along the bar, 0…1: its replay time at 1x over the whole replay's. */
  start: number
  end: number
  /** A wait's real length; null for a flight or a drive, and for a wait under half an hour. */
  label: string | null
}

/** Earliest first, end to end from 0 to 1. None for a trip with no length. */
export function timelineBlocks(map: TripMap, clock: ReplayClock): TimelineBlock[] {
  const { start, end } = map.span
  if (end <= start) return []
  const moving = map.legs.filter((l) => l.end > l.start)
  const waits = tripWaits(map)
  const cuts = [start, end, ...moving.flatMap((l) => [l.start, l.end])].filter((t) => t >= start && t <= end)
  const times = [...new Set(cuts)].sort((a, b) => a - b)
  const parts: { kind: ActivityKind; start: number; end: number }[] = []
  times.slice(1).forEach((to, i) => {
    const kind = kindOf(times[i], to, moving, waits)
    const last = parts[parts.length - 1]
    if (last?.kind === kind) last.end = to
    else parts.push({ kind, start: times[i], end: to })
  })
  return parts.map((p) => ({
    kind: p.kind,
    start: progressAt(clock, p.start),
    end: progressAt(clock, p.end),
    label: isGroundKind(p.kind) ? waitLabel(p.end - p.start) : null,
  }))
}

/**
 * A wait's length on its block (design §4.1): whole hours under 48, whole days from 48, each to the nearest with halves
 * up; null when it rounds to no hours. The shared cases are `waitLabels` in tests/fixtures/trip-map/replay-cases.json.
 */
export function waitLabel(ms: number): string | null {
  const hours = Math.round(ms / HOUR)
  if (hours <= 0) return null
  return hours < 48 ? `${hours}h` : `${Math.round(ms / DAY)}d`
}

/** Flying where any flight moves, else driving where a drive does, else the wait's kind. */
function kindOf(from: number, to: number, moving: MapLeg[], waits: TripWait[]): ActivityKind {
  const covering = moving.filter((l) => l.start <= from && to <= l.end)
  if (covering.some((l) => l.kind === 'flight')) return 'flying'
  if (covering.length > 0) return 'driving'
  // A stretch no moving leg covers lies inside one of the map's waits.
  return waits.find((w) => w.start <= from && to <= w.end)?.kind ?? 'turn'
}
