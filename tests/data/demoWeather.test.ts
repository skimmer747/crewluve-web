import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDemoWeather } from '../../src/data/demoWeather'
import type { WeatherPlace } from '../../src/data/weather'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const place = (code: string, unit: WeatherPlace['unit'] = 'fahrenheit'): WeatherPlace => {
  const at: Record<string, [number, number, string]> = {
    LEX: [38.0365, -84.6059, 'America/New_York'],
    SDF: [38.1746, -85.7382, 'America/Kentucky/Louisville'],
    MIA: [25.7959, -80.2871, 'America/New_York'],
    RFD: [42.1954, -89.0972, 'America/Chicago'],
    ANC: [61.1744, -149.9983, 'America/Anchorage'],
    MCO: [28.4312, -81.3081, 'America/New_York'],
    ONT: [34.056, -117.6012, 'America/Los_Angeles'],
    CGN: [50.8659, 7.1427, 'Europe/Berlin'],
  }
  const [lat, lng, tz] = at[code]
  return { code, lat, lng, tz, unit }
}

describe('loadDemoWeather', () => {
  // Saturday 10 October 2026, 1 pm in Louisville and Lexington, 9 am in Anchorage.
  const AFTERNOON = Date.UTC(2026, 9, 10, 17)

  it.each([
    ['LEX', 58, 0],
    ['SDF', 66, 0],
    ['MIA', 84, 2],
    ['RFD', 61, 3],
    ['ANC', 41, 3],
    ['MCO', 79, 2],
    ['ONT', 75, 0],
  ])('has made-up weather for %s: %i°F, code %i', async (code, fahrenheit, weatherCode) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AFTERNOON)
    expect(await loadDemoWeather(place(code))).toEqual({ temperature: fahrenheit, code: weatherCode, isDay: true })
  })

  it('converts to Celsius for visitors who use it', async () => {
    expect((await loadDemoWeather(place('ANC', 'celsius')))?.temperature).toBe(5)
    expect((await loadDemoWeather(place('LEX', 'celsius')))?.temperature).toBeCloseTo(14.44, 2)
  })

  it('tells night from day by the sun at the airport right now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.UTC(2026, 9, 11, 2, 5)) // 10:05 pm in Lexington
    expect((await loadDemoWeather(place('LEX')))?.isDay).toBe(false)
  })

  it('has nothing for an airport outside the demo', async () => {
    expect(await loadDemoWeather(place('CGN'))).toBeNull()
  })

  it('never touches the network', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await loadDemoWeather(place('ANC'))
    expect(fetch).not.toHaveBeenCalled()
  })
})
