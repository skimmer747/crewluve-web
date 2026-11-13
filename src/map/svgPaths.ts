import type { GeoPoint } from './greatCircle'
import type { WorldRect } from './mapFit'
import { toWorld, unwrapped, type WorldPoint } from './mercator'

/** The trip map's world shapes and lines as SVG paths in a view (moving map spec §11). */

/** What the view shows (`rect`, in world units) and its size on screen, in px. */
export interface Viewport {
  rect: WorldRect
  width: number
  height: number
}

const round = (v: number) => Math.round(v * 10) / 10

function toScreen(p: WorldPoint, v: Viewport): { x: number; y: number } {
  return { x: round(((p.x - v.rect.x) / v.rect.width) * v.width), y: round(((p.y - v.rect.y) / v.rect.height) * v.height) }
}

/** The copies of the world the view reaches: 0 is the first, 1 the next one east. */
export function copiesFor(rect: WorldRect): number[] {
  const copies: number[] = []
  for (let k = Math.floor(rect.x); k < rect.x + rect.width; k++) copies.push(k)
  return copies
}

/** The world copy that puts `x` nearest the middle of the view. */
const nearMiddle = (x: number, rect: WorldRect) => x + Math.round(rect.x + rect.width / 2 - x)

/** Where a place is on screen, on the copy of the world nearest the middle of the view. */
export function placeAt(place: GeoPoint, v: Viewport): { x: number; y: number } {
  const p = toWorld(place)
  return toScreen({ x: nearMiddle(p.x, v.rect), y: p.y }, v)
}

/** A line through `points`, laid out in one piece across the date line, on the copy nearest the middle. */
export function linePath(points: GeoPoint[], v: Viewport): string {
  if (points.length === 0) return ''
  const laid = unwrapped(points.map(toWorld))
  const middle = laid[Math.floor(laid.length / 2)].x
  const shift = nearMiddle(middle, v.rect) - middle
  return laid.map((p, i) => {
    const s = toScreen({ x: p.x + shift, y: p.y }, v)
    return `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`
  }).join(' ')
}

/**
 * Closed shapes on every copy of the world the view reaches, as one path. A shape wholly outside the view is left out:
 * zoomed in on one leg, nearly all the world's land is, and drawing it would make a path of tens of kilobytes.
 */
export function polygonsPath(polygons: GeoPoint[][], v: Viewport): string {
  const parts: string[] = []
  const { rect } = v
  const copies = copiesFor(rect)
  for (const polygon of polygons) {
    if (polygon.length < 3) continue
    const world = polygon.map(toWorld)
    const ys = world.map((p) => p.y)
    if (Math.max(...ys) < rect.y || Math.min(...ys) > rect.y + rect.height) continue
    const xs = world.map((p) => p.x)
    const west = Math.min(...xs)
    const east = Math.max(...xs)
    for (const k of copies) {
      if (east + k < rect.x || west + k > rect.x + rect.width) continue
      parts.push(world.map((p, i) => {
        const s = toScreen({ x: p.x + k, y: p.y }, v)
        return `${i === 0 ? 'M' : 'L'}${s.x} ${s.y}`
      }).join(' ') + ' Z')
    }
  }
  return parts.join(' ')
}
