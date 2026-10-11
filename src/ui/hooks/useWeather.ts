import { useEffect, useRef, useState } from 'preact/hooks'
import type { Weather, WeatherLoader, WeatherPlace } from '../../data/weather'

/** How long weather is kept, and how often it's fetched again: 15 minutes, like the app's WeatherService cache. */
export const WEATHER_REFRESH_MS = 15 * 60_000

/**
 * The current weather at `place`, or null while it loads or when there's none (slice 2B1 §6). Results stay in memory
 * for each airport and unit. A new airport fetches at once, unless it was fetched less than 15 minutes ago. Then it
 * fetches every 15 minutes while the page is visible, and on a return to the page once its weather is stale. A
 * failure is kept as "none" too, so it's tried again only at the next of those, never in a rapid loop.
 */
export function useWeather(place: WeatherPlace | null, load: WeatherLoader, refreshMs = WEATHER_REFRESH_MS): Weather | null {
  const kept = useRef(new Map<string, { weather: Weather | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const key = place ? `${place.code}|${place.unit}` : null

  useEffect(() => {
    // This runs again whenever the airport or unit changes, so `place` and `load` here always belong to `key`.
    if (!place || !key) return
    let alive = true
    const refresh = (force: boolean) => {
      const entry = kept.current.get(key)
      if (pending.current.has(key) || (!force && entry && Date.now() - entry.at < refreshMs)) return
      pending.current.add(key)
      void load(place)
        .catch(() => null)
        .then((weather) => {
          pending.current.delete(key)
          kept.current.set(key, { weather, at: Date.now() })
          if (alive) setVersion((v) => v + 1)
        })
    }
    refresh(false)
    const tick = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh(true)
    }, refreshMs)
    const onReturn = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      alive = false
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [key, refreshMs])

  return key ? (kept.current.get(key)?.weather ?? null) : null
}
