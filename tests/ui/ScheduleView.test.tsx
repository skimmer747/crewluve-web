// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { createRef, type RefObject } from 'preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { ScheduleView } from '../../src/ui/ScheduleView'
import { testAirports } from '../fixtures/airports'
import { flight, H, pilot, place } from '../fixtures/legs'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25),
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // Friday 6:15am, next at 10am Thursday
]

const view = (focusOnOpen?: RefObject<HTMLElement>) => (
  <ScheduleView legs={LEGS} pilot={pilot('LEX', 'SDF')} now={at(10)} timeZone={NY} h24={false} airports={testAirports} weekStart={0}
    focusOnOpen={focusOnOpen} />
)

describe('ScheduleView (slice 3C §6.1)', () => {
  it('is the Schedule page below its bar: the calendar, its hairline and the list’s box, in whatever holds it', () => {
    const { container } = render(<section class="column">{view()}</section>)
    expect([...container.querySelector('.column')!.children].map((el) => el.className)).toEqual(['calendar', 'calendar-rule', 'schedule-days'])
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('takes no focus as it opens beside the status, and still opens the list at the next leg’s day', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    // The list's box 60 px down, and Friday's day 700 px down in it.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const top = this.classList.contains('schedule-days') ? 60 : this.dataset.day === String(THU + 1) ? 700 : 0
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    })
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    render(view())
    expect(focus).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
  })

  it('focuses what it’s given before it scrolls, as the Schedule page does with its title', () => {
    const calls: string[] = []
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {
      calls.push('scroll')
    })
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push('focus')
      focus.call(this, options)
    })
    const title = createRef<HTMLHeadingElement>()
    render(
      <main>
        <h1 ref={title} tabIndex={-1}>Schedule</h1>
        {view(title)}
      </main>,
    )
    expect(calls).toEqual(['focus', 'scroll'])
    expect(document.activeElement).toBe(title.current)
  })

  it('takes the body’s full height away while it shows, wherever it is, and gives it back', () => {
    const { unmount } = render(<section>{view()}</section>)
    expect(document.documentElement.classList.contains('schedule-open')).toBe(true)
    unmount()
    expect(document.documentElement.classList.contains('schedule-open')).toBe(false)
  })
})
