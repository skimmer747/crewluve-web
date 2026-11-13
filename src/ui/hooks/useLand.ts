import { useEffect, useState } from 'preact/hooks'
import type { GeoPoint } from '../../map/greatCircle'
import { loadLand } from '../../map/land'

/** One download per page, shared by the card and the full map. */
let land: Promise<GeoPoint[][]> | null = null

/** The world's land once it has loaded, else null: the map draws ocean only until then, or if it never loads. */
export function useLand(): GeoPoint[][] | null {
  const [rings, setRings] = useState<GeoPoint[][] | null>(null)
  useEffect(() => {
    let live = true
    land ??= loadLand().catch((err: unknown) => {
      console.error('Could not load the map’s land', err)
      land = null
      return []
    })
    void land.then((r) => {
      if (live) setRings(r)
    })
    return () => {
      live = false
    }
  }, [])
  return rings
}
