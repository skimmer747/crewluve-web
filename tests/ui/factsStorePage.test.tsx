// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTripFacts } from '../../src/facts/tripFacts'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { FLYING, LIVE_AIRPORTS, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The page owns one store for the facts (Stage 3 spec §8), as the app's status screen owns its LegStoryStore: a real
 * path's story and sun events are kept from one render to the next, and made again at most once a minute.
 */

vi.mock('../../src/facts/tripFacts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/facts/tripFacts')>()
  return { ...original, makeTripFacts: vi.fn(original.makeTripFacts) }
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(START + 59 * MINUTE)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }

describe('the facts’ store on the status page (Stage 3 spec §8)', () => {
  it('hands the same store to the facts at every render', () => {
    vi.mocked(makeTripFacts).mockClear()
    render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}}
      live={{ flights: new Map([['f1', FLYING]]), clockOffset: 0 }} loadWeather={async () => null} />)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    const stores = vi.mocked(makeTripFacts).mock.calls.map(([, options]) => options.store)
    expect(stores.length).toBeGreaterThan(1)
    expect(stores[0]).toBeTruthy()
    for (const store of stores) expect(store).toBe(stores[0])
  })
})
