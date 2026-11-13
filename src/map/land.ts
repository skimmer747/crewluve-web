import type { GeoPoint } from './greatCircle'

/** The world's land for the trip map (moving map spec §11): public/data/land.json, made by `npm run land`. */

const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

/** Rings of [lng, lat] as places. Anything else in the file is left out rather than drawn wrong. */
export function parseLand(rows: unknown[]): GeoPoint[][] {
  return rows
    .filter((ring): ring is [number, number][] => Array.isArray(ring) && ring.length >= 4 && ring.every(isPair))
    .map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
}

export async function loadLand(url = `${import.meta.env.BASE_URL}data/land.json`): Promise<GeoPoint[][]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`land.json ${res.status}`)
  return parseLand((await res.json()) as unknown[])
}
