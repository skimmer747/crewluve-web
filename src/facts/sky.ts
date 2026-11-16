import type { GeoPoint } from '../map/greatCircle'
import type { MapLeg } from '../map/tripMap'
import { moonPhase, type MoonPhase } from '../time/moon'
import { subsolarPoint, SUN_UP_ALTITUDE, sunAltitude } from '../time/sun'
import { DAY, HOUR, MINUTE } from '../time/zoned'
import { coursePositionAt, legAirborne } from './legCourse'
import { moonAltitude } from './moonPosition'

/**
 * The sky from the cockpit (Stage 2 spec §4.5), as the app's SkyFacts: sunrises and sunsets at cruise, when the people
 * below see them, chasing the sun, and the moon. Also the next sunrise or sunset on the ground at an airport (§5.3).
 * It uses the site's own sun (src/time/sun.ts), which the location card's sunrise and sunset use too. A flight with a
 * record is followed along its real path at its real times, and seen from the real plane's height at its cruise
 * (Stage 3 spec §8); any other, from the schedule as before.
 */

export type SunKind = 'sunrise' | 'sunset'

export interface SunEvent {
  kind: SunKind
  time: number
  /** How much later than the people below the cockpit sees a sunset, or how much earlier a sunrise, in ms, when that's 5 minutes or more. */
  peopleBelowGap: number | null
}

/** Which part of the day stretches while the plane chases the sun. */
export type Chase = 'morning' | 'afternoon'

export interface MoonSight {
  phase: MoonPhase
  isUp: boolean
}

/** The sun's centre at sunrise and sunset on the ground, after refraction. */
export const GROUND_HORIZON = SUN_UP_ALTITUDE
/** The schedule's height in the air. It also stands in for a real plane that's climbing or coming down. */
export const CRUISE_ALTITUDE_FEET = 35_000
/**
 * A real plane's own height counts while it's at its cruise: from 25,000 to 60,000 ft. Lower, it's on its way up or
 * down, and the sunrises and sunsets ahead are seen from the cruise it's climbing to. Higher can't be right.
 */
export const CRUISE_ALTITUDES_FEET = { lowest: 25_000, highest: 60_000 }

/** How far below level the horizon lies from `feet` up, in degrees: 1.76′ × √(height in m). */
export const horizonDip = (feet: number) => (1.76 / 60) * Math.sqrt(Math.max(feet, 0) * 0.3048)

/** The sun's altitude at a cockpit sunrise or sunset at cruise: about −3.86°. */
export const COCKPIT_HORIZON = GROUND_HORIZON - horizonDip(CRUISE_ALTITUDE_FEET)
/** Under this, the cockpit and the people below see it at about the same time. */
export const PEOPLE_BELOW_THRESHOLD_MS = 5 * MINUTE
/** Chasing the sun: its hour angle at the plane moving at under half its usual 15° an hour. */
export const CHASE_RATE = 7.5

const SAMPLE_STEP_MS = 2 * MINUTE
const GROUND_SEARCH_MS = 3 * HOUR
const GROUND_STEP_MS = 10 * MINUTE

/**
 * The sun's altitude at a cockpit sunrise or sunset on `leg` (Stage 3 spec §8): from the height the real plane was last
 * seen at, while it's in the air at its cruise, and from 35,000 ft otherwise.
 */
export function cockpitHorizonOnLeg(leg: MapLeg): number {
  const live = leg.flight?.live
  const fix = live?.state === 'airborne' ? live.fix : null
  const feet = fix && !fix.onGround ? fix.altitudeFt : null
  // NaN fails both comparisons, so it's left out too.
  if (feet == null || !(feet >= CRUISE_ALTITUDES_FEET.lowest && feet <= CRUISE_ALTITUDES_FEET.highest)) return COCKPIT_HORIZON
  return GROUND_HORIZON - horizonDip(feet)
}

/** The sun's altitude at the plane, in degrees: where its record has it, else where the schedule does. */
export function sunAltitudeOnLeg(leg: MapLeg, t: number): number {
  const here = coursePositionAt(leg, t)
  return sunAltitude(t, here.lat, here.lng)
}

/** Narrows a change of sign in `height` between two moments to `precisionMs`, and gives the middle. */
function crossing(height: (t: number) => number, earlier: number, later: number, isRising: boolean, precisionMs: number): number {
  let low = earlier
  let high = later
  while (high - low > precisionMs) {
    const middle = low + (high - low) / 2
    if (height(middle) > 0 === isRising) high = middle
    else low = middle
  }
  return low + (high - low) / 2
}

/** The sun's height above the ground's sunrise altitude at `place`. */
const groundHeight = (place: GeoPoint) => (t: number) => sunAltitude(t, place.lat, place.lng) - GROUND_HORIZON

/**
 * When the ground under a cockpit event sees the same event, as a gap in ms when that's 5 minutes or more. A sunset
 * reaches the ground first and a sunrise last, so it steps that way until the sun is on the other side of the ground's
 * horizon, up to 3 hours.
 */
function peopleBelowGap(point: GeoPoint, cockpitTime: number, isSunrise: boolean): number | null {
  const height = groundHeight(point)
  const step = isSunrise ? SAMPLE_STEP_MS : -SAMPLE_STEP_MS
  for (let near = cockpitTime; Math.abs(near - cockpitTime) < GROUND_SEARCH_MS; near += step) {
    const far = near + step
    if (height(far) > 0) {
      const ground = isSunrise ? crossing(height, near, far, true, 5_000) : crossing(height, far, near, false, 5_000)
      const gap = Math.abs(cockpitTime - ground)
      return gap >= PEOPLE_BELOW_THRESHOLD_MS ? gap : null
    }
  }
  return null
}

/**
 * The sunrises and sunsets the cockpit sees while the flight is in the air, in order: sampled every 2 minutes and
 * narrowed to 5 seconds. A flight with a record is followed along its real path, at its real times.
 */
export function sunEvents(leg: MapLeg): SunEvent[] {
  const window = leg.kind === 'flight' ? legAirborne(leg) : null
  if (!window) return []
  const horizon = cockpitHorizonOnLeg(leg)
  const height = (t: number) => sunAltitudeOnLeg(leg, t) - horizon
  const times: number[] = []
  for (let t = window.start; t < window.end; t += SAMPLE_STEP_MS) times.push(t)
  times.push(window.end)
  const heights = times.map(height)
  const events: SunEvent[] = []
  for (let i = 1; i < times.length; i++) {
    const isRising = heights[i - 1] <= 0 && heights[i] > 0
    const isSetting = heights[i - 1] > 0 && heights[i] <= 0
    if (!isRising && !isSetting) continue
    const time = crossing(height, times[i - 1], times[i], isRising, 5_000)
    events.push({ kind: isRising ? 'sunrise' : 'sunset', time, peopleBelowGap: peopleBelowGap(coursePositionAt(leg, time), time, isRising) })
  }
  return events
}

/** A longitude difference within −180…180. */
const wrapped = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180

/**
 * While the sun's up at the plane and its hour angle there changes at under 7.5° an hour: the afternoon, or the morning
 * while the sun is east of the plane's meridian.
 */
export function chase(leg: MapLeg, t: number): Chase | null {
  const window = leg.kind === 'flight' ? legAirborne(leg) : null
  if (!window || t < window.start || t > window.end || sunAltitudeOnLeg(leg, t) <= cockpitHorizonOnLeg(leg)) return null
  const here = coursePositionAt(leg, t)
  const soon = coursePositionAt(leg, t + MINUTE)
  const degreesPerHour = 15 + wrapped(soon.lng - here.lng) * 60
  if (Math.abs(degreesPerHour) >= CHASE_RATE) return null
  return wrapped(here.lng - subsolarPoint(t).longitude) < 0 ? 'morning' : 'afternoon'
}

/** The moon while the sun is below the cockpit's horizon, or null in daylight. */
export function moonSight(leg: MapLeg, t: number): MoonSight | null {
  if (leg.kind !== 'flight' || sunAltitudeOnLeg(leg, t) > cockpitHorizonOnLeg(leg)) return null
  const here = coursePositionAt(leg, t)
  return { phase: moonPhase(t), isUp: moonAltitude(here.lat, here.lng, t) > 0 }
}

/** The next sunrise or sunset on the ground at `place` within a day of `after`: sampled every 10 minutes and narrowed to 30 seconds. */
export function nextGroundSunEvent(place: GeoPoint, after: number): { kind: SunKind; time: number } | null {
  const height = groundHeight(place)
  let before = height(after)
  for (let earlier = after; earlier - after < DAY; earlier += GROUND_STEP_MS) {
    const later = earlier + GROUND_STEP_MS
    const next = height(later)
    if (before <= 0 !== next <= 0) {
      const isRising = next > 0
      return { kind: isRising ? 'sunrise' : 'sunset', time: crossing(height, earlier, later, isRising, 30_000) }
    }
    // Each sample's height is the next step's starting height, so it is worked out once (as the app's SkyFacts does).
    before = next
  }
  return null
}
