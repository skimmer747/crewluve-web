import { describe, expect, it } from 'vitest'
import { copiesFor, linePath, placeAt, polygonsPath, type Viewport } from '../../src/map/svgPaths'

const WORLD: Viewport = { rect: { x: 0, y: 0, width: 1, height: 1 }, width: 360, height: 360 }
const PACIFIC: Viewport = { rect: { x: 0.85, y: 0.2, width: 0.3, height: 0.2 }, width: 300, height: 200 }

describe('paths on screen (moving map spec §11)', () => {
  it('needs only the world copies the view reaches', () => {
    expect(copiesFor(WORLD.rect)).toEqual([0])
    expect(copiesFor(PACIFIC.rect)).toEqual([0, 1])
  })

  it('puts a place where the view shows it, on the copy nearest the middle', () => {
    expect(placeAt({ lat: 0, lng: 0 }, WORLD)).toEqual({ x: 180, y: 180 })
    // Anchorage (150°W) sits right of the date line in a Pacific view, on the next world.
    expect(placeAt({ lat: 61.17, lng: -150 }, PACIFIC).x).toBeGreaterThan(150)
  })

  it('draws a line across the date line in one piece', () => {
    const d = linePath([{ lat: 50, lng: 170 }, { lat: 50, lng: -170 }], PACIFIC)
    const xs = [...d.matchAll(/[ML]([\d.-]+) /g)].map((m) => Number(m[1]))
    expect(Math.abs(xs[1] - xs[0])).toBeLessThan(100)
  })

  it('closes each shape on the copies of the world the view shows it on, and leaves out the rest', () => {
    const square = (lng: number) => [{ lat: 50, lng }, { lat: 50, lng: lng + 5 }, { lat: 45, lng: lng + 5 }, { lat: 45, lng }]
    // West of the date line on the first world, east of it on the next, and Europe, out of the Pacific view, on neither.
    const pacific = polygonsPath([square(170), square(-175), square(0)], PACIFIC)
    expect((pacific.match(/Z/g) ?? []).length).toBe(2)
    expect(pacific.split('Z').map((d) => Number(/M([\d.-]+) /.exec(d)?.[1])).slice(0, 2).every((x) => x > 0 && x < 300)).toBe(true)
    expect((polygonsPath([square(0)], WORLD).match(/Z/g) ?? []).length).toBe(1)
    expect(polygonsPath([], PACIFIC)).toBe('')
  })
})
