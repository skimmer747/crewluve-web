import { useEffect, useRef, useState } from 'preact/hooks'
import { landingHour, type LandingForecast, type LandingLoader, type TempUnit } from '../../data/weather'
import { flightsToForecast, takeoffToFetch } from '../../facts/landingWeather'
import type { AirportMark, TripMap } from '../../map/tripMap'

/** A landing forecast is kept this long, then fetched again (Stage 2 spec §7.1, §7.2). */
export const LANDING_REFRESH_MS = 30 * 60_000

/** How often a visible page checks whether a forecast has turned 30 minutes old. */
const CHECK_MS = 60_000

/** One hour's weather to fetch: at `airport`, in the hour holding `at`, given back under `legId`. */
interface HourWanted {
  legId: string
  airport: AirportMark
  at: number
}

/**
 * Landing-hour forecasts by leg id for the flights `flightsToForecast` picks, while `map` is given: the full map is open
 * (Stage 2 spec §7.2).
 */
export function useLandingWeather(map: TripMap | null, now: number, unit: TempUnit, load: LandingLoader): Record<string, LandingForecast> {
  const wanted = map ? flightsToForecast(map, now).map((leg) => ({ legId: leg.id, airport: leg.destination, at: leg.end })) : []
  return useHourWeather(wanted, unit, load)
}

/**
 * The weather in the hour the flight in the air took off, at its departure airport, by leg id, while `map` is given: the
 * full map is open (time labels design §3.3). Open-Meteo tells a past hour as it tells a coming one. Only the flight in
 * the air is asked about, but each answer is kept, as the app's LandingWeather keeps them: the takeoff row still shows
 * once the plane is down, until the gate, and its weather line stays with it.
 */
export function useTakeoffWeather(map: TripMap | null, now: number, unit: TempUnit, load: LandingLoader): Record<string, LandingForecast> {
  const flight = map ? takeoffToFetch(map, now) : null
  const wanted = flight ? [{ legId: flight.leg.id, airport: flight.leg.origin, at: flight.takeoff.time }] : []
  const fetched = useHourWeather(wanted, unit, load)
  const kept = useRef<Record<string, LandingForecast>>({})
  Object.assign(kept.current, fetched)
  return { ...kept.current }
}

/**
 * The forecasts for `wanted`, by leg id. They're kept by airport and hour for 30 minutes, and checked once a minute while
 * the page is visible. A failure is kept too, so it's tried again only 30 minutes later, never in a rapid loop. `load`
 * never changes, so it's left out of the effect's dependencies, as `useWeather` does.
 */
function useHourWeather(wanted: HourWanted[], unit: TempUnit, load: LandingLoader): Record<string, LandingForecast> {
  const kept = useRef(new Map<string, { forecast: LandingForecast | null; at: number }>())
  const pending = useRef(new Set<string>())
  const [, setVersion] = useState(0)
  const keyOf = (hour: HourWanted) => `${hour.airport.code}@${landingHour(hour.at)}|${unit}`
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
      for (const hour of latest.current) {
        const key = keyOf(hour)
        const entry = kept.current.get(key)
        if (pending.current.has(key) || (entry && Date.now() - entry.at < LANDING_REFRESH_MS)) continue
        pending.current.add(key)
        const { code, place, timeZone } = hour.airport
        // Called inside a promise's executor, so a loader that throws at once counts as a failure like any other.
        void new Promise<LandingForecast | null>((resolve) => resolve(load({ code, lat: place.lat, lng: place.lng, tz: timeZone, unit }, hour.at)))
          .catch(() => null)
          .then((forecast) => {
            pending.current.delete(key)
            // A failed refresh keeps the forecast already shown, as the app's LandingWeather does, and tries again in 30 minutes.
            kept.current.set(key, { forecast: forecast ?? kept.current.get(key)?.forecast ?? null, at: Date.now() })
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
  for (const hour of wanted) {
    const forecast = kept.current.get(keyOf(hour))?.forecast
    if (forecast) forecasts[hour.legId] = forecast
  }
  return forecasts
}
