// The in-flight map's geometry (slice 2C §4), ported line for line from the app's FlightRouteMapView: the great circle,
// the box around it, the projection into the drawing, the arrow, the plane and the distance.

/** A place on the globe, in degrees: latitude north positive, longitude east positive. */
export interface GeoPoint {
  lat: number
  lon: number
}

/** A point in the map's drawing, in CSS pixels from its top left. */
export interface MapPoint {
  x: number
  y: number
}

/** The map is 200 px tall, its drawing kept 60 px inside every edge, and the route drawn as 50 segments (§4.1, §4.2). */
export const MAP_HEIGHT = 200
export const MAP_PADDING = 60
const ROUTE_SEGMENTS = 50
/** A phone's card width, which the map uses until it has measured its own (§4.1). */
export const DEFAULT_MAP_WIDTH = 343

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** The point `fraction` of the way along the great circle from `a` to `b` (interpolateGreatCircle). */
export function greatCirclePoint(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const [lat1, lon1, lat2, lon2] = [rad(a.lat), rad(a.lon), rad(b.lat), rad(b.lon)]
  const cosD = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  const d = Math.acos(Math.min(1, Math.max(-1, cosD)))
  if (d < 0.0001) return a
  const wa = Math.sin((1 - fraction) * d) / Math.sin(d)
  const wb = Math.sin(fraction * d) / Math.sin(d)
  const x = wa * Math.cos(lat1) * Math.cos(lon1) + wb * Math.cos(lat2) * Math.cos(lon2)
  const y = wa * Math.cos(lat1) * Math.sin(lon1) + wb * Math.cos(lat2) * Math.sin(lon2)
  const z = wa * Math.sin(lat1) + wb * Math.sin(lat2)
  return { lat: deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: deg(Math.atan2(y, x)) }
}

/** The great circle from `a` to `b` as `segments` + 1 points, ends included (generateGreatCirclePoints). */
export function routePoints(a: GeoPoint, b: GeoPoint, segments = ROUTE_SEGMENTS): GeoPoint[] {
  return Array.from({ length: segments + 1 }, (_, i) => greatCirclePoint(a, b, i / segments))
}

/**
 * Whether the route is laid out across the antimeridian: the airports lie in different hemispheres and the way west
 * is shorter than the way east (routeCrossesAntimeridian). Anchorage to Tokyo is; Louisville to Anchorage isn't.
 */
export function crossesAntimeridian(a: GeoPoint, b: GeoPoint): boolean {
  if ((a.lon >= 0 && b.lon >= 0) || (a.lon < 0 && b.lon < 0)) return false
  const eastward = Math.abs(b.lon - a.lon)
  return 360 - eastward < eastward
}

/** The box the map shows, in degrees. Across the antimeridian, negative longitudes are counted from 180° on (+360). */
export interface MapBounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  /** 360 when the route crosses the antimeridian, else 0 (longitudeOffset). */
  lonOffset: number
}

/** A longitude in the box's terms: +360 for a negative one when the box crosses the antimeridian (normalizeLongitude). */
function boxLongitude(lon: number, lonOffset: number): number {
  return lonOffset !== 0 && lon < 0 ? lon + lonOffset : lon
}

/**
 * The smallest box holding both airports and the whole route, padded by 15% on each axis, and widened to 0.6 × its
 * height when it's under half as wide as it's tall (calculateBounds, §4.2).
 */
export function mapBounds(a: GeoPoint, b: GeoPoint): MapBounds {
  const lonOffset = crossesAntimeridian(a, b) ? 360 : 0
  let minLat = Math.min(a.lat, b.lat)
  let maxLat = Math.max(a.lat, b.lat)
  let minLon = Math.min(boxLongitude(a.lon, lonOffset), boxLongitude(b.lon, lonOffset))
  let maxLon = Math.max(boxLongitude(a.lon, lonOffset), boxLongitude(b.lon, lonOffset))
  for (const p of routePoints(a, b)) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    const lon = boxLongitude(p.lon, lonOffset)
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
  }
  const latPadding = (maxLat - minLat) * 0.15
  const lonPadding = (maxLon - minLon) * 0.15
  minLat -= latPadding
  maxLat += latPadding
  minLon -= lonPadding
  maxLon += lonPadding
  const latSpan = maxLat - minLat
  const lonSpan = maxLon - minLon
  if (lonSpan < latSpan * 0.5) {
    const extra = (latSpan * 0.6 - lonSpan) / 2
    minLon -= extra
    maxLon += extra
  }
  return { minLat, maxLat, minLon, maxLon, lonOffset }
}

/** Where a place falls in a map `width` × `height` px: inside the 60 px padding, north up (projectToView). */
export function project(p: GeoPoint, bounds: MapBounds, width: number, height = MAP_HEIGHT): MapPoint {
  const lonSpan = bounds.maxLon - bounds.minLon
  const latSpan = bounds.maxLat - bounds.minLat
  const nx = lonSpan <= 0 ? 0.5 : (boxLongitude(p.lon, bounds.lonOffset) - bounds.minLon) / lonSpan
  const ny = latSpan <= 0 ? 0.5 : (p.lat - bounds.minLat) / latSpan
  return {
    x: MAP_PADDING + nx * (width - MAP_PADDING * 2),
    y: MAP_PADDING + (1 - ny) * (height - MAP_PADDING * 2),
  }
}

/** The great-circle distance in nautical miles, rounded down: the haversine formula on a 6,371 km sphere (§4.7). */
export function distanceNm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return Math.trunc(meters / 1852)
}

/** The route's arrow: a chevron, its arms and tip as points (§4.4). */
export interface Chevron {
  left: MapPoint
  tip: MapPoint
  right: MapPoint
}

/**
 * The arrow at the route's middle point, pointing along the route from the point before it; with only two points it
 * sits halfway between them (greatCircleRoute). The tip is 12 px ahead, the arms 9.6 px out at ±2.5 radians.
 */
export function routeArrow(points: MapPoint[]): Chevron {
  let angle = 0
  let at: MapPoint = points[0] ?? { x: 0, y: 0 }
  if (points.length >= 3) {
    const mid = Math.floor(points.length / 2)
    const [before, here] = [points[mid - 1], points[mid]]
    angle = Math.atan2(here.y - before.y, here.x - before.x)
    at = here
  } else if (points.length === 2) {
    const [first, last] = points
    angle = Math.atan2(last.y - first.y, last.x - first.x)
    at = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }
  }
  const out = (length: number, a: number): MapPoint => ({ x: at.x + Math.cos(a) * length, y: at.y + Math.sin(a) * length })
  return { left: out(9.6, angle + 2.5), tip: out(12, angle), right: out(9.6, angle - 2.5) }
}

/** Where the plane is drawn, and its heading on screen in degrees: 0 points right, 90 down (§4.6). */
export interface PlanePose {
  at: MapPoint
  heading: number
}

/**
 * The plane at `progress` (0 to 1) along the route, heading toward the point 2% further on. Near the end, where that
 * point is the same or under 1 px away, the heading comes from the point 2% behind instead (geographicAircraftMarker).
 */
export function planePose(a: GeoPoint, b: GeoPoint, bounds: MapBounds, width: number, progress: number): PlanePose {
  const pointAt = (f: number) => project(greatCirclePoint(a, b, f), bounds, width)
  const at = pointAt(progress)
  const aheadProgress = Math.min(progress + 0.02, 1)
  const ahead = pointAt(aheadProgress)
  const [dx, dy] = [ahead.x - at.x, ahead.y - at.y]
  if (aheadProgress === progress || Math.hypot(dx, dy) < 1) {
    const behind = pointAt(Math.max(progress - 0.02, 0))
    return { at, heading: deg(Math.atan2(at.y - behind.y, at.x - behind.x)) }
  }
  return { at, heading: deg(Math.atan2(dy, dx)) }
}
