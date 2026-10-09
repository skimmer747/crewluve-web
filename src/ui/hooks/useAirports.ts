import { useEffect, useState } from 'preact/hooks'
import { buildAirportIndex, loadAirports, type AirportIndex } from '../../data/airports'

/**
 * The airport list. If it won't load, an empty index at once, so the screen shows airport codes instead
 * of city names (spec §8). Then one more try after `retryMs`, which swaps in the city names if it works.
 * On a slow link the screen shouldn't stay blank while the list downloads (spec §5: the cached schedule
 * renders at once), so after `slowMs` it shows codes until the list arrives.
 */
export function useAirports(retryMs = 3000, slowMs = 300): AirportIndex | null {
  const [index, setIndex] = useState<AirportIndex | null>(null)
  useEffect(() => {
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const show = (airports: AirportIndex) => {
      if (alive) setIndex(airports)
    }
    const slow = setTimeout(() => {
      if (alive) setIndex((current) => current ?? buildAirportIndex([]))
    }, slowMs)
    loadAirports()
      .then(show)
      .catch(() => {
        show(buildAirportIndex([]))
        if (alive) retry = setTimeout(() => void loadAirports().then(show).catch(() => {}), retryMs)
      })
    return () => {
      alive = false
      clearTimeout(slow)
      clearTimeout(retry)
    }
  }, [retryMs, slowMs])
  return index
}
