import { useEffect, useRef, useState } from 'preact/hooks'
import { landingHour, type LandingForecast, type LandingLoader, type TempUnit } from '../../data/weather'
import { flightsToForecast } from '../../facts/landingWeather'
import type { MapLeg, TripMap } from '../../map/tripMap'

/** A landing forecast is kept this long, then fetched again (Stage 2 spec §7.1, §7.2). */
export const LANDING_REFRESH_MS = 30 * 60_000

/** How often a visible page checks whether a forecast has turned 30 minutes old. */
const CHECK_MS = 60_000

/**
 * Landing-hour forecasts by leg id for the flights `flightsToForecast` picks, while `map` is given: the full map is open
 * (Stage 2 spec §7.2). They're kept by airport and hour for 30 minutes, and checked once a minute while the page is
 * visible. A failure is kept as none, so it's tried again only 30 minutes later, never in a rapid loop. `load` never
 * changes, so it's left out of the effect's dependencies, as `useWeather` does.
 */
export function useLandingWeather(map: TripMap | null, now: number, unit: TempUnit, load: LandingLoader): Record<string, LandingForecast> {
  const kept = useRef(new Map<string, { forecast: LandingForecast | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const keyOf = (leg: MapLeg) => `${leg.destination.code}@${landingHour(leg.end)}|${unit}`
  const wanted = map ? flightsToForecast(map, now) : []
  const latest = useRef(wanted)
  latest.current = wanted
  const keys = wanted.map(keyOf).join(' ')
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )

  useEffect(() => {
    if (!keys) return
    const refresh = () => {
      for (const leg of latest.current) {
        const key = keyOf(leg)
        const entry = kept.current.get(key)
        if (pending.current.has(key) || (entry && Date.now() - entry.at < LANDING_REFRESH_MS)) continue
        pending.current.add(key)
        const { code, place, timeZone } = leg.destination
        // Called inside a promise's executor, so a loader that throws at once counts as a failure like any other.
        void new Promise<LandingForecast | null>((resolve) => resolve(load({ code, lat: place.lat, lng: place.lng, tz: timeZone, unit }, leg.end)))
          .catch(() => null)
          .then((forecast) => {
            pending.current.delete(key)
            kept.current.set(key, { forecast, at: Date.now() })
            if (mounted.current) setVersion((v) => v + 1)
          })
      }
    }
    refresh()
    const check = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh()
    }, CHECK_MS)
    return () => clearInterval(check)
  }, [keys])

  const forecasts: Record<string, LandingForecast> = {}
  for (const leg of wanted) {
    const forecast = kept.current.get(keyOf(leg))?.forecast
    if (forecast) forecasts[leg.id] = forecast
  }
  return forecasts
}
