// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Weather, WeatherLoader, WeatherPlace } from '../../src/data/weather'
import { useWeather, WEATHER_CHECK_MS, WEATHER_REFRESH_MS } from '../../src/ui/hooks/useWeather'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(Date.UTC(2026, 9, 10, 17))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  restoreVisibility()
})

/** Makes document.visibilityState report `state` until restoreVisibility() runs. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}
function restoreVisibility() {
  delete (document as { visibilityState?: unknown }).visibilityState
}
const flush = () =>
  act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}
const returnToPage = async () => {
  setVisibility('visible')
  await act(async () => {
    fireEvent(document, new Event('visibilitychange'))
  })
  await flush()
}

const ANC: WeatherPlace = { code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: 'fahrenheit' }
const SDF: WeatherPlace = { code: 'SDF', lat: 38.1746, lng: -85.7382, tz: 'America/Kentucky/Louisville', unit: 'fahrenheit' }
const cloudy = (temperature: number): Weather => ({ temperature, code: 3, isDay: true })

/** A loader that answers 41°, 42°, 43°… in call order, and records which airport and unit each call asked for. */
function countingLoader() {
  const calls: string[] = []
  const load: WeatherLoader = async (place) => {
    calls.push(`${place.code}|${place.unit}`)
    return cloudy(40 + calls.length)
  }
  return { load, calls }
}

function Probe({ place, load }: { place: WeatherPlace | null; load: WeatherLoader }) {
  const weather = useWeather(place, load)
  return <span data-testid="weather">{weather ? `${weather.temperature}°` : 'none'}</span>
}
const shown = () => screen.getByTestId('weather').textContent

/** Like ScheduleScreen, which builds an equal but new place on every render. */
function FreshPlace({ load }: { load: WeatherLoader }) {
  return <Probe place={{ ...ANC }} load={load} />
}

describe('useWeather', () => {
  it('shows nothing until the weather comes, then the weather', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('none')
    await flush()
    expect(shown()).toBe('41°')
    expect(calls).toEqual(['ANC|fahrenheit'])
  })

  it('asks for nothing when there is no airport', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={null} load={load} />)
    await flush()
    expect(shown()).toBe('none')
    expect(calls).toEqual([])
  })

  it('keeps each airport’s weather for 15 minutes', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    rerender(<Probe place={SDF} load={load} />)
    await flush()
    expect(shown()).toBe('42°')
    rerender(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('41°')
    await flush()
    expect(calls).toEqual(['ANC|fahrenheit', 'SDF|fahrenheit'])
  })

  it('asks again for the other unit', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    rerender(<Probe place={{ ...ANC, unit: 'celsius' }} load={load} />)
    await flush()
    expect(calls).toEqual(['ANC|fahrenheit', 'ANC|celsius'])
  })

  it('fetches again every 15 minutes while the page is visible, and not while it’s hidden', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    await advance(WEATHER_REFRESH_MS)
    expect(shown()).toBe('42°')
    setVisibility('hidden')
    await advance(WEATHER_REFRESH_MS)
    expect(calls).toHaveLength(2)
  })

  it('fetches within a minute of the weather turning 15 minutes old, even when the answer was slow to come', async () => {
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const load = vi.fn<WeatherLoader>(() => new Promise((resolve) => setTimeout(() => resolve(cloudy(41)), 2000)))
    render(<Probe place={ANC} load={load} />)
    await advance(2000)
    expect(shown()).toBe('41°')
    // Minute 15: the weather is 2 seconds short of 15 minutes old.
    await advance(WEATHER_REFRESH_MS - 2000)
    expect(load).toHaveBeenCalledTimes(1)
    await advance(WEATHER_CHECK_MS)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('fetches on a return to the page only once the weather is stale', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    await returnToPage()
    expect(calls).toHaveLength(1)
    setVisibility('hidden')
    await advance(WEATHER_REFRESH_MS)
    expect(calls).toHaveLength(1)
    await returnToPage()
    expect(calls).toHaveLength(2)
    expect(shown()).toBe('42°')
  })

  it('shows none after a failure, and tries again at the next refresh, not on a quick return', async () => {
    let failing = true
    const load = vi.fn<WeatherLoader>(async () => {
      if (failing) throw new Error('offline')
      return cloudy(41)
    })
    render(<Probe place={ANC} load={load} />)
    await flush()
    expect(shown()).toBe('none')
    failing = false
    await returnToPage()
    expect(load).toHaveBeenCalledTimes(1)
    await advance(WEATHER_REFRESH_MS)
    expect(load).toHaveBeenCalledTimes(2)
    expect(shown()).toBe('41°')
  })

  it('never asks twice for the same airport while an answer is on its way', async () => {
    const load = vi.fn<WeatherLoader>(() => new Promise<Weather | null>(() => {}))
    render(<Probe place={ANC} load={load} />)
    await returnToPage()
    await advance(WEATHER_REFRESH_MS)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps an answer that lands after the airport changed for its own airport', async () => {
    const answers: Array<(weather: Weather) => void> = []
    const load = vi.fn<WeatherLoader>(() => new Promise<Weather | null>((resolve) => answers.push(resolve)))
    const { rerender } = render(<Probe place={ANC} load={load} />)
    rerender(<Probe place={SDF} load={load} />)
    await act(async () => answers[0](cloudy(41)))
    await flush()
    expect(shown()).toBe('none')
    rerender(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('41°')
    expect(load.mock.calls.map(([place]) => place.code)).toEqual(['ANC', 'SDF'])
  })

  it('shows an answer that lands after going away and back to its airport', async () => {
    const answers: Array<(weather: Weather) => void> = []
    const load = vi.fn<WeatherLoader>(() => new Promise<Weather | null>((resolve) => answers.push(resolve)))
    const { rerender } = render(<Probe place={ANC} load={load} />)
    rerender(<Probe place={SDF} load={load} />)
    rerender(<Probe place={ANC} load={load} />)
    await act(async () => answers[0](cloudy(41)))
    await flush()
    expect(shown()).toBe('41°')
    expect(load.mock.calls.map(([place]) => place.code)).toEqual(['ANC', 'SDF'])
  })

  it('shows an airport’s old weather at once on a return after 15 minutes, then fetches it again', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    rerender(<Probe place={SDF} load={load} />)
    await flush()
    await advance(WEATHER_REFRESH_MS + 1)
    rerender(<Probe place={ANC} load={load} />)
    expect(shown()).toBe('41°')
    await flush()
    expect(shown()).toBe('44°')
    expect(calls).toEqual(['ANC|fahrenheit', 'SDF|fahrenheit', 'SDF|fahrenheit', 'ANC|fahrenheit'])
  })

  it('asks for nothing while hidden, though the screen hands it a new but equal place every render', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<FreshPlace load={load} />)
    await flush()
    setVisibility('hidden')
    for (let minute = 1; minute <= 16; minute++) {
      await advance(60_000)
      rerender(<FreshPlace load={load} />)
    }
    await flush()
    expect(calls).toHaveLength(1)
  })

  it('asks for nothing when the visitor leaves the page, even with stale weather', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    setVisibility('hidden')
    await advance(WEATHER_REFRESH_MS + 1)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    await flush()
    expect(calls).toHaveLength(1)
  })

  it('fetches again 15 minutes after a return to the page fetched, and not before', async () => {
    const { load, calls } = countingLoader()
    render(<Probe place={ANC} load={load} />)
    await flush()
    setVisibility('hidden')
    await advance(29 * 60_000)
    await returnToPage()
    expect(calls).toHaveLength(2)
    await advance(60_000)
    expect(calls).toHaveLength(2)
    await advance(WEATHER_REFRESH_MS - 60_000)
    expect(calls).toHaveLength(3)
  })

  it('fetches an airport’s weather again as soon as it turns 15 minutes old, after going away and back', async () => {
    const { load, calls } = countingLoader()
    const { rerender } = render(<Probe place={ANC} load={load} />)
    await flush()
    await advance(12 * 60_000)
    rerender(<Probe place={SDF} load={load} />)
    await flush()
    rerender(<Probe place={ANC} load={load} />)
    await flush()
    // Anchorage's weather is 12 minutes old, so it stays; 3 minutes later it's 15.
    expect(calls).toEqual(['ANC|fahrenheit', 'SDF|fahrenheit'])
    await advance(3 * 60_000)
    expect(calls).toEqual(['ANC|fahrenheit', 'SDF|fahrenheit', 'ANC|fahrenheit'])
  })

  it('treats a loader that throws at once as a failure, and tries again at the next refresh', async () => {
    let tries = 0
    const load: WeatherLoader = () => {
      tries += 1
      if (tries === 1) throw new Error('broken')
      return Promise.resolve(cloudy(41))
    }
    render(<Probe place={ANC} load={load} />)
    await flush()
    expect(shown()).toBe('none')
    await advance(WEATHER_REFRESH_MS)
    expect(shown()).toBe('41°')
  })

  it('checks once a minute, so the weather is never more than about 16 minutes old', () => {
    expect(WEATHER_CHECK_MS).toBe(60_000)
  })

  it('stops its timer and listener when it unmounts', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { load } = countingLoader()
    const { unmount } = render(<Probe place={ANC} load={load} />)
    await flush()
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
