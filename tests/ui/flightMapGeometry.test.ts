import { describe, expect, it } from 'vitest'
import {
  crossesAntimeridian,
  DEFAULT_MAP_WIDTH,
  distanceNm,
  greatCirclePoint,
  MAP_HEIGHT,
  MAP_PADDING,
  mapBounds,
  planePose,
  project,
  routeArrow,
  routePoints,
  type GeoPoint,
} from '../../src/ui/flightMapGeometry'

const SDF: GeoPoint = { lat: 38.1746, lng: -85.7382 }
const ANC: GeoPoint = { lat: 61.1744, lng: -149.9983 }
const MIA: GeoPoint = { lat: 25.7959, lng: -80.2871 }
const NRT: GeoPoint = { lat: 35.7647, lng: 140.3864 }
const HNL: GeoPoint = { lat: 21.3245, lng: -157.9251 }
const CGN: GeoPoint = { lat: 50.8659, lng: 7.1427 }
const W = DEFAULT_MAP_WIDTH

describe('greatCirclePoint', () => {
  it('starts and ends at the airports', () => {
    expect(greatCirclePoint(SDF, ANC, 0).lat).toBeCloseTo(SDF.lat, 9)
    expect(greatCirclePoint(SDF, ANC, 0).lng).toBeCloseTo(SDF.lng, 9)
    expect(greatCirclePoint(SDF, ANC, 1).lat).toBeCloseTo(ANC.lat, 9)
    expect(greatCirclePoint(SDF, ANC, 1).lng).toBeCloseTo(ANC.lng, 9)
  })

  it('follows the equator and the meridians, where the great circle is plain', () => {
    const half = greatCirclePoint({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }, 0.5)
    expect(half.lat).toBeCloseTo(0, 9)
    expect(half.lng).toBeCloseTo(45, 9)
    expect(greatCirclePoint({ lat: 0, lng: 0 }, { lat: 90, lng: 0 }, 0.5).lat).toBeCloseTo(45, 9)
  })

  it('bows toward the pole between two places at the same latitude, as a great circle does', () => {
    expect(greatCirclePoint({ lat: 45, lng: -100 }, { lat: 45, lng: 0 }, 0.5).lat).toBeGreaterThan(50)
  })

  it('gives the start for two airports at the same place', () => {
    expect(greatCirclePoint(SDF, SDF, 0.5)).toEqual(SDF)
  })
})

describe('routePoints', () => {
  it('draws the route as 50 segments, airports included', () => {
    const points = routePoints(SDF, ANC)
    expect(points).toHaveLength(51)
    expect(points[0].lat).toBeCloseTo(SDF.lat, 9)
    expect(points[50].lng).toBeCloseTo(ANC.lng, 9)
  })
})

describe('crossesAntimeridian', () => {
  it('is true where the way west across the date line is shorter: Anchorage to Tokyo, either way', () => {
    expect(crossesAntimeridian(ANC, NRT)).toBe(true)
    expect(crossesAntimeridian(NRT, ANC)).toBe(true)
  })

  it('is false within a hemisphere, and where the way east is shorter: Honolulu to Cologne', () => {
    expect(crossesAntimeridian(SDF, ANC)).toBe(false)
    expect(crossesAntimeridian(HNL, CGN)).toBe(false)
  })
})

describe('mapBounds', () => {
  it('holds the whole route, padded by 15% of its spans', () => {
    const points = routePoints(SDF, ANC)
    const lats = points.map((p) => p.lat)
    const lons = points.map((p) => p.lng)
    const [lat0, lat1, lon0, lon1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)]
    const b = mapBounds(SDF, ANC)
    expect(b.minLat).toBeCloseTo(lat0 - (lat1 - lat0) * 0.15, 9)
    expect(b.maxLat).toBeCloseTo(lat1 + (lat1 - lat0) * 0.15, 9)
    expect(b.minLon).toBeCloseTo(lon0 - (lon1 - lon0) * 0.15, 9)
    expect(b.maxLon).toBeCloseTo(lon1 + (lon1 - lon0) * 0.15, 9)
    expect(b.lonOffset).toBe(0)
  })

  it('widens a route that runs north and south to 0.6 of its height, evenly on both sides', () => {
    const b = mapBounds(SDF, MIA)
    expect((b.maxLon - b.minLon) / (b.maxLat - b.minLat)).toBeCloseTo(0.6, 9)
    expect((b.minLon + b.maxLon) / 2).toBeCloseTo((SDF.lng + MIA.lng) / 2, 9)
  })

  it('counts longitudes on from 180° for a route across the antimeridian, so it draws in one piece', () => {
    const b = mapBounds(ANC, NRT)
    expect(b.lonOffset).toBe(360)
    const xs = routePoints(ANC, NRT).map((p) => project(p, b, W).x)
    expect(xs.every((x, i) => i === 0 || x < xs[i - 1])).toBe(true) // Anchorage on the right, heading west
  })

  it('boxes a route across the antimeridian in those longitudes, padded by 15%', () => {
    const lons = routePoints(ANC, NRT).map((p) => (p.lng < 0 ? p.lng + 360 : p.lng))
    const [lon0, lon1] = [Math.min(...lons), Math.max(...lons)]
    const b = mapBounds(ANC, NRT)
    expect(b.minLon).toBeCloseTo(lon0 - (lon1 - lon0) * 0.15, 9)
    expect(b.maxLon).toBeCloseTo(lon1 + (lon1 - lon0) * 0.15, 9)
  })
})

describe('project', () => {
  it('puts the box’s corners 60 px in from the drawing’s corners, north up', () => {
    const b = { minLat: 10, maxLat: 20, minLon: -100, maxLon: -80, lonOffset: 0 }
    expect(project({ lat: 10, lng: -100 }, b, W)).toEqual({ x: MAP_PADDING, y: MAP_HEIGHT - MAP_PADDING })
    expect(project({ lat: 20, lng: -80 }, b, W)).toEqual({ x: W - MAP_PADDING, y: MAP_PADDING })
  })

  it('puts a place in the middle of an axis with no span', () => {
    const b = { minLat: 10, maxLat: 10, minLon: -90, maxLon: -90, lonOffset: 0 }
    expect(project({ lat: 10, lng: -90 }, b, W)).toEqual({ x: W / 2, y: MAP_HEIGHT / 2 })
  })

  it('keeps the whole route inside the padding', () => {
    for (const [a, b] of [[SDF, ANC], [ANC, NRT], [SDF, MIA], [HNL, CGN]]) {
      const box = mapBounds(a, b)
      for (const p of routePoints(a, b).map((g) => project(g, box, W))) {
        expect(p.x).toBeGreaterThanOrEqual(MAP_PADDING)
        expect(p.x).toBeLessThanOrEqual(W - MAP_PADDING)
        expect(p.y).toBeGreaterThanOrEqual(MAP_PADDING)
        expect(p.y).toBeLessThanOrEqual(MAP_HEIGHT - MAP_PADDING)
      }
    }
  })
})

describe('distanceNm', () => {
  it('is the great-circle distance in nautical miles, rounded down: Anchorage to Louisville is 2,706', () => {
    expect(distanceNm(ANC, SDF)).toBe(2706)
    expect(distanceNm(SDF, ANC)).toBe(2706)
  })

  it('is 60 nautical miles a degree along a meridian, and 0 for the same place', () => {
    expect(distanceNm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBe(60)
    expect(distanceNm(SDF, SDF)).toBe(0)
  })
})

describe('routeArrow', () => {
  const line = Array.from({ length: 51 }, (_, i) => ({ x: 10 + i * 4, y: 100 }))

  it('sits on the middle point, its tip 12 px ahead along the route', () => {
    const arrow = routeArrow(line)
    expect(arrow.tip.x).toBeCloseTo(110 + 12, 9)
    expect(arrow.tip.y).toBeCloseTo(100, 9)
  })

  it('opens its arms 9.6 px back at ±2.5 radians', () => {
    const arrow = routeArrow(line)
    expect(arrow.left.x).toBeCloseTo(110 + 9.6 * Math.cos(2.5), 9)
    expect(arrow.left.y).toBeCloseTo(100 + 9.6 * Math.sin(2.5), 9)
    expect(arrow.right.y).toBeCloseTo(100 - 9.6 * Math.sin(2.5), 9)
  })

  it('sits halfway along a route of two points', () => {
    const arrow = routeArrow([{ x: 0, y: 0 }, { x: 0, y: 40 }])
    expect(arrow.tip.x).toBeCloseTo(0, 9)
    expect(arrow.tip.y).toBeCloseTo(20 + 12, 9) // pointing down
  })
})

describe('planePose', () => {
  const box = mapBounds(ANC, SDF)
  const at = (f: number) => project(greatCirclePoint(ANC, SDF, f), box, W)

  it('puts the plane on the route at its progress, heading toward the point 2% further on', () => {
    const pose = planePose(ANC, SDF, box, W, 0.33)
    expect(pose.at).toEqual(at(0.33))
    const ahead = at(0.35)
    expect(pose.heading).toBeCloseTo((Math.atan2(ahead.y - pose.at.y, ahead.x - pose.at.x) * 180) / Math.PI, 9)
  })

  it('heads toward the point 2% further on from takeoff', () => {
    const pose = planePose(ANC, SDF, box, W, 0)
    expect(pose.at).toEqual(at(0))
    const ahead = at(0.02)
    expect(pose.heading).toBeCloseTo((Math.atan2(ahead.y - pose.at.y, ahead.x - pose.at.x) * 180) / Math.PI, 9)
  })

  it('takes its heading from the point 2% behind when the point ahead is under 1 px away, just before landing', () => {
    const pose = planePose(ANC, SDF, box, W, 0.999)
    const [ahead, behind] = [at(1), at(0.979)]
    expect(Math.hypot(ahead.x - pose.at.x, ahead.y - pose.at.y)).toBeLessThan(1)
    expect(pose.heading).toBeCloseTo((Math.atan2(pose.at.y - behind.y, pose.at.x - behind.x) * 180) / Math.PI, 9)
  })

  it('keeps its heading at landing, from the point 2% behind', () => {
    const pose = planePose(ANC, SDF, box, W, 1)
    const behind = at(0.98)
    expect(pose.heading).toBeCloseTo((Math.atan2(pose.at.y - behind.y, pose.at.x - behind.x) * 180) / Math.PI, 9)
    expect(pose.heading).toBeGreaterThan(0) // Anchorage to Louisville heads east and down the map
    expect(pose.heading).toBeLessThan(90)
  })
})
