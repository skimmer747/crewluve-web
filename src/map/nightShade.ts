import { subsolarPoint } from '../time/sun'
import type { GeoPoint } from './greatCircle'
import { MAX_LATITUDE } from './mercator'

/**
 * Where it is night on the flat map, as shapes to fill (moving map spec §7.1): the app's NightShade, from CrewLu's
 * moving map. The dark area for a given sun depth is everything within a set distance of the point opposite the sun.
 * On any one line of longitude that's a single stretch of latitude, so each shape is built a line at a time and no edge
 * crosses the date line.
 */

/** How far below the horizon the sun is at each layer's edge, in degrees: sunset to the end of astronomical twilight. */
export const SUN_DEPTHS = [0, 3, 6, 9, 12, 15, 18] as const

/** One layer's opacity. Seven stacked reach 42%, with a soft edge. */
export const LAYER_ALPHA = 0.075

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const clampLatitude = (lat: number) => Math.min(Math.max(lat, -MAX_LATITUDE), MAX_LATITUDE)

/** One layer per sun depth for the sun at `t`. Each layer is one or two closed shapes. */
export function nightLayers(t: number): GeoPoint[][][] {
  const sun = subsolarPoint(t)
  return SUN_DEPTHS.map((depth) => nightRegion(depth, sun.declination, sun.longitude))
}

/**
 * The area where the sun is more than `sunDepth` degrees down, as one or two closed shapes. `declination` is in radians
 * and `subsolarLongitude` in degrees, as `subsolarPoint` gives them.
 */
export function nightRegion(sunDepth: number, declination: number, subsolarLongitude: number): GeoPoint[][] {
  const centerLat = -declination
  let centerLng = subsolarLongitude + 180
  while (centerLng >= 180) centerLng -= 360
  while (centerLng < -180) centerLng += 360
  // The cosine of the dark area's radius: zero at sunset, when the area is exactly half the earth.
  const reach = Math.sin(rad(sunDepth))

  const shape = (lngs: number[], shift: number): GeoPoint[] => {
    const stretches = lngs.map((lng) => ({ lng: lng + shift, ...darkStretch(centerLat, centerLng, reach, lng) }))
    const north = stretches.map((s) => ({ lat: s.north, lng: s.lng }))
    const south = [...stretches].reverse().map((s) => ({ lat: s.south, lng: s.lng }))
    return [...north, ...south]
  }

  // The dark area reaches a pole: every line of longitude has a stretch, so the shape spans the whole map.
  if (Math.abs(Math.sin(centerLat)) >= reach) {
    return [shape(Array.from({ length: 361 }, (_, i) => -180 + i), 0)]
  }

  // Otherwise it's a rounded blob, its lines of longitude crowded towards the ends so the ends stay round.
  const squeeze = (reach * reach - Math.sin(centerLat) ** 2) / Math.cos(centerLat) ** 2
  const halfWidth = deg(Math.acos(Math.sqrt(Math.min(1, Math.max(0, squeeze)))))
  const lngs: number[] = []
  for (let s = -90; s <= 90; s += 2) lngs.push(centerLng + halfWidth * Math.sin(rad(s)))
  // A blob over the date line is cut there into two shapes, each with an exact edge on the line.
  if (lngs[lngs.length - 1] > 180) {
    return [shape([...lngs.filter((l) => l < 180), 180], 0), shape([180, ...lngs.filter((l) => l > 180)], -360)]
  }
  if (lngs[0] < -180) {
    return [shape([...lngs.filter((l) => l < -180), -180], 360), shape([-180, ...lngs.filter((l) => l > -180)], 0)]
  }
  return [shape(lngs, 0)]
}

/** The dark stretch of one line of longitude, its south and north ends in degrees, held to the map. */
function darkStretch(centerLat: number, centerLng: number, reach: number, lng: number): { south: number; north: number } {
  const a = Math.sin(centerLat)
  const b = Math.cos(centerLat) * Math.cos(rad(lng - centerLng))
  const size = Math.max(Math.hypot(a, b), 1e-12)
  const middle = deg(Math.atan2(a, b))
  const halfHeight = deg(Math.acos(Math.min(1, Math.max(-1, reach / size))))
  return { south: clampLatitude(middle - halfHeight), north: clampLatitude(middle + halfHeight) }
}
