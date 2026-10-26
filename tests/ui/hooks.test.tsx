// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildSchedule } from '../../src/engine/normalize'
import type { Schedule } from '../../src/engine/types'
import { useAirports } from '../../src/ui/hooks/useAirports'
import { useNow } from '../../src/ui/hooks/useNow'
import { REFRESH_MS, useSchedule, type ScheduleHandle, type UseScheduleOptions } from '../../src/ui/hooks/useSchedule'
import { useVisibilityCount } from '../../src/ui/hooks/useVisibilityCount'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const sched = (fetchedAt: number): Schedule => buildSchedule({ ...new RawBuilder(0).build(), fetchedAt }, 0)

function Probe(props: UseScheduleOptions) {
  const s = useSchedule(props)
  return <pre data-testid="state">{JSON.stringify({ fetchedAt: s.schedule?.fetchedAt ?? null, lastSuccessAt: s.lastSuccessAt, problem: s.problem, refreshing: s.refreshing })}</pre>
}

const state = () => JSON.parse(screen.getByTestId('state').textContent!)

describe('useSchedule', () => {
  it('shows the schedule it starts with at once, then the fresh one', async () => {
    let resolve!: (s: Schedule) => void
    render(<Probe load={() => new Promise<Schedule>((r) => { resolve = r })} initial={sched(1)} />)
    expect(state()).toMatchObject({ fetchedAt: 1, lastSuccessAt: 1, refreshing: true })
    resolve(sched(2))
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 2, lastSuccessAt: 2, problem: null, refreshing: false }))
  })

  it('starts with nothing when it is given nothing', () => {
    render(<Probe load={() => new Promise<Schedule>(() => {})} />)
    expect(state()).toMatchObject({ fetchedAt: null, lastSuccessAt: null, refreshing: true })
  })

  it('keeps the old schedule and reports trouble when a load fails', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} initial={sched(1)} isOnline={() => true} />)
    await waitFor(() => expect(state()).toMatchObject({ fetchedAt: 1, problem: { kind: 'unreachable' }, refreshing: false }))
  })

  it('says offline when the browser is offline', async () => {
    render(<Probe load={() => Promise.reject(new Error('down'))} initial={sched(1)} isOnline={() => false} />)
    await waitFor(() => expect(state()).toMatchObject({ problem: { kind: 'offline' } }))
  })

  it('tells onError about a load that fails', async () => {
    const onError = vi.fn()
    const err = new Error('Sharing has ended')
    render(<Probe load={() => Promise.reject(err)} onError={onError} />)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
  })

  it('refreshes on its interval', async () => {
    let n = 0
    render(<Probe load={async () => sched(++n)} intervalMs={30} />)
    await waitFor(() => expect(state().fetchedAt).toBeGreaterThanOrEqual(2), { timeout: 1000 })
  })

  it("asks every 30 seconds by default: the partner door's poll", () => {
    expect(REFRESH_MS).toBe(30_000)
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

// --- Timing, visibility and cleanup ---

/** Makes document.visibilityState report `state` until restoreVisibility() runs. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}
function restoreVisibility() {
  delete (document as { visibilityState?: unknown }).visibilityState
}
const flush = () => act(async () => {
  await Promise.resolve()
  await Promise.resolve()
})

describe('useNow, by default', () => {
  function DefaultClock() {
    return <span data-testid="now">{useNow()}</span>
  }

  it('ticks every second', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(1_000_000)
    render(<DefaultClock />)
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('now').textContent).toBe('1001000')
  })

  it('stops its timer when it unmounts', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    const { unmount } = render(<DefaultClock />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('useVisibilityCount, in detail', () => {
  afterEach(() => {
    restoreVisibility()
    vi.restoreAllMocks()
  })
  function Counter() {
    return <span data-testid="count">{useVisibilityCount()}</span>
  }

  it('counts returns to the page, not the page being hidden', async () => {
    render(<Counter />)
    setVisibility('hidden')
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(screen.getByTestId('count').textContent).toBe('0')
    setVisibility('visible')
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('stops listening when it unmounts', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(<Counter />)
    const handler = add.mock.calls.find(([type]) => type === 'visibilitychange')![1]
    unmount()
    expect(remove).toHaveBeenCalledWith('visibilitychange', handler)
  })
})

describe('useAirports, on a slow or failing link', () => {
  const listed = { ok: true, json: async () => [['SDF', 'Louisville', 'USA', 38.17, -85.74, 'America/Kentucky/Louisville']] }
  function Cities({ retryMs = 0, slowMs = 20 }: { retryMs?: number; slowMs?: number }) {
    const airports = useAirports(retryMs, slowMs)
    return <span data-testid="city">{airports ? airports.city('SDF') : 'loading'}</span>
  }

  it('shows airport codes while a slow list downloads, then the city names', async () => {
    let deliver!: (response: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => (deliver = resolve))))
    render(<Cities />)
    expect(screen.getByTestId('city').textContent).toBe('loading')
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('SDF'))
    deliver(listed)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('Louisville'))
  })

  it('shows airport codes at once when the list fails, without waiting for the slow-link fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    render(<Cities retryMs={60_000} slowMs={60_000} />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('SDF'), { timeout: 500 })
  })

  it('waits the given time before falling back to codes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<Cities slowMs={60_000} />)
    await new Promise((r) => setTimeout(r, 400))
    expect(screen.getByTestId('city').textContent).toBe('loading')
  })

  it('falls back to codes after 300 ms by default', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    function Default() {
      const airports = useAirports()
      return <span data-testid="city">{airports ? airports.city('SDF') : 'loading'}</span>
    }
    render(<Default />)
    await new Promise((r) => setTimeout(r, 150))
    expect(screen.getByTestId('city').textContent).toBe('loading')
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('SDF'), { timeout: 1000 })
  })

  it('keeps a list that arrived before the slow-link fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => listed))
    render(<Cities slowMs={30} />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('Louisville'))
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.getByTestId('city').textContent).toBe('Louisville')
  })

  it('cancels its pending retry when it unmounts', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = render(<Cities retryMs={40} />)
    await waitFor(() => expect(screen.getByTestId('city').textContent).toBe('SDF'))
    unmount()
    await new Promise((r) => setTimeout(r, 80))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('useSchedule, timing and cleanup', () => {
  afterEach(() => {
    restoreVisibility()
    vi.restoreAllMocks()
  })

  let handle: ScheduleHandle | null = null
  function Grab(props: UseScheduleOptions) {
    const s = useSchedule(props)
    handle = s
    return <pre data-testid="state">{JSON.stringify({ fetchedAt: s.schedule?.fetchedAt ?? null, problem: s.problem })}</pre>
  }

  it('runs one load at a time', async () => {
    let finish!: (r: Schedule) => void
    const load = vi.fn(() => new Promise<Schedule>((resolve) => (finish = resolve)))
    render(<Grab load={load} />)
    handle!.refresh()
    handle!.refresh()
    expect(load).toHaveBeenCalledTimes(1)
    finish(sched(1))
    await waitFor(() => expect(state().fetchedAt).toBe(1))
  })

  it('skips its interval refresh while the page is hidden', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const load = vi.fn(async () => sched(1))
    render(<Grab load={load} intervalMs={1000} />)
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    setVisibility('hidden')
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(load).toHaveBeenCalledTimes(1)
    setVisibility('visible')
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('refreshes on a return to the page only after a 30-second gap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    const load = vi.fn(async () => sched(1))
    render(<Grab load={load} />)
    await flush()
    vi.setSystemTime(1_029_000)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(load).toHaveBeenCalledTimes(1)
    vi.setSystemTime(1_031_000)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('does not refresh when the page is being hidden', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    const load = vi.fn(async () => sched(1))
    render(<Grab load={load} />)
    await flush()
    vi.setSystemTime(1_060_000)
    setVisibility('hidden')
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('refreshes at once when the connection comes back, even inside the 30-second gap', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    const load = vi.fn(async () => sched(1))
    render(<Grab load={load} />)
    await flush()
    vi.setSystemTime(1_005_000)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('waits for the page to be visible again before refreshing on reconnect', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000_000)
    const load = vi.fn(async () => sched(1))
    render(<Grab load={load} />)
    await flush()
    setVisibility('hidden')
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('says offline as soon as the connection drops', async () => {
    render(<Grab load={async () => sched(1)} />)
    await waitFor(() => expect(state().fetchedAt).toBe(1))
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(state().problem).toEqual({ kind: 'offline' })
  })

  it('ignores a load that fails after it unmounts', async () => {
    let fail!: (err: unknown) => void
    const onError = vi.fn()
    const { unmount } = render(<Grab load={() => new Promise<Schedule>((_, reject) => (fail = reject))} onError={onError} />)
    unmount()
    fail(new Error('down'))
    await new Promise((r) => setTimeout(r, 0))
    expect(onError).not.toHaveBeenCalled()
  })

  it('removes its listeners and its timer when it unmounts', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const docAdd = vi.spyOn(document, 'addEventListener')
    const docRemove = vi.spyOn(document, 'removeEventListener')
    const winAdd = vi.spyOn(window, 'addEventListener')
    const winRemove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Grab load={() => new Promise<Schedule>(() => {})} />)
    const added = [
      ...docAdd.mock.calls.filter(([type]) => type === 'visibilitychange'),
      ...winAdd.mock.calls.filter(([type]) => type === 'online' || type === 'offline'),
    ].map(([type, handler]) => [type, handler])
    expect(added).toHaveLength(3)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    const removed = [...docRemove.mock.calls, ...winRemove.mock.calls].map(([type, handler]) => [type, handler])
    for (const pair of added) expect(removed).toContainEqual(pair)
    expect(vi.getTimerCount()).toBe(0)
  })
})
