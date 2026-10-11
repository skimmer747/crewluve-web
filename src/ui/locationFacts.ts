import { countryFlag } from '../copy/flags'
import { weatherVisual, type WeatherVisual } from '../copy/weather'
import type { AirportIndex } from '../data/airports'
import type { Weather } from '../data/weather'
import { isDaytime, sunTimes, type SunTimes } from '../time/sun'

/** What the location card and the sun popup both show about where the pilot is (slice 2B1 §4, slice 2B2 §4). */
export interface LocationFacts {
  /** The city, the airport's code when the list has no city, or "Unknown Location". */
  city: string
  flag: string | null
  /** The airport's time zone, or null when it isn't known. */
  tz: string | null
  /** Today's sunrise and sunset there, or null when the sun neither rises nor sets, or the airport isn't known. */
  sun: SunTimes | null
  /** The weather's words, icon and color, or null without weather. */
  visual: WeatherVisual | null
}

/** The facts once the place has what the sun dial needs: its zone and today's sun times. */
export type DialFacts = LocationFacts & { tz: string; sun: SunTimes }

/** Whether the location card shows its sun dial, and so whether the sun popup can be open. */
export function showsDial(facts: LocationFacts): facts is DialFacts {
  return facts.tz != null && facts.sun != null
}

export function locationFacts(airport: string | null, now: number, airports: AirportIndex, weather: Weather | null): LocationFacts {
  const info = airports.get(airport)
  const tz = airports.tz(airport)
  const sun = info && tz ? sunTimes(now, info.lat, info.lng, tz) : null
  return {
    city: airports.city(airport) ?? 'Unknown Location',
    flag: countryFlag(info?.country),
    tz,
    sun,
    // Day or night comes from the sun times, so the weather icon always agrees with the dial, as the app's two do.
    // Open-Meteo's is_day is the fallback where the sun neither rises nor sets that day.
    visual: weather ? weatherVisual(weather.code, sun ? isDaytime(now, sun) : weather.isDay) : null,
  }
}
