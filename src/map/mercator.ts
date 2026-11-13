import type { GeoPoint } from './greatCircle'

/** The flat map ends at this latitude, north and south, as Apple's does in the app (moving map spec §11). */
export const MAX_LATITUDE = 85.05

/**
 * A place on the flat (Web Mercator) map: x runs from 0 at 180°W to 1 at 180°E, y from 0 at the top edge to 1 at the
 * bottom. One world is 1 by 1. An x outside 0…1 is the same place on another copy of the world.
 */
export interface WorldPoint {
  x: number
  y: number
}

export function toWorld(p: GeoPoint): WorldPoint {
  const lat = (Math.min(Math.max(p.lat, -MAX_LATITUDE), MAX_LATITUDE) * Math.PI) / 180
  return { x: (p.lng + 180) / 360, y: (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2 }
}

/**
 * A line laid out in one piece: each point moved by whole worlds to sit within half a world of the one before. A leg
 * across the date line runs on past the map's edge, and doesn't jump back across the whole map.
 */
export function unwrapped(points: WorldPoint[]): WorldPoint[] {
  const laid: WorldPoint[] = []
  for (const p of points) {
    const before = laid[laid.length - 1]
    laid.push(before ? { x: p.x + Math.round(before.x - p.x), y: p.y } : p)
  }
  return laid
}
