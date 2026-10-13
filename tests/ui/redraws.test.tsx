// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayName } from '../../src/copy/calendar'
import { legClock } from '../../src/copy/schedule'
import type { Leg } from '../../src/engine/legs'
import { DAY, MINUTE } from '../../src/time/zoned'
import { ScheduleView } from '../../src/ui/ScheduleView'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'

// Each part's draws are counted through a function it calls as it draws: the calendar names every day it shows, and a
// row works out its clock.
vi.mock('../../src/copy/calendar', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/calendar')>()
  return { ...real, dayName: vi.fn(real.dayName) }
})
vi.mock('../../src/copy/schedule', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/copy/schedule')>()
  return { ...real, legClock: vi.fn(real.legClock) }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25), // happening at 10am Thursday
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // the next leg then
  drive('SDF', 'LEX', true, T0 + 33, T0 + 34.5),
  duty('training', 'CQ Training', 'SDF', T0 + 52, T0 + 56),
]

// One pilot for every draw, as the app's schedule keeps one until new data comes.
const PILOT = pilot('LEX', 'SDF')
const view = (now: number) => (
  <ScheduleView legs={LEGS} pilot={PILOT} now={now} timeZone={NY} h24={false} airports={testAirports} weekStart={0} />
)

describe('redraws: the calendar (redraws §4.2)', () => {
  it('draws again as the minute turns, not with every second, and after a tap on a day', () => {
    const start = at(10)
    const { container, rerender } = render(view(start))
    const days = container.querySelectorAll('.calendar-day').length
    vi.mocked(dayName).mockClear()
    for (let second = 1; second < 60; second++) rerender(view(start + second * 1000))
    expect(dayName).not.toHaveBeenCalled()
    rerender(view(start + MINUTE))
    expect(dayName).toHaveBeenCalledTimes(days)
    vi.mocked(dayName).mockClear()
    fireEvent.click(container.querySelector<HTMLElement>(`[data-calendar-day="${THU + 1}"]`)!)
    expect(dayName).toHaveBeenCalledTimes(days)
  })

  // The steady handlers must call the latest draw's code: a screen left open all day goes past midnight.
  it('works from the latest draw after midnight: Current Event selects the new day', () => {
    const { container, rerender } = render(view(at(24) - 30_000))
    rerender(view(at(24) + 30_000))
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(container.querySelector('[role="gridcell"][aria-selected="true"] button')!.getAttribute('aria-label')).toBe('Friday, October 16')
  })

  it('works from the latest data: a tap on a day takes the list to a day that arrived after the first draw', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    // The list's box 60 px down, Saturday's day 600 px down in it and Sunday's 900.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.classList.contains('schedule-days') ? 60 : ({ [THU + 2]: 600, [THU + 3]: 900 } as Record<string, number>)[this.dataset.day ?? ''] ?? 0
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    })
    const { container, rerender } = render(view(at(10)))
    const sunday = duty('training', 'Sim', 'SDF', T0 + 76, T0 + 80) // Sunday 4am, in the new data
    rerender(<ScheduleView legs={[...LEGS, sunday]} pilot={PILOT} now={at(10)} timeZone={NY} h24={false} airports={testAirports} weekStart={0} />)
    fireEvent.click(container.querySelector<HTMLElement>(`[data-calendar-day="${THU + 3}"]`)!)
    // Sunday's heading at the top of the box. From the first draw's data, Sunday had no legs and the list went to Saturday.
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 840, behavior: 'smooth' })
    vi.restoreAllMocks()
  })
})

describe('redraws: the rows (redraws §4.3)', () => {
  it('draws only the happening and the next rows again each second; the others keep their durations', () => {
    const start = at(10)
    const { rerender } = render(view(start))
    vi.mocked(legClock).mockClear()
    rerender(view(start + 1000))
    // The layover happening at 10am, and the flight after it.
    expect(vi.mocked(legClock).mock.calls.map(([legStart]) => legStart)).toEqual([LEGS[1].start, LEGS[2].start])
  })

  it('draws a row again when new data changes its leg', () => {
    const { container, rerender } = render(view(at(10)))
    const renamed = [...LEGS.slice(0, 4), duty('training', 'Recurrent', 'SDF', T0 + 52, T0 + 56)]
    rerender(<ScheduleView legs={renamed} pilot={PILOT} now={at(10)} timeZone={NY} h24={false} airports={testAirports} weekStart={0} />)
    expect([...container.querySelectorAll('.leg-title')].map((t) => t.textContent).pop()).toMatch(/^Recurrent/)
  })
})
