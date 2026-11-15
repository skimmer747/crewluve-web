import { HOUR } from '../time/zoned'

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

/** Regions where Apple's weather format, which the app uses, gives Fahrenheit (slice 2B1 §6). Everywhere else gets Celsius. */
const FAHRENHEIT_REGIONS = new Set(['US', 'PR', 'BS', 'BZ', 'KY', 'PW'])

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

/** How long to wait for Open-Meteo. fetch never gives up by itself, and a stalled request would hold up every later refresh. */
export const WEATHER_TIMEOUT_MS = 10_000

/**
 * The current weather from Open-Meteo, or null when it can't be had within 10 seconds. A plain GET that sends no cookies
 * and no referrer, and that the browser never caches (slice 2B1 §6, §7). Tests pass their own `fetch`; the parameter
 * keeps that name so the source rules (tests/fixtures/sourceScan.ts) still check this call.
 */
export async function fetchWeather(lat: number, lng: number, unit: TempUnit, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<Weather | null> {
  // A timer and an AbortController rather than AbortSignal.timeout, which iOS 15 lacks. Aborting stops a stalled body too.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)
  try {
    const res = await fetch(weatherUrl(lat, lng, unit), {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    return res.ok ? parseWeather(await res.json()) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The live loader: Open-Meteo, at the airport's coordinates. */
export const loadLiveWeather: WeatherLoader = (place) => fetchWeather(place.lat, place.lng, place.unit)

/** The forecast for the hour a flight lands (Stage 2 spec §7): degrees in `unit`, and the sky. */
export interface LandingForecast {
  temperature: number
  unit: TempUnit
  code: WeatherCode
}

/** Where landing forecasts come from: Open-Meteo when live, made-up samples in the demo. Resolves to null when there's none. */
export type LandingLoader = (place: WeatherPlace, landing: number) => Promise<LandingForecast | null>

/** The hour holding `landing`, as Open-Meteo names hours in GMT: "2026-11-14T02:00". */
export function landingHour(landing: number): string {
  return new Date(Math.floor(landing / HOUR) * HOUR).toISOString().slice(0, 16)
}

/** The request for one hour of an airport's hourly forecast, the hour holding the landing (Stage 2 spec §7.1). */
export function landingForecastUrl(lat: number, lng: number, unit: TempUnit, landing: number): string {
  const hour = landingHour(landing)
  return `${OPEN_METEO_URL}/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&hourly=temperature_2m,weather_code` +
    `&temperature_unit=${unit}&timezone=GMT&start_hour=${hour}&end_hour=${hour}`
}

/** Open-Meteo's reply for one hour, checked: a finite temperature and a code the site has words for. Anything else is null. */
export function parseLandingForecast(body: unknown, unit: TempUnit): LandingForecast | null {
  const hourly = field(body, 'hourly')
  const temperatures = field(hourly, 'temperature_2m')
  const codes = field(hourly, 'weather_code')
  const temperature: unknown = Array.isArray(temperatures) ? temperatures[0] : undefined
  const code: unknown = Array.isArray(codes) ? codes[0] : undefined
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) || !isWeatherCode(code)) return null
  return { temperature, unit, code }
}

/**
 * The landing hour's forecast from Open-Meteo, or null when it can't be had within 10 seconds: a plain GET with no
 * cookies or referrer that the browser never caches, as `fetchWeather` sends. Tests pass their own `fetch`.
 */
export async function fetchLandingForecast(
  lat: number, lng: number, unit: TempUnit, landing: number, fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<LandingForecast | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)
  try {
    const res = await fetch(landingForecastUrl(lat, lng, unit, landing), {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })
    return res.ok ? parseLandingForecast(await res.json(), unit) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** The live landing loader: Open-Meteo, at the airport's coordinates. */
export const loadLiveLandingForecast: LandingLoader = (place, landing) => fetchLandingForecast(place.lat, place.lng, place.unit, landing)
