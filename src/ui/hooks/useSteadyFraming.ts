import { useRef } from 'preact/hooks'
import type { GeoPoint } from '../../map/greatCircle'
import { framesAll } from '../../map/mapFit'

/**
 * The places the camera frames, held while the same thing is framed (`what`: the leg in focus or the whole trip) and
 * `framing` stays inside their frame, as the app's card frames a real path again only once it grows past its frame
 * (Stage 3 spec §6.2). Recenter frames the held places, which hold every place of the path. Without a real path the
 * places never change, so nothing does.
 */
export function useSteadyFraming(framing: GeoPoint[], what: string): GeoPoint[] {
  const kept = useRef<{ what: string; framing: GeoPoint[] } | null>(null)
  const held = kept.current
  if (!held || held.what !== what || !framesAll(held.framing, framing)) kept.current = { what, framing }
  return kept.current!.framing
}
