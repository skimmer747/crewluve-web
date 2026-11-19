// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandingLoader } from '../../src/data/weather'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { takeoffOf } from '../../src/facts/takeoff'
import { LANDING_REFRESH_MS, useLandingWeather, useTakeoffWeather } from '../../src/ui/hooks/useLandingWeather'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!

function Shown({ trip, load }: { trip: TripMap | null; load: LandingLoader }) {
  const forecasts = useLandingWeather(trip, at(4), 'fahrenheit', load)
  return <p>{Object.entries(forecasts).map(([id, f]) => `${id}:${f.temperature}`).join(' ')}</p>
}

describe('useLandingWeather (Stage 2 spec §7.1, §7.2)', () => {
  it('fetches each flight’s landing hour once and gives the forecasts by leg', async () => {
    const load = vi.fn<LandingLoader>(async (place) => ({ temperature: place.code === 'CGN' ? 48 : 86, unit: 'fahrenheit', code: 0 }))
    const { container, rerender } = render(<Shown trip={map} load={load} />)
    await waitFor(() => expect(container.textContent).toBe('f1:48 f2:86'))
    rerender(<Shown trip={map} load={load} />)
    expect(load).toHaveBeenCalledTimes(2)
    expect(load.mock.calls.map(([place, landing]) => [place.code, landing])).toEqual([['CGN', at(8)], ['DXB', at(38)]])
  })

  it('keeps a forecast when its refresh 30 minutes later fails, as the app does', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    let up = true
    const load = vi.fn<LandingLoader>(async (place) => (up ? { temperature: place.code === 'CGN' ? 48 : 86, unit: 'fahrenheit', code: 0 } : null))
    const { container } = render(<Shown trip={map} load={load} />)
    await waitFor(() => expect(container.textContent).toBe('f1:48 f2:86'))
    up = false
    vi.setSystemTime(Date.now() + LANDING_REFRESH_MS + 60_000)
    vi.advanceTimersByTime(60_000)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(4))
    await Promise.resolve()
    expect(container.textContent).toBe('f1:48 f2:86')
  })

  it('fetches nothing while the full map is closed', () => {
    const load = vi.fn<LandingLoader>(async () => null)
    render(<Shown trip={null} load={load} />)
    expect(load).not.toHaveBeenCalled()
  })
})

function TakeoffShown({ trip, load, now = at(4) }: { trip: TripMap | null; load: LandingLoader; now?: number }) {
  const forecasts = useTakeoffWeather(trip, now, 'fahrenheit', load)
  return <p>{Object.entries(forecasts).map(([id, f]) => `${id}:${f.temperature}`).join(' ')}</p>
}

describe('useTakeoffWeather (time labels design §3.3)', () => {
  it('fetches the hour the flight in the air took off, at its departure airport, by leg', async () => {
    const load = vi.fn<LandingLoader>(async () => ({ temperature: 84, unit: 'fahrenheit', code: 0 }))
    const { container } = render(<TakeoffShown trip={map} load={load} />)
    await waitFor(() => expect(container.textContent).toBe('f1:84'))
    expect(load.mock.calls.map(([place, hour]) => [place.code, hour])).toEqual([['SDF', takeoffOf(map.legs[0])!.time]])
  })

  it('keeps the weather once the flight is down, as the app does, and fetches no more', async () => {
    const load = vi.fn<LandingLoader>(async () => ({ temperature: 84, unit: 'fahrenheit', code: 0 }))
    const { container, rerender } = render(<TakeoffShown trip={map} load={load} />)
    await waitFor(() => expect(container.textContent).toBe('f1:84'))
    // On the layover in Cologne, the flight is down: its takeoff row's weather stays, and nothing new is asked for.
    rerender(<TakeoffShown trip={map} load={load} now={at(12)} />)
    expect(container.textContent).toBe('f1:84')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('fetches nothing while the full map is closed', () => {
    const load = vi.fn<LandingLoader>(async () => null)
    render(<TakeoffShown trip={null} load={load} />)
    expect(load).not.toHaveBeenCalled()
  })
})
