// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandingLoader } from '../../src/data/weather'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { LANDING_REFRESH_MS, useLandingWeather } from '../../src/ui/hooks/useLandingWeather'
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
