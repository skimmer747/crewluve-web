// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTripFacts } from '../../src/facts/tripFacts'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { setWindowSize } from '../fixtures/ui'
import { FLYING, LIVE_AIRPORTS, SCHEDULE } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The full map's facts with a real plane (Stage 3 spec §7.3, §8), as the app's TripMapScreen and FactsFooter have them:
 * the credit to adsb.lol under the facts whenever a flight with live data shows, never on the status page's card, and
 * a replay's facts are the replay's: the real plane where its record has it, with no height or speed. They're made from
 * the page's one store, so a real path's story is never made twice.
 */

// The map's land and the facts' data are downloads these tests don't make: the facts go without places.
vi.mock('../../src/ui/hooks/useLand', () => ({ useLand: () => null }))
vi.mock('../../src/ui/hooks/useFactsData', () => ({ useGeography: () => null, useComparisons: () => null }))
vi.mock('../../src/facts/tripFacts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/facts/tripFacts')>()
  return { ...original, makeTripFacts: vi.fn(original.makeTripFacts) }
})

const NOW = START + 59 * MINUTE

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
  // Wide, so the full map opens with its facts showing.
  setWindowSize(1280, 800)
  history.replaceState(null, '', '/')
  vi.mocked(makeTripFacts).mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  history.replaceState(null, '', '/')
  setWindowSize(1024, 768)
})

const handle: ScheduleHandle = { schedule: SCHEDULE, lastSuccessAt: START, problem: null, refreshing: false, refresh: () => {} }
const LIVE = { flights: new Map([['f1', FLYING]]), clockOffset: 0 }

/** The pilot's pages, at the full map's address when `atMap`. */
function pages(live: typeof LIVE | null, atMap = true) {
  if (atMap) history.replaceState(null, '', '/#map')
  return render(<PilotPages schedule={handle} airports={LIVE_AIRPORTS} demo={false} onLeave={() => {}} live={live} loadWeather={async () => null} />).container
}

/** The row of that kind on the full map's facts, as the screen shows it: its title, and its second line. */
function shownRow(container: Element, title: RegExp): { title: string; detail: string | null } {
  const rows = [...container.querySelectorAll('#trip-facts .fact-row')]
  const found = rows.find((r) => title.test(r.querySelector('.fact-row-title')?.textContent ?? ''))
  if (!found) throw new Error(`No row titled ${title}`)
  return { title: found.querySelector('.fact-row-title')!.textContent!, detail: found.querySelector('.fact-row-detail')?.textContent ?? null }
}

const milesFlown = (container: Element) => Number(shownRow(container, /mi flown/).title.match(/^([\d,]+) mi flown/)![1].replace(/,/g, ''))

/** Moves the full map's timeline a quarter of the way through the trip: a replay's moment, paused. */
function replayAQuarterIn() {
  const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
  fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
}

const credit = (container: Element) => container.querySelector('#trip-facts .facts-footer .live-credit')

describe('the credit to adsb.lol (Stage 3 spec §8, §15)', () => {
  it('shows under the full map’s facts while a flight with live data shows, now and in a replay', () => {
    const container = pages(LIVE)
    expect(credit(container)?.querySelector('.sr-only')?.textContent).toBe('Live position from adsb.lol.')
    replayAQuarterIn()
    expect(credit(container)).not.toBeNull()
  })

  it('isn’t on the status page’s card, which is too small for it (Todd, 15 Nov 2026)', () => {
    const container = pages(LIVE, false)
    expect(container.querySelector('.trip-map-card')).not.toBeNull()
    expect(container.textContent).not.toMatch(/adsb\.lol/)
    for (const labelled of container.querySelectorAll('[aria-label]')) expect(labelled.getAttribute('aria-label')).not.toMatch(/adsb\.lol/)
  })

  it('isn’t under the facts with no live data', () => {
    const container = pages(null)
    expect(container.querySelector('#trip-facts .facts-footer p')?.textContent).toBe('Estimated from the schedule')
    expect(container.querySelector('#trip-facts .facts-footer .live-credit')).toBeNull()
    replayAQuarterIn()
    expect(container.textContent).not.toMatch(/adsb\.lol/)
  })
})

describe('a replay’s facts on the full map (Stage 3 spec §7.3)', () => {
  it('are now’s at now: the real plane at its newest fix, with its height and speed', () => {
    const container = pages(LIVE)
    expect(shownRow(container, /^Boeing 767-300/)).toEqual({ title: 'Boeing 767-300 · N000XX', detail: '30,000 ft · 490 mph' })
    expect(milesFlown(container)).toBe(342)
  })

  it('are the replay’s: the real plane where its record has it, with no height or speed', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    expect(shownRow(container, /^Boeing 767-300/)).toEqual({ title: 'Boeing 767-300 · N000XX', detail: null })
    // A quarter of the way through the trip, it had flown less than it has now.
    const flown = milesFlown(container)
    expect(flown).toBeGreaterThan(0)
    expect(flown).toBeLessThan(342)
  })

  it('go back to now’s at Live', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(shownRow(container, /^Boeing 767-300/).detail).toBe('30,000 ft · 490 mph')
    expect(milesFlown(container)).toBe(342)
  })
})

describe('the facts of a replay’s moment and the page’s store (Stage 3 spec §8)', () => {
  const calls = () => vi.mocked(makeTripFacts).mock.calls.map(([, options], i) => ({ options, made: vi.mocked(makeTripFacts).mock.results[i].value }))

  it('are made with isReplay, from the store every other facts on the page are made from', () => {
    pages(LIVE)
    expect(calls().every(({ options }) => !options.isReplay)).toBe(true)
    replayAQuarterIn()
    const replays = calls().filter(({ options }) => options.isReplay === true)
    expect(replays).toHaveLength(1)
    const store = calls()[0].options.store
    expect(store).toBeTruthy()
    for (const { options } of calls()) expect(options.store).toBe(store)
  })

  it('make nothing twice: the real path’s sun events are the ones now’s facts have', () => {
    pages(LIVE)
    replayAQuarterIn()
    const all = calls()
    const replay = all.findIndex(({ options }) => options.isReplay === true)
    // Now's facts, made at the same render, just before.
    const nowFacts = all[replay - 1].made
    expect(all[replay - 1].options.isReplay).toBeFalsy()
    expect(nowFacts.sunEvents.f1).toBeDefined()
    expect(all[replay].made.sunEvents.f1).toBe(nowFacts.sunEvents.f1)
  })

  it('are made once a render of the page, however often the full map draws the moment', () => {
    const container = pages(LIVE)
    replayAQuarterIn()
    // Folding the facts and opening them again draws the full map twice more, not the page.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show facts' }))
    expect(calls().filter(({ options }) => options.isReplay === true)).toHaveLength(1)
    // A second later the page draws again, with the replay's moment still showing: its facts are made again, once.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(calls().filter(({ options }) => options.isReplay === true)).toHaveLength(2)
    expect(credit(container)).not.toBeNull()
  })

  it('aren’t made while the full map shows now', () => {
    pages(LIVE)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(calls().length).toBeGreaterThan(1)
    expect(calls().some(({ options }) => options.isReplay)).toBe(false)
  })
})
