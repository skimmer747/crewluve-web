/** Open-Meteo's forecast service (slice 2B1 §6): free, keyless and worldwide. vite.config.ts adds it to the CSP's connect-src. */
export const OPEN_METEO_URL = 'https://api.open-meteo.com'

export type TempUnit = 'fahrenheit' | 'celsius'

/** The WMO weather codes Open-Meteo reports. src/copy/weather.ts has words and an icon for each; any other code counts as no weather. */
export const WEATHER_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99] as const

export type WeatherCode = (typeof WEATHER_CODES)[number]

/** The current weather at an airport. */
export interface Weather {
  /** Degrees, in the unit that was asked for. */
  temperature: number
  code: WeatherCode
  /** Open-Meteo's is_day: at night the clear-sky icons become moons. */
  isDay: boolean
}

/** The airport to get the weather for, and the unit to show it in. */
export interface WeatherPlace {
  code: string
  lat: number
  lng: number
  /** The airport's time zone, or null when this browser doesn't know it. The demo uses it to tell day from night. */
  tz: string | null
  unit: TempUnit
}

/** Where weather comes from: Open-Meteo when live, made-up samples in the demo. Resolves to null when there's none. */
export type WeatherLoader = (place: WeatherPlace) => Promise<Weather | null>

/** Regions that use Fahrenheit (slice 2B1 §6). Everywhere else gets Celsius. */
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH'])

/** The visitor's unit, from the region of their language setting. A bare language fills in its usual region: "en" means the US. */
export function tempUnitFor(locale: string = navigator.language): TempUnit {
  try {
    const region = new Intl.Locale(locale).maximize().region
    return region !== undefined && FAHRENHEIT_REGIONS.has(region) ? 'fahrenheit' : 'celsius'
  } catch {
    return 'celsius'
  }
}

/** The request for one airport: its coordinates rounded to 2 decimals, the three current values the card shows, and the unit. */
export function weatherUrl(lat: number, lng: number, unit: TempUnit): string {
  return `${OPEN_METEO_URL}/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=temperature_2m,weather_code,is_day&temperature_unit=${unit}`
}

const field = (value: unknown, key: string): unknown =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined

const isWeatherCode = (value: unknown): value is WeatherCode => (WEATHER_CODES as readonly unknown[]).includes(value)

/** Open-Meteo's reply, checked: a finite temperature, a code the site has words for, and is_day 0 or 1. Anything else is null. */
export function parseWeather(body: unknown): Weather | null {
  const current = field(body, 'current')
  const temperature = field(current, 'temperature_2m')
  const code = field(current, 'weather_code')
  const isDay = field(current, 'is_day')
  if (typeof temperature !== 'number' || !Number.isFinite(temperature)) return null
  if (!isWeatherCode(code) || (isDay !== 0 && isDay !== 1)) return null
  return { temperature, code, isDay: isDay === 1 }
}

/**
 * The current weather from Open-Meteo, or null when it can't be had. A plain GET that sends no cookies and no referrer
 * (slice 2B1 §7). Tests pass their own `fetch`; the parameter keeps that name so the read-only scan still checks this call.
 */
export async function fetchWeather(lat: number, lng: number, unit: TempUnit, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<Weather | null> {
  try {
    const res = await fetch(weatherUrl(lat, lng, unit), { credentials: 'omit', referrerPolicy: 'no-referrer' })
    return res.ok ? parseWeather(await res.json()) : null
  } catch {
    return null
  }
}

/** The live loader: Open-Meteo, at the airport's coordinates. */
export const loadLiveWeather: WeatherLoader = (place) => fetchWeather(place.lat, place.lng, place.unit)
