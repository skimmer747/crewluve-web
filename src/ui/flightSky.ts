import { isSunUp } from '../time/sun'
import { MINUTE } from '../time/zoned'
import { greatCirclePoint, type GeoPoint } from './flightMapGeometry'

/** The map's sky (slice 2C §4.3): day or night, as the app's day and night gradients. */
export type DayOrNight = 'day' | 'night'

/** Where along the route the sun rises or sets during the flight, from 0 at departure to 1 at landing. */
export interface SolarTransition {
  progress: number
  sunrise: boolean
}

/**
 * Where the sun first rises or sets along the route (findSolarTransitionPoint): the flight is sampled every 5 minutes,
 * at the place it would be then, and the first change of daylight is put halfway between the two samples. Null when
 * the daylight never changes, and for flights of 30 minutes or less.
 */
export function solarTransition(dep: GeoPoint, arr: GeoPoint, depTime: number, arrTime: number): SolarTransition | null {
  const duration = arrTime - depTime
  if (!(duration > 30 * MINUTE)) return null
  const samples = Math.trunc(duration / (5 * MINUTE))
  if (samples <= 1) return null
  let before: boolean | null = null
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples
    const at = greatCirclePoint(dep, arr, progress)
    const up = isSunUp(depTime + duration * progress, at.lat, at.lng)
    if (before !== null && up !== before) return { progress: (i - 0.5) / samples, sunrise: up }
    before = up
  }
  return null
}

/**
 * How the sky is painted. With the same daylight at both ends, top to bottom in the day or the night colors. Otherwise
 * left to right: the left airport's color up to `leftUntil` and the right airport's from `rightFrom`, as fractions of
 * the width, blending between.
 */
export type Sky =
  | { direction: 'down'; time: DayOrNight }
  | { direction: 'across'; left: DayOrNight; right: DayOrNight; leftUntil: number; rightFrom: number }

/** The blend between night and day is 15% of the map's width, centered on the sunrise or sunset point. */
const BLEND = 0.15

/**
 * The sky for daylight at departure and at landing (`depDay`, `arrDay`), the airports' places across the map (`depX`,
 * `arrX`, fractions of its width) and the sunrise or sunset point, if any (dayNightBackground). Without that point the
 * colors blend across the whole width.
 */
export function flightSky(depDay: boolean, arrDay: boolean, depX: number, arrX: number, transition: SolarTransition | null): Sky {
  const time = (day: boolean): DayOrNight => (day ? 'day' : 'night')
  if (depDay === arrDay) return { direction: 'down', time: time(depDay) }
  const depLeft = depX < arrX
  const left = time(depLeft ? depDay : arrDay)
  const right = time(depLeft ? arrDay : depDay)
  if (!transition) return { direction: 'across', left, right, leftUntil: 0, rightFrom: 1 }
  const at = depX + (arrX - depX) * transition.progress
  return { direction: 'across', left, right, leftUntil: Math.max(0, at - BLEND / 2), rightFrom: Math.min(1, at + BLEND / 2) }
}
