// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { atTheGate, backAtTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, SCHEDULE, SDF } from '../map/liveTrip'
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

  it('says flying, as with no live data, while an on-time plane is still before the plan’s takeoff time', () => {
    // A minute after its leg begins, 14 before the plan's takeoff.
    const taxiing = START + MINUTE
    vi.setSystemTime(taxiing)
    const before = page(null).querySelector('.narrative-text')?.textContent
    cleanup()
    const container = page({ flights: new Map([['f1', atTheGate(1)]]), clockOffset: 0 })
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    expect(container.querySelector('.narrative-text')?.textContent).toBe(before)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('In flight')
  })

  it('says flying, as before, once the plane is in the air, and with no live data', () => {
    expect(page(LIVE).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    cleanup()
    vi.setSystemTime(LATE)
    expect(page(null).querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
  })
})

describe('the status page with a real plane back at its departure airport after an air return (air return design §3)', () => {
  /** Off on time, out and back, and on the ground in Louisville again at 44 minutes. */
  const BACK = START + 45 * MINUTE

  it('says so in the narrative, on the card’s bar and its chip, with "about" the landing time', () => {
    vi.setSystemTime(BACK)
    const container = page({ flights: new Map([['f1', backAtTheGate(45)]]), clockOffset: 0 })
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers; the time in the zone the tests run in, whatever its name.
      .toMatch(/^Alex has returned to Louisville on UPS flight 1234 to Philadelphia — landing in \d+h \d+m\d.* which is about \d{1,2}:\d\d[ap]m \S+\.$/)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('Returned to Louisville')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Returned to Louisville')
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('On the ground')
  })
})

describe('the status page with a real plane down, not yet at the gate (the landed, not yet at the gate design §3, Todd, 17 Nov 2026)', () => {
  /** Three minutes after it landed in Philadelphia, 13 minutes early, and four before it reaches the gate. */
  const DOWN = START + 103 * MINUTE
  const LANDED = { flights: new Map([['f1', LANDED_EARLY]]), clockOffset: 0 }

  it('says so in the narrative, counting down to the gate, and on the card’s heading and its chip', () => {
    vi.setSystemTime(DOWN)
    const container = page(LANDED)
    expect(container.querySelector('.narrative-text')?.textContent)
      // The countdown's digits, then its words for screen readers.
      // The time is the viewer's, in whatever zone the tests run (GitHub's build runs in UTC): its minutes are the gate's.
      .toMatch(/^Alex has landed in Philadelphia on UPS flight 1234 — at the gate in 4m4 minutes which is \d{1,2}:47[ap]m [A-Z]+\.$/)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('Landed')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Landed in Philadelphia')
  })

  it('keeps the bar’s label and the card’s sentence as they were, and the bar says when it reaches the gate (Todd, 17 Nov 2026)', () => {
    vi.setSystemTime(DOWN)
    const container = page(LANDED)
    expect(container.querySelector('.inflight-status')?.textContent).toBe('Landed 13 min early')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^At the gate \d{1,2}:47\s[AP]M$/)
    expect(container.querySelector('.trip-map-open')?.getAttribute('aria-label'))
      .toMatch(/^UPS1234 to Philadelphia, landed 13 minutes early\. Reaches the gate at \d{1,2}:47\s[AP]M your time\. (.+\. )?Opens the full map\.$/)
  })

  it('says flying, as before, with no live data', () => {
    vi.setSystemTime(DOWN)
    const container = page(null)
    expect(container.querySelector('.narrative-text')?.textContent).toMatch(/^Alex is flying to Philadelphia on UPS flight 1234 from Louisville — /)
    expect(container.querySelector('.trip-map-card h2')?.textContent).toBe('In flight')
    expect(container.querySelector('.inflight-time')?.textContent).toMatch(/^Lands \d{1,2}:00\s[AP]M$/)
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
