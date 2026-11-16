// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, FLYING, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

const NOW = START + 59 * MINUTE

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }
const LIVE = { flights: new Map([['f1', FLYING]]), clockOffset: 0 }
const noWeather = async () => null

const page = (live: typeof LIVE | null) =>
  render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}} live={live} loadWeather={noWeather} />).container

describe('the status page with a real plane (Stage 3 spec §7.1, §9)', () => {
  it("shows one landing time, the real plane's, said with \"about\" on the map's bar, the countdown and the narrative", () => {
    const container = page(LIVE)
    expect(container.querySelector('.inflight-status')?.textContent).not.toBe('In flight')
    const lands = container.querySelector('.inflight-time')?.textContent ?? ''
    expect(lands).toMatch(/^Lands about \d{1,2}:\d\d\s[AP]M$/)
    expect(container.querySelector('.countdown-sub')?.textContent).toMatch(/^About /)
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/ which is about \d/)
    expect(container.querySelector('.trip-map-open')?.getAttribute('aria-label')).toMatch(/^UPS1234 to Philadelphia, .* schedule(, over [^.]+)?\. Lands about .* your time\. Opens the full map\.$/)
  })

  it('moves an estimate that moves by itself each minute: a plane still at the gate lands later as time goes by', () => {
    vi.setSystemTime(START + 25 * MINUTE)
    // At the gate ten minutes after the plan's takeoff, seen 20 seconds ago.
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, SDF.lat, SDF.lng, { onGround: true }) })
    const container = page({ flights: new Map([['f1', atTheGate]]), clockOffset: 0 })
    const lands = () => container.querySelector('.inflight-time')?.textContent
    const before = lands()
    expect(before).toMatch(/^Lands about /)
    act(() => {
      vi.advanceTimersByTime(2 * MINUTE)
    })
    expect(lands()).toMatch(/^Lands about /)
    expect(lands()).not.toBe(before)
  })

  it('shows the schedule as before when the real plane can’t be read, and says so in the console', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // An answer that breaks the live code: a place on its trail with no place.
    const broken = { flights: new Map([['f1', { ...FLYING, trail: [{ time: START, place: null as never, altitudeFt: 30_000 }] }]]), clockOffset: 0 }
    const container = page(broken)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('In flight')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d/)
    expect(error).toHaveBeenCalledWith('Could not show the real plane', expect.any(Error))
    error.mockRestore()
  })

  it('shows the schedule as before with no live data', () => {
    const container = page(null)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('In flight')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d/)
    expect(container.querySelector('.countdown-sub')?.textContent).not.toMatch(/^About /)
    expect(container.querySelector('.narrative-text')?.textContent).not.toMatch(/about/)
  })
})

describe('the status page with a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Ten minutes after the plan's takeoff, the plane still at its gate in Louisville. */
  const LATE = START + 25 * MINUTE
  const AT_THE_GATE = { flights: new Map([['f1', atTheGate(25)]]), clockOffset: 0 }

  it('says so in the narrative, with the countdown and "about" the landing time, and in the card’s heading', () => {
    vi.setSystemTime(LATE)
    const container = page(AT_THE_GATE)
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers.
      .toMatch(/^Alex is still on the ground in Louisville on UPS flight 1234 to Philadelphia — landing in \d+h \d+m\d.* which is about \d{1,2}:\d\d[ap]m [A-Z]+\.$/)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('On the ground')
  })

  it('says flying, as before, once the plane is in the air, and with no live data', () => {
    expect(page(LIVE).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    cleanup()
    vi.setSystemTime(LATE)
    expect(page(null).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
  })
})

describe('the Schedule page with a real plane (Stage 3 spec §9)', () => {
  afterEach(() => history.replaceState(null, '', '/'))

  it('says "about" before the landing time that’s the real plane’s estimate', () => {
    history.replaceState(null, '', '/#schedule')
    expect(page(LIVE).querySelector('.leg-times')?.textContent).toMatch(/ – about \d{1,2}:\d\d[ap]m [a-z]+$/)
  })

  it('says no "about" with no live data, as before', () => {
    history.replaceState(null, '', '/#schedule')
    expect(page(null).querySelector('.leg-times')?.textContent).toMatch(/ – \d{1,2}:\d\d[ap]m [a-z]+$/)
  })
})
