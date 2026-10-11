import { useEffect, useRef, useState } from 'preact/hooks'
import type { Weather, WeatherLoader, WeatherPlace } from '../../data/weather'

/** How long weather is kept before it's fetched again: 15 minutes, like the app's WeatherService cache. */
export const WEATHER_REFRESH_MS = 15 * 60_000

/** How often a visible page checks whether its weather has turned 15 minutes old: it's never more than this late. */
export const WEATHER_CHECK_MS = 60_000

/**
 * The current weather at `place`, or null while it loads or when there's none (slice 2B1 §6). Results stay in memory
 * for each airport and unit. A new airport fetches at once, unless its weather is less than 15 minutes old. While the
 * page is visible it checks once a minute and fetches again when the weather turns 15 minutes old, so it's never
 * more than about 16 minutes old; a return to the page fetches stale weather at once. A failure is kept as "none"
 * too, so it's tried again only 15 minutes later, never in a rapid loop.
 */
export function useWeather(place: WeatherPlace | null, load: WeatherLoader, refreshMs = WEATHER_REFRESH_MS): Weather | null {
  const kept = useRef(new Map<string, { weather: Weather | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const key = place ? `${place.code}|${place.unit}` : null
  // What's on screen now, and whether the screen is still up: an answer redraws when it's for the airport shown,
  // even one the visitor left and came back to while the answer was on its way.
  const shown = useRef(key)
  shown.current = key
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  useEffect(() => {
    // This runs again whenever the airport or unit changes, so `place` here always belongs to `key`. `place` and `load`
    // stay out of the dependencies on purpose: the screen passes a new but equal place every second, and its loader
    // never changes.
    if (!place || !key) return
    /** Fetches when there's no weather for this airport or it's at least 15 minutes old, unless a request is already out. */
    const refresh = () => {
      const entry = kept.current.get(key)
      if (pending.current.has(key) || (entry && Date.now() - entry.at < refreshMs)) return
      pending.current.add(key)
      // Called inside a promise's executor, so a loader that throws at once counts as a failure like any other.
      void new Promise<Weather | null>((resolve) => resolve(load(place)))
        .catch(() => null)
        .then((weather) => {
          pending.current.delete(key)
          kept.current.set(key, { weather, at: Date.now() })
          if (mounted.current && shown.current === key) setVersion((v) => v + 1)
        })
    }
    refresh()
    const check = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh()
    }, WEATHER_CHECK_MS)
    const onReturn = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      clearInterval(check)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [key, refreshMs])

  return key ? (kept.current.get(key)?.weather ?? null) : null
}
