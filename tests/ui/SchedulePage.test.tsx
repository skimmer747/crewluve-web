// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { SchedulePage } from '../../src/ui/SchedulePage'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
import { stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours; THU is that calendar day. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const THU = Date.UTC(2026, 9, 15) / DAY
const at = (hours: number) => (T0 + hours) * H
const LEGS: Leg[] = [
  flight('SDF', 'RFD', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }), // Thursday 6:15am
  place('layover', 'RFD', T0 + 7.75, T0 + 30.25),
  flight('RFD', 'SDF', T0 + 30.25, T0 + 32, 'T1', { number: '2962' }), // Friday 6:15am
  drive('SDF', 'LEX', true, T0 + 33, T0 + 34.5), // an hour after landing
  duty('training', 'CQ Training', 'SDF', T0 + 52, T0 + 56), // Saturday 4:00am
]

function page(legs: Leg[], now: number, onBack = () => {}) {
  return <SchedulePage legs={legs} pilot={pilot('LEX', 'SDF')} now={now} timeZone={NY} h24={false} airports={testAirports} onBack={onBack} />
}

/** Lays the page out for the browser-free tests: the bar's bottom at 60 px, each day and heading where `tops` say. */
function layOut(tops: { days?: Record<number, number>; headings?: Record<number, number> }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const day = Number((this.closest('[data-day]') as HTMLElement | null)?.dataset.day)
    const top = this.classList.contains('schedule-bar') ? 0
      : this.classList.contains('day-heading') ? tops.headings?.[day] ?? 0
      : this.classList.contains('schedule-day') ? tops.days?.[day] ?? 0 : 0
    const bottom = this.classList.contains('schedule-bar') ? 60 : top
    return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
}

const rowsOf = (container: Element) =>
  [...container.querySelectorAll('.schedule-day')].map((d) => [...d.querySelectorAll('.leg')].map((l) => l.className))

describe('SchedulePage (slice 3A §4)', () => {
  it('has a round back button and the Schedule heading, which takes focus as the page opens', () => {
    const onBack = vi.fn()
    render(page(LEGS, at(10), onBack))
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back.className).toBe('glass round schedule-back')
    expect(back.querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    const title = screen.getByRole('heading', { level: 1, name: 'Schedule' })
    expect(title.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(title)
    fireEvent.click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('lists each day under its heading, with its legs as rows, a gap line between, and today’s heading in green', () => {
    const { container } = render(page(LEGS, at(10)))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Today', 'Tomorrow', 'Saturday, Oct 17'])
    expect([...container.querySelectorAll('.schedule-day')].map((d) => (d as HTMLElement).dataset.day)).toEqual([THU, THU + 1, THU + 2].map(String))
    expect(rowsOf(container).map((rows) => rows.length)).toEqual([2, 2, 1])
    expect([...container.querySelectorAll('.leg-gap')].map((g) => g.textContent)).toEqual(['Gap 1h'])
    expect(container.querySelector('.day-pill')!.className).toBe('day-pill today')
    expect(container.querySelectorAll('ol.day-legs > li').length).toBe(5)
  })

  it('keeps the lists and headings for screen readers: Safari drops an unstyled list’s role, and capitals can be spelled out', () => {
    const { container } = render(page(LEGS, at(10)))
    expect([...container.querySelectorAll('ol.day-legs')].map((ol) => ol.getAttribute('role'))).toEqual(['list', 'list', 'list'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.getAttribute('aria-label'))).toEqual(['Today', 'Tomorrow', 'Saturday, Oct 17'])
  })

  it('focuses the title before it scrolls, since Safari before 15 scrolls to whatever takes focus', () => {
    const calls: string[] = []
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      calls.push('scroll')
    })
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push('focus')
      focus.call(this, options)
    })
    render(page(LEGS, at(10)))
    expect(calls).toEqual(['focus', 'scroll'])
  })

  it('adds no <style> elements, which the site’s content security policy would block', () => {
    const before = document.querySelectorAll('style').length
    render(page(LEGS, at(10)))
    expect(document.querySelectorAll('style').length).toBe(before)
  })

  it('marks the leg happening now, the next leg, and the drive home', () => {
    expect(rowsOf(render(page(LEGS, at(10))).container)).toEqual([
      ['leg glass', 'leg glass leg-happening'],
      ['leg glass leg-next', 'leg glass leg-home homeward'],
      ['leg glass'],
    ])
  })

  it('updates in place as the clock runs and new data arrives, without scrolling again', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { container, rerender } = render(page(LEGS, at(10)))
    rerender(page([...LEGS], at(30.5)))
    expect(rowsOf(container)[1]).toEqual(['leg glass leg-happening', 'leg glass leg-next homeward'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Yesterday', 'Today', 'Tomorrow'])
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('opens with the next leg’s day just under the bar', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } })
    render(page(LEGS, at(10)))
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
  })

  it('opens at the top when the day it would open at has no legs', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100 } })
    render(page(LEGS.slice(0, 1), at(36)))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('turns the heading stuck under the bar yellow, the last one within 20 px of it, as the page scrolls; today’s stays green', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const frames = stubAnimationFrames()
    layOut({ headings: { [THU]: -300, [THU + 1]: 60, [THU + 2]: 900 } })
    const { container } = render(page(LEGS, at(10)))
    const pills = () => [...container.querySelectorAll('.day-pill')].map((p) => p.className)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
    layOut({ headings: { [THU]: -900, [THU + 1]: -100, [THU + 2]: 75 } })
    fireEvent.scroll(window)
    await frames.frame(16)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill stuck'])
    layOut({ headings: { [THU]: 60, [THU + 1]: 900, [THU + 2]: 1400 } })
    fireEvent.scroll(window)
    await frames.frame(32)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill'])
    // 21 px below the bar is too far.
    layOut({ headings: { [THU]: -900, [THU + 1]: 60, [THU + 2]: 81 } })
    fireEvent.scroll(window)
    await frames.frame(48)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
  })

  it('stops listening to the page’s scrolling and resizing once it’s gone', () => {
    const removed = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(page(LEGS, at(10)))
    unmount()
    expect(removed.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(['scroll', 'resize']))
  })

  it('shows the app’s empty state when there are no legs at all', () => {
    const { container } = render(page([], at(10)))
    expect(screen.getByText('No schedule data')).toBeTruthy()
    expect(screen.getByText("Schedule will appear when your pilot's Duty app sends trip details.")).toBeTruthy()
    expect(container.querySelector('.schedule-day')).toBeNull()
  })
})
