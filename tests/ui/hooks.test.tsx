// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleCache } from '../../src/data/cache'
import { ScheduleFetchError } from '../../src/data/fetchSchedule'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import { useAirports } from '../../src/ui/hooks/useAirports'
import { useNow } from '../../src/ui/hooks/useNow'
import { useSchedule, type UseScheduleOptions } from '../../src/ui/hooks/useSchedule'
import { useVisibilityCount } from '../../src/ui/hooks/useVisibilityCount'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const raw = (fetchedAt: number): RawSchedule => ({ ...new RawBuilder(0).build(), fetchedAt })

function memoryCache(initial: RawSchedule | null = null): ScheduleCache & { saved: number[] } {
  let value = initial
  const saved: number[] = []
  return {
    saved,
    load: () => value,
    save: (r) => {
      value = r
      saved.push(r.fetchedAt)
    },
    clear: () => {
      value = null
    },
  }
}

function Probe(props: UseScheduleOptions) {
  const s = useSchedule(props)
  return <pre data-testid="state">{JSON.stringify({ fetchedAt: s.raw?.fetchedAt ?? null, lastSuccessAt: s.lastSuccessAt, problem: s.problem, refreshing: s.refreshing })}</pre>
}

const state = () => JSON.parse(screen.getByTestId('state').textContent!)

describe('useSchedule', () => {
  it('shows the cached schedule at once, then the fresh one', async () => {
    const cache = memoryCache(raw(1))
    let resolve!: (r: RawSchedule) => void
    render(<Probe load={() => new Promise<RawSchedule>((r) => { resolve = r })} cache={cache} />)
    expect(state()).toMatchObject({ fetchedAt: 1, refreshing: true })
    resolve(raw(2))
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 2, lastSuccessAt: 2, problem: null, refreshing: false }))
    expect(cache.saved).toEqual([2])
  })

  it('keeps the old schedule and reports trouble when a fetch fails', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} cache={memoryCache(raw(1))} isOnline={() => true} />)
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 1, problem: { kind: 'unreachable' }, refreshing: false }))
  })

  it('says offline when the browser is offline', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} cache={memoryCache(raw(1))} isOnline={() => false} />)
    await waitFor(() => expect(state()).toMatchObject({ problem: { kind: 'offline' } }))
  })

  it('hands an expired session to onAuthError', async () => {
    const onAuthError = vi.fn()
    render(<Probe load={() => Promise.reject(new ScheduleFetchError('JWT expired', 401, 'PGRST301'))} cache={memoryCache()} onAuthError={onAuthError} />)
    await waitFor(() => expect(onAuthError).toHaveBeenCalledTimes(1))
  })

  it('never writes the cache after it unmounts, as on sign-out', async () => {
    const cache = memoryCache()
    let resolve!: (r: RawSchedule) => void
    const { unmount } = render(<Probe load={() => new Promise<RawSchedule>((r) => { resolve = r })} cache={cache} />)
    unmount()
    resolve(raw(2))
    await new Promise((r) => setTimeout(r, 0))
    expect(cache.saved).toEqual([])
  })

  it('refreshes on its interval', async () => {
    let n = 0
    render(<Probe load={async () => raw(++n)} cache={memoryCache()} intervalMs={30} />)
    await waitFor(() => expect(state().fetchedAt).toBeGreaterThanOrEqual(2), { timeout: 1000 })
  })
})

describe('useNow', () => {
  function Clock() {
    return <span data-testid="now">{useNow(1000)}</span>
  }

  it('ticks every second', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(1_000_000)
    render(<Clock />)
    expect(screen.getByTestId('now').textContent).toBe('1000000')
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('now').textContent).toBe('1001000')
  })
})

describe('useVisibilityCount', () => {
  function Counter() {
    return <span data-testid="count">{useVisibilityCount()}</span>
  }

  it('counts returns to the page', async () => {
    render(<Counter />)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(screen.getByTestId('count').textContent).toBe('1')
  })
})

describe('useAirports', () => {
  // retryMs 0, so the second try runs at once instead of after 3 seconds.
  function Cities() {
    const airports = useAirports(0)
    return <span data-testid="city">{airports ? airports.city('SDF') : 'loading'}</span>
  }

  const listed = { ok: true, json: async () => [['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville']] }
  const missing = { ok: false, status: 404 }

  it('loads the airport list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => listed))
    render(<Cities />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('Louisville'))
  })

  it('shows airport codes when the list will not load, after exactly one more try', async () => {
    const fetchMock = vi.fn(async () => missing)
    vi.stubGlobal('fetch', fetchMock)
    render(<Cities />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('SDF'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('city').textContent).toBe('SDF')
  })

  it('swaps in city names when the second try works', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(missing).mockResolvedValueOnce(listed)
    vi.stubGlobal('fetch', fetchMock)
    render(<Cities />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('Louisville'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
