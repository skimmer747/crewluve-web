import type { Move, Schedule } from '../engine/types'
import { airborneWindow } from '../map/flightProgress'
import { distanceMeters, pointAlong, type GeoPoint } from '../map/greatCircle'
import type { LiveFix, LiveFlight, TrailPoint } from '../map/liveFlight'
import { flatMapAngle } from '../map/planeHeading'
import { MINUTE } from '../time/zoned'

/**
 * The demo's real planes (Stage 3 spec §12): made up, as the shared cases' are (Todd, 15 Nov 2026), so no real flight's
 * data is in the site. Each is worked out from the moment shown, as partner_live would answer then, so a scene stays
 * itself for as long as the page is open: the plane flies on, and lands when it's due.
 */

export type LiveDemoScene = 'live-ahead' | 'live-ocean-gap' | 'live-on-ground-late' | 'live-landed'

interface Story {
  /** The flight's number in the demo's trip. */
  number: string
  /** How far north of the great circle the made-up path bows at its middle, in degrees: a real route is rarely straight. */
  bow: number
  /** How many minutes after the plan's takeoff the plane takes off, early when negative. Null: it's still at the gate. */
  takeoffLate: number | null
  /** Stretches nobody saw, in minutes after the takeoff, from and to. */
  unseen: [number, number][]
  /** Minutes after the takeoff it was last seen, or null when it's seen all the way. */
  lastSeen: number | null
}

const STORIES: Record<LiveDemoScene, Story> = {
  // Louisville to Rockford, off ten minutes early and seen all the way, on the great circle: "10 min ahead".
  'live-ahead': { number: '2961', bow: 0, takeoffLate: -10, unseen: [], lastSeen: null },
  // Rockford to Anchorage, off 25 minutes late, unseen for 35 minutes over northern Canada, where adsb.lol has no
  // receivers (spec §2.1), then seen again, and not since: faded, an estimate, "About … behind".
  'live-ocean-gap': { number: '2963', bow: 2.5, takeoffLate: 25, unseen: [[90, 125]], lastSeen: 150 },
  // Rockford to Anchorage, still at the gate twenty minutes after the plan's takeoff.
  'live-on-ground-late': { number: '2963', bow: 0, takeoffLate: null, unseen: [], lastSeen: null },
  // Rockford to Anchorage, off 8 minutes early and seen all the way: down a minute ago, "Landed 8 min early", and at the
  // gate 6 minutes on (the landed, not yet at the gate design, Todd, 17 Nov 2026).
  'live-landed': { number: '2963', bow: 0, takeoffLate: -8, unseen: [], lastSeen: null },
}

export const isLiveDemoScene = (scene: string): scene is LiveDemoScene => Object.prototype.hasOwnProperty.call(STORIES, scene)

/** A fix seen 20 seconds before the moment shown, as Crewlu Cloud asks adsb.lol every minute. */
const FIX_AGE_MS = 20_000

/**
 * The demo's real plane at `now` for `scene`, by its leg's id, as the live source would hold it: none for a scene
 * without one, or when its flight or airports aren't found.
 */
export function demoLiveFlights(scene: string, schedule: Schedule, placeOf: (code: string) => GeoPoint | null, now: number): ReadonlyMap<string, LiveFlight> {
  if (!isLiveDemoScene(scene)) return new Map()
  const story = STORIES[scene]
  const move = schedule.trips.flatMap((t) => t.dutyPeriods.flatMap((dp) => dp.flights)).find((m) => m.number === story.number)
  const from = move ? placeOf(move.dep) : null
  const to = move ? placeOf(move.arr) : null
  if (!move || !from || !to) return new Map()
  const flight = madeUp(story, move, from, to, now)
  return flight ? new Map([[move.id, flight]]) : new Map()
}

function fixAt(place: GeoPoint, trackDeg: number | null, seenAt: number, onGround: boolean): LiveFix {
  return {
    place, altitudeFt: onGround ? null : 35_000, groundSpeedKt: onGround ? 0 : 460, trackDeg, onGround, registration: null, typeCode: 'B763', seenAt,
  }
}

function madeUp(story: Story, move: Move, from: GeoPoint, to: GeoPoint, now: number): LiveFlight | null {
  const plan = airborneWindow(move.start, move.end)
  if (!plan) return null
  const base = { legId: move.id, callsign: `UPS${move.number}`, landedAt: null }
  if (story.takeoffLate == null) return { ...base, state: 'ground', fix: fixAt(from, null, now - FIX_AGE_MS, true), trail: [] }
  // It flies the plan's speed along a path that bows north of the great circle, so a longer path takes longer.
  const along = (fraction: number): GeoPoint => {
    const p = pointAlong(from, to, fraction)
    return { lat: p.lat + story.bow * Math.sin(Math.PI * fraction), lng: p.lng }
  }
  const steps = Array.from({ length: 65 }, (_, i) => along(i / 64))
  const length = steps.slice(1).reduce((sum, p, i) => sum + distanceMeters(steps[i], p), 0)
  const takeoff = plan.start + story.takeoffLate * MINUTE
  const inAir = (plan.end - plan.start) * (length / distanceMeters(from, to))
  const touchdown = takeoff + inAir
  const place = (t: number) => along(Math.min(Math.max((t - takeoff) / inAir, 0), 1))
  const track = (t: number) => {
    const angle = flatMapAngle(place(t), place(t + MINUTE))
    return angle == null ? null : ((angle * 180) / Math.PI + 90 + 360) % 360
  }
  const lastSeen = story.lastSeen == null ? Infinity : takeoff + story.lastSeen * MINUTE
  const isUnseen = (t: number) => story.unseen.some(([a, b]) => t >= takeoff + a * MINUTE && t < takeoff + b * MINUTE)
  // A point a minute, up to a minute before the moment shown, as a trail's points come.
  const trail: TrailPoint[] = []
  for (let t = takeoff + MINUTE; t <= Math.min(now - MINUTE, lastSeen, touchdown); t += MINUTE) {
    if (!isUnseen(t)) trail.push({ time: t, place: place(t), altitudeFt: 35_000 })
  }
  if (lastSeen === Infinity && now - FIX_AGE_MS >= touchdown) {
    return { ...base, state: 'landed', landedAt: touchdown, fix: fixAt(to, null, now - FIX_AGE_MS, true), trail }
  }
  const seenAt = Math.min(now - FIX_AGE_MS, lastSeen)
  return { ...base, state: 'airborne', fix: fixAt(place(seenAt), track(seenAt), seenAt, false), trail }
}
