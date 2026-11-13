import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '../../src/map/greatCircle'
import { MAX_LATITUDE } from '../../src/map/mercator'
import { nightLayers, nightRegion, SUN_DEPTHS } from '../../src/map/nightShade'
import { subsolarPoint, sunAltitude } from '../../src/time/sun'

const utc = (y: number, mo: number, d: number, h: number, mi = 0) => Date.UTC(y, mo - 1, d, h, mi)
const DATES: [number, number, number][] = [[2026, 3, 20], [2026, 6, 21], [2026, 9, 23], [2026, 11, 15], [2026, 12, 21], [2026, 2, 10], [2026, 5, 1]]

// The tests keep their own flat-map y, so they fill the shapes the way the map does without leaning on code under test.
const flatY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
type Edge = [ya: number, xa: number, yb: number, xb: number]

function edgesOf(shapes: GeoPoint[][]): Edge[] {
  const edges: Edge[] = []
  for (const shape of shapes) {
    const ys = shape.map((p) => flatY(p.lat))
    shape.forEach((p, i) => {
      const next = (i + 1) % shape.length
      edges.push([ys[i], p.lng, ys[next], shape[next].lng])
    })
  }
  return edges
}

/** Where the edges cross one line of latitude, west to east. */
const crossings = (edges: Edge[], y: number) =>
  edges.filter(([ya, , yb]) => ya > y !== yb > y).map(([ya, xa, yb, xb]) => xa + ((y - ya) / (yb - ya)) * (xb - xa)).sort((a, b) => a - b)

/** A place is inside when an odd number of edges lie to its east. */
const shadedAt = (lng: number, cross: number[]) => cross.filter((c) => c > lng).length % 2 === 1
const isShaded = (lat: number, lng: number, shapes: GeoPoint[][]) => shadedAt(lng, crossings(edgesOf(shapes), flatY(lat)))
const night = (t: number) => {
  const sun = subsolarPoint(t)
  return nightRegion(0, sun.declination, sun.longitude)
}
const steps = (from: number, to: number, by: number, offset: number) => {
  const out: number[] = []
  for (let v = from; v < to; v += by) out.push(v + offset)
  return out
}

describe('night shapes (moving map spec §7.1)', () => {
  it('shade exactly where the sun is below each layer, every hour of seven dates', () => {
    const latitudes = steps(-84, 84, 6, 0.37)
    const longitudes = steps(-180, 180, 6, 0.41)
    let checked = 0
    let wrong = 0
    for (const [y, m, d] of DATES) {
      for (let hour = 0; hour < 24; hour++) {
        const t = utc(y, m, d, hour, 17)
        const sun = subsolarPoint(t)
        for (const depth of SUN_DEPTHS) {
          const edges = edgesOf(nightRegion(depth, sun.declination, sun.longitude))
          for (const lat of latitudes) {
            const cross = crossings(edges, flatY(lat))
            for (const lng of longitudes) {
              const altitude = sunAltitude(t, lat, lng)
              if (Math.abs(altitude + depth) < 0.3) continue
              checked++
              if (shadedAt(lng, cross) !== altitude < -depth) wrong++
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1_500_000)
    expect(wrong).toBe(0)
    // About two million places: a second alone, and longer while the whole suite runs beside it.
  }, 30_000)

  it('stay inside the map, with no edge across the date line', () => {
    // Points are counted, not asserted one by one: a few million `expect`s would take seconds.
    let points = 0
    let outside = 0
    for (const [y, m, d] of DATES) {
      for (let hour = 0; hour < 24; hour++) {
        const layers = nightLayers(utc(y, m, d, hour, 17))
        expect(layers).toHaveLength(SUN_DEPTHS.length)
        for (const shapes of layers) {
          expect(shapes.length === 1 || shapes.length === 2).toBe(true)
          for (const shape of shapes) {
            expect(shape.length).toBeGreaterThanOrEqual(3)
            shape.forEach((p, i) => {
              const next = shape[(i + 1) % shape.length]
              points++
              if (Math.abs(p.lat) > MAX_LATITUDE || Math.abs(p.lng) > 180 || Math.abs(next.lng - p.lng) >= 180) outside++
            })
          }
        }
      }
    }
    expect(points).toBeGreaterThan(100_000)
    expect(outside).toBe(0)
  })

  it('shade polar night all the way round', () => {
    const december = night(utc(2026, 12, 21, 12))
    const june = night(utc(2026, 6, 21, 12))
    for (let lng = -179.5; lng < 180; lng += 30) {
      expect(isShaded(80, lng, december)).toBe(true)
      expect(isShaded(-80, lng, december)).toBe(false)
      expect(isShaded(-80, lng, june)).toBe(true)
      expect(isShaded(80, lng, june)).toBe(false)
    }
  })

  it('shade the far half when the sun is over the equator at Greenwich', () => {
    const shapes = nightRegion(0, 0, 0)
    expect(shapes).toHaveLength(1)
    expect(isShaded(10, 179, shapes)).toBe(true)
    expect(isShaded(10, -179, shapes)).toBe(true)
    expect(isShaded(10, 95, shapes)).toBe(true)
    expect(isShaded(10, 0, shapes)).toBe(false)
    expect(isShaded(10, 85, shapes)).toBe(false)
  })

  it('nest, each deeper layer inside the one before', () => {
    const latitudes = steps(-84, 84, 7, 0.37)
    const longitudes = steps(-180, 180, 7, 0.41)
    for (const t of [utc(2026, 3, 20, 9, 17), utc(2026, 6, 21, 3, 17), utc(2026, 11, 15, 13, 51), utc(2026, 12, 21, 22, 17)]) {
      const layers = nightLayers(t).map(edgesOf)
      for (const lat of latitudes) {
        const rows = layers.map((edges) => crossings(edges, flatY(lat)))
        for (const lng of longitudes) {
          for (let deeper = 1; deeper < rows.length; deeper++) {
            if (shadedAt(lng, rows[deeper])) expect(shadedAt(lng, rows[deeper - 1])).toBe(true)
          }
        }
      }
    }
  })
})
