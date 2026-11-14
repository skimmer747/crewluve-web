import { useEffect, useState } from 'preact/hooks'
import type { Comparison } from '../../facts/comparisons'
import { loadComparisons, loadGeography } from '../../facts/factsData'
import { EMPTY_GEOGRAPHY, type Geography } from '../../facts/geography'

/** One download of each per page, shared by the card and the full map. A failed one is tried again the next time it's wanted. */
let geography: Promise<Geography> | null = null
let comparisons: Promise<Comparison[]> | null = null

/** What `start` gives once `enabled` has been true, else null. `start` stays out of the dependencies: it never changes. */
function useLoaded<T>(enabled: boolean, start: () => Promise<T>): T | null {
  const [value, setValue] = useState<T | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    void start().then((loaded) => {
      if (live) setValue(loaded)
    })
    return () => {
      live = false
    }
  }, [enabled])
  return value
}

/**
 * The trip map's geography once it has loaded, else null (Stage 2 spec §10). Nothing is fetched until `enabled`: a
 * flight in the air, or the full map open. If it can't be had, it's logged and the geography is empty, so the facts go
 * on without places (§11).
 */
export function useGeography(enabled: boolean): Geography | null {
  return useLoaded(enabled, () =>
    (geography ??= loadGeography().catch((err: unknown) => {
      console.error('Could not load the trip map’s geography', err)
      geography = null
      return EMPTY_GEOGRAPHY
    })))
}

/** The comparisons once loaded, else null, fetched only when `enabled`: the full map open. If they can't be had, none (§10). */
export function useComparisons(enabled: boolean): Comparison[] | null {
  return useLoaded(enabled, () =>
    (comparisons ??= loadComparisons().catch((err: unknown) => {
      console.error('Could not load the trip map’s comparisons', err)
      comparisons = null
      return []
    })))
}
