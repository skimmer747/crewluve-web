// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/preact'
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
})
