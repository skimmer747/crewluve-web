import type { GeoPoint } from './greatCircle'

/**
 * Which way the trip map's plane points (moving map spec §7.2), as in the app. The map always faces north, so the angle
 * comes from the coordinates alone. Angles are in radians as the screen draws them: 0 points right (east) and a quarter
 * turn points down (south).
 */

/** How far ahead along the leg the plane is aimed, as a share of the leg. */
export const LOOK_AHEAD = 0.005

/** The two places on a leg to aim between at `fraction` of the way along. Near the end it aims along the last stretch. */
export function aimFractions(fraction: number, lookAhead = LOOK_AHEAD): { from: number; to: number } {
  const here = Math.min(Math.max(fraction, 0), 1)
  if (here + lookAhead <= 1) return { from: here, to: here + lookAhead }
  return { from: Math.max(1 - lookAhead, 0), to: 1 }
}

/** The smallest turn from the angle `from` to the angle `to`: never more than half a turn either way. */
export function shortestTurn(from: number, to: number): number {
  let turn = (to - from) % (2 * Math.PI)
  if (turn > Math.PI) turn -= 2 * Math.PI
  if (turn < -Math.PI) turn += 2 * Math.PI
  return turn
}

/** `target` moved by whole turns to sit the short way round from `previous`, so an animated turn never spins the long way. */
export function continuing(previous: number, target: number): number {
  return previous + shortestTurn(previous, target)
}

const flatY = (lat: number) => {
  const held = Math.min(Math.max(lat, -89.9), 89.9)
  return Math.log(Math.tan(Math.PI / 4 + (held * Math.PI) / 360))
}

/** The direction from one place to another on a north-up flat map, or null when they're the same place. */
export function flatMapAngle(from: GeoPoint, to: GeoPoint): number | null {
  let east = to.lng - from.lng
  if (east > 180) east -= 360
  if (east < -180) east += 360
  const dx = (east * Math.PI) / 180
  const north = flatY(to.lat) - flatY(from.lat)
  if (dx === 0 && north === 0) return null
  // The screen's y grows downward, so north is up the screen.
  return Math.atan2(-north, dx)
}
