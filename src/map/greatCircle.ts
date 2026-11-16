/** A place on the earth, in degrees: latitude, and longitude east positive. */
export interface GeoPoint {
  lat: number
  lng: number
}

/** The earth's mean radius, in meters. */
export const EARTH_RADIUS_M = 6_371_008.8

/** One statute mile, in meters. Families think in miles (moving map spec §8.3). */
export const METERS_PER_MILE = 1_609.344

/** One nautical mile, in meters: the unit of the real plane's shared cases (Stage 3 spec §16.1). */
export const METERS_PER_NM = 1_852

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The angle between two places seen from the earth's centre, in radians. The haversine form stays exact for short hops. */
function centralAngle(a: GeoPoint, b: GeoPoint): number {
  const latChange = rad(b.lat - a.lat)
  const lngChange = rad(b.lng - a.lng)
  const h = Math.sin(latChange / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(lngChange / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const vector = (p: GeoPoint) => ({
  x: Math.cos(rad(p.lat)) * Math.cos(rad(p.lng)),
  y: Math.cos(rad(p.lat)) * Math.sin(rad(p.lng)),
  z: Math.sin(rad(p.lat)),
})

/** The distance between two places along the earth's surface, in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  return EARTH_RADIUS_M * centralAngle(a, b)
}

/**
 * The place `fraction` of the way from `a` to `b` along the shortest path. A fraction outside 0…1 is held at the nearer
 * end. Two places on exactly opposite sides of the earth have no single shortest path; no leg is ever that long.
 */
export function pointAlong(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const share = Math.min(Math.max(fraction, 0), 1)
  const angle = centralAngle(a, b)
  if (angle <= 1e-9) return a
  const weightOfA = Math.sin((1 - share) * angle) / Math.sin(angle)
  const weightOfB = Math.sin(share * angle) / Math.sin(angle)
  const va = vector(a)
  const vb = vector(b)
  const x = weightOfA * va.x + weightOfB * vb.x
  const y = weightOfA * va.y + weightOfB * vb.y
  const z = weightOfA * va.z + weightOfB * vb.z
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lng: deg(Math.atan2(y, x)) }
}

/** `count` evenly spaced places from `a` to `b`, both ends included. Never fewer than two. */
export function pointsAlong(a: GeoPoint, b: GeoPoint, count: number): GeoPoint[] {
  const total = Math.max(count, 2)
  return Array.from({ length: total }, (_, i) => pointAlong(a, b, i / (total - 1)))
}
