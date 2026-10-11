import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeather, loadLiveWeather, parseWeather, tempUnitFor, weatherUrl } from '../../src/data/weather'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A stand-in for fetch that records each request and answers with `reply`. */
function fakeFetch(reply: { ok?: boolean; body?: unknown; fails?: boolean; badJson?: boolean }) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    if (reply.fails) throw new TypeError('Failed to fetch')
    return {
      ok: reply.ok ?? true,
      json: async () => {
        if (reply.badJson) throw new SyntaxError('Unexpected token')
        return reply.body
      },
    } as Response
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

const reply = (current: Record<string, unknown>) => ({ latitude: 61.18, longitude: -150, current: { time: '2026-10-10T20:15', interval: 900, ...current } })

describe('weatherUrl', () => {
  it('asks Open-Meteo for the current temperature, condition and daylight at the rounded coordinates, in the unit', () => {
    expect(weatherUrl(38.1746, -85.7382, 'fahrenheit')).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=38.17&longitude=-85.74&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit',
    )
    expect(weatherUrl(-33.9461, 151.1772, 'celsius')).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=-33.95&longitude=151.18&current=temperature_2m,weather_code,is_day&temperature_unit=celsius',
    )
  })
})

describe('parseWeather', () => {
  it('reads the temperature, the code and whether it is day', () => {
    expect(parseWeather(reply({ temperature_2m: 41.2, weather_code: 3, is_day: 1 }))).toEqual({ temperature: 41.2, code: 3, isDay: true })
    expect(parseWeather(reply({ temperature_2m: -4, weather_code: 0, is_day: 0 }))).toEqual({ temperature: -4, code: 0, isDay: false })
  })

  it.each([
    ['no current block', { latitude: 1 }],
    ['nothing at all', null],
    ['a missing temperature', reply({ weather_code: 3, is_day: 1 })],
    ['a temperature as text', reply({ temperature_2m: '41', weather_code: 3, is_day: 1 })],
    ['a temperature that is not a number', reply({ temperature_2m: Number.NaN, weather_code: 3, is_day: 1 })],
    ['an endless temperature', reply({ temperature_2m: Number.POSITIVE_INFINITY, weather_code: 3, is_day: 1 })],
    ['an unknown code', reply({ temperature_2m: 41, weather_code: 4, is_day: 1 })],
    ['a code as text', reply({ temperature_2m: 41, weather_code: '3', is_day: 1 })],
    ['a missing is_day', reply({ temperature_2m: 41, weather_code: 3 })],
    ['an is_day other than 0 or 1', reply({ temperature_2m: 41, weather_code: 3, is_day: 2 })],
  ])('gives null for %s', (_name, body) => {
    expect(parseWeather(body)).toBeNull()
  })
})

describe('fetchWeather', () => {
  it('sends a plain GET that is never cached and carries no cookies or referrer, and returns the weather', async () => {
    const { fetch, calls } = fakeFetch({ body: reply({ temperature_2m: 41.2, weather_code: 3, is_day: 1 }) })
    expect(await fetchWeather(61.1744, -149.9983, 'fahrenheit', fetch)).toEqual({ temperature: 41.2, code: 3, isDay: true })
    expect(calls).toEqual([
      { url: weatherUrl(61.1744, -149.9983, 'fahrenheit'), init: { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' } },
    ])
  })

  it.each([
    ['an error status', { ok: false, body: reply({ temperature_2m: 41, weather_code: 3, is_day: 1 }) }],
    ['a network failure', { fails: true }],
    ['a reply that is not JSON', { badJson: true }],
    ['a reply it cannot read', { body: { error: true, reason: 'Parameter missing' } }],
  ])('gives null for %s', async (_name, answer) => {
    expect(await fetchWeather(61.17, -150, 'celsius', fakeFetch(answer).fetch)).toBeNull()
  })
})

describe('loadLiveWeather', () => {
  it('fetches at the airport’s coordinates, in the visitor’s unit', async () => {
    const { fetch, calls } = fakeFetch({ body: reply({ temperature_2m: 5.1, weather_code: 3, is_day: 1 }) })
    vi.stubGlobal('fetch', fetch)
    const weather = await loadLiveWeather({ code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: 'celsius' })
    expect(weather).toEqual({ temperature: 5.1, code: 3, isDay: true })
    expect(calls.map((c) => c.url)).toEqual([weatherUrl(61.1744, -149.9983, 'celsius')])
  })
})

describe('tempUnitFor', () => {
  // Apple's weather format uses Fahrenheit in the US, Puerto Rico, the Bahamas, Belize, the Cayman Islands and Palau.
  it.each([
    ['en-US', 'fahrenheit'],
    ['en', 'fahrenheit'],
    ['es-US', 'fahrenheit'],
    ['es-PR', 'fahrenheit'],
    ['en-BS', 'fahrenheit'],
    ['en-BZ', 'fahrenheit'],
    ['en-KY', 'fahrenheit'],
    ['en-PW', 'fahrenheit'],
    ['en-LR', 'celsius'],
    ['my', 'celsius'],
    ['en-GB', 'celsius'],
    ['en-CA', 'celsius'],
    ['de', 'celsius'],
    ['ja-JP', 'celsius'],
  ])('%s uses %s', (locale, unit) => {
    expect(tempUnitFor(locale)).toBe(unit)
  })

  it('reads the browser’s language setting when given none', () => {
    vi.stubGlobal('navigator', { language: 'en-GB' })
    expect(tempUnitFor()).toBe('celsius')
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(tempUnitFor()).toBe('fahrenheit')
  })

  it('falls back to Celsius for a language setting it cannot read', () => {
    expect(tempUnitFor('')).toBe('celsius')
    expect(tempUnitFor('not a locale!')).toBe('celsius')
  })
})
