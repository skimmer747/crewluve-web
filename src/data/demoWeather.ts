import { isDaytime, sunTimes } from '../time/sun'
import type { WeatherCode, WeatherLoader } from './weather'

/** Made-up weather for every airport in the demo (slice 2B1 §6), in °F. The demo never calls Open-Meteo. */
const SAMPLES = new Map<string, { fahrenheit: number; code: WeatherCode }>([
  ['LEX', { fahrenheit: 58, code: 0 }],
  ['SDF', { fahrenheit: 66, code: 0 }],
  ['MIA', { fahrenheit: 84, code: 2 }],
  ['RFD', { fahrenheit: 61, code: 3 }],
  ['ANC', { fahrenheit: 41, code: 3 }],
  ['MCO', { fahrenheit: 79, code: 2 }],
  ['ONT', { fahrenheit: 75, code: 0 }],
])

/** The demo's loader: the airport's sample in the visitor's unit, with day or night from the sun right now. */
export const loadDemoWeather: WeatherLoader = async (place) => {
  const sample = SAMPLES.get(place.code)
  if (!sample) return null
  const now = Date.now()
  const sun = place.tz ? sunTimes(now, place.lat, place.lng, place.tz) : null
  return {
    temperature: place.unit === 'fahrenheit' ? sample.fahrenheit : ((sample.fahrenheit - 32) * 5) / 9,
    code: sample.code,
    isDay: sun ? isDaytime(now, sun) : true,
  }
}
