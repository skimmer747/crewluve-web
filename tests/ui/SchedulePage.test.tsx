// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { DAY } from '../../src/time/zoned'
import { SchedulePage } from '../../src/ui/SchedulePage'
import { testAirports } from '../fixtures/airports'
import { drive, duty, flight, H, pilot, place } from '../fixtures/legs'
import { stubAnimationFrames, visibleText } from '../fixtures/ui'

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
  return <SchedulePage legs={legs} pilot={pilot('LEX', 'SDF')} now={now} timeZone={NY} h24={false} airports={testAirports} onBack={onBack} weekStart={0} />
}

/** Lays the page out for the browser-free tests: the list's box from 60 px down, each day and heading where `tops` say. */
function layOut(tops: { days?: Record<number, number>; headings?: Record<number, number> }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const day = Number((this.closest('[data-day]') as HTMLElement | null)?.dataset.day)
    const top = this.classList.contains('schedule-days') ? 60
      : this.classList.contains('day-heading') ? tops.headings?.[day] ?? 0
      : this.classList.contains('schedule-day') ? tops.days?.[day] ?? 0 : 0
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) } as DOMRect
  })
}

/** The list's own scrolling box (slice 3B §3.4). */
const listBox = (container: Element) => container.querySelector<HTMLElement>('.schedule-days')!

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
    expect([...container.querySelectorAll('.leg-gap')].map((g) => visibleText(g))).toEqual(['Gap 1h'])
    expect(container.querySelector('.day-pill')!.className).toBe('day-pill today')
    expect(container.querySelectorAll('ol.day-legs > li').length).toBe(5)
  })

  it('keeps the lists and headings for screen readers: Safari drops an unstyled list’s role, and capitals can be spelled out', () => {
    const { container } = render(page(LEGS, at(10)))
    expect([...container.querySelectorAll('ol.day-legs')].map((ol) => ol.getAttribute('role'))).toEqual(['list', 'list', 'list'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.getAttribute('aria-label'))).toEqual(['Today', 'Tomorrow', 'Saturday, Oct 17'])
  })

  it('scrolls the list in its own box under the bar, which keyboards can reach and screen readers name (slice 3B §3.1, §3.4)', () => {
    const { container } = render(page(LEGS, at(10)))
    const box = listBox(container)
    expect(box.parentElement!.firstElementChild!.className).toBe('schedule-bar')
    expect(box.parentElement!.lastElementChild).toBe(box)
    expect([box.getAttribute('tabindex'), box.getAttribute('role'), box.getAttribute('aria-label')]).toEqual(['0', 'region', 'Legs'])
    expect(box.querySelectorAll('.schedule-day').length).toBe(3)
  })

  it('takes the body’s full height away while it shows, which Safari before 15.4 makes taller than the window, and gives it back', () => {
    const { unmount } = render(page(LEGS, at(10)))
    expect(document.documentElement.classList.contains('schedule-open')).toBe(true)
    unmount()
    expect(document.documentElement.classList.contains('schedule-open')).toBe(false)
  })

  it('focuses the title before it scrolls, since Safari before 15 scrolls to whatever takes focus', () => {
    const calls: string[] = []
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {
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
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const { container, rerender } = render(page(LEGS, at(10)))
    rerender(page([...LEGS], at(30.5)))
    expect(rowsOf(container)[1]).toEqual(['leg glass leg-happening', 'leg glass leg-next homeward'])
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Yesterday', 'Today', 'Tomorrow'])
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('opens with the next leg’s day at the top of the list’s box, scrolling the box and not the window', () => {
    const windowScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } })
    const { container } = render(page(LEGS, at(10)))
    expect(scrollTo).toHaveBeenCalledWith(0, 640)
    expect(scrollTo.mock.contexts[0]).toBe(listBox(container))
    expect(windowScroll).not.toHaveBeenCalled()
  })

  it('opens at the top when the day it would open at has no legs', () => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    layOut({ days: { [THU]: 100 } })
    render(page(LEGS.slice(0, 1), at(36)))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('turns the heading stuck at the top of the list yellow, the last one within 20 px of it, as the list scrolls; today’s stays green', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})
    const frames = stubAnimationFrames()
    layOut({ headings: { [THU]: -300, [THU + 1]: 60, [THU + 2]: 900 } })
    const { container } = render(page(LEGS, at(10)))
    const pills = () => [...container.querySelectorAll('.day-pill')].map((p) => p.className)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
    layOut({ headings: { [THU]: -900, [THU + 1]: -100, [THU + 2]: 75 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(16)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill stuck'])
    layOut({ headings: { [THU]: 60, [THU + 1]: 900, [THU + 2]: 1400 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(32)
    expect(pills()).toEqual(['day-pill today', 'day-pill', 'day-pill'])
    // 21 px below the top of the list is too far.
    layOut({ headings: { [THU]: -900, [THU + 1]: 60, [THU + 2]: 81 } })
    fireEvent.scroll(listBox(container))
    await frames.frame(48)
    expect(pills()).toEqual(['day-pill today', 'day-pill stuck', 'day-pill'])
  })

  it('stops listening to the list’s scrolling and the window’s resizing once it’s gone', () => {
    const fromWindow = vi.spyOn(window, 'removeEventListener')
    const fromElements = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const { unmount } = render(page(LEGS, at(10)))
    unmount()
    expect(fromWindow.mock.calls.map(([type]) => type)).toContain('resize')
    expect(fromElements.mock.calls.map(([type]) => type)).toContain('scroll')
  })

  it('shows the app’s empty state when there are no legs at all', () => {
    const { container } = render(page([], at(10)))
    expect(screen.getByText('No schedule data')).toBeTruthy()
    expect(screen.getByText("Schedule will appear when your pilot's Duty app sends trip details.")).toBeTruthy()
    expect(container.querySelector('.schedule-day')).toBeNull()
  })
})

describe('SchedulePage’s calendar (slice 3B §3.1, §5)', () => {
  /** The days laid out as the list's box would hold them: Thursday at 100 px, Friday at 700 and Saturday at 1400. */
  const DAYS = { days: { [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 } }
  const day = (container: Element, n: number) => container.querySelector<HTMLElement>(`[data-calendar-day="${n}"]`)!
  const title = (container: Element) => container.querySelector('.calendar-title')!.textContent
  const scrolls = () => vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => {})

  it('sits between the bar and the list with its hairline, on this month with today selected', () => {
    const { container } = render(page(LEGS, at(10)))
    const calendar = container.querySelector('.calendar')!
    expect(calendar.previousElementSibling!.className).toBe('schedule-bar')
    expect(calendar.nextElementSibling!.className).toBe('calendar-rule')
    expect(calendar.nextElementSibling!.nextElementSibling!.className).toBe('schedule-days')
    expect(title(container)).toBe('October 2026')
    expect(day(container, THU).className).toBe('calendar-day today selected')
  })

  it('takes the list to a tapped day’s heading, gliding there from wherever it’s scrolled, and selects the day', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    listBox(container).scrollTop = 500
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1140, behavior: 'smooth' })
    expect(day(container, THU + 1).className).toBe('calendar-day selected')
    expect(day(container, THU).className).toBe('calendar-day today')
  })

  it('takes a day without legs to the latest day before it that has some, and leaves the list still for a day before every leg', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 3))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1340, behavior: 'smooth' })
    const calls = scrollTo.mock.calls.length
    fireEvent.click(day(container, THU - 1))
    expect(scrollTo.mock.calls.length).toBe(calls)
    expect(day(container, THU - 1).className).toBe('calendar-day selected')
  })

  it('takes today, while a leg is happening, to the day that leg started', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(26))) // Friday 2am, in the layover from Thursday
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 40, behavior: 'smooth' })
  })

  it('scrolls again for a tap on the day already selected, where the app does nothing', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 2))
    fireEvent.click(day(container, THU + 2))
    expect(scrollTo.mock.calls.slice(-2)).toEqual([[{ top: 1340, behavior: 'smooth' }], [{ top: 1340, behavior: 'smooth' }]])
  })

  it('turns to a greyed day’s month as it selects it', () => {
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU - 15)) // Wednesday 30 September
    expect(title(container)).toBe('September 2026')
    expect(day(container, THU - 15).className).toBe('calendar-day selected')
  })

  it('turns the month with the arrows, keeping the day selected and the list still', () => {
    const scrollTo = scrolls()
    const { container } = render(page(LEGS, at(10)))
    const calls = scrollTo.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(title(container)).toBe('November 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(title(container)).toBe('September 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(day(container, THU).className).toBe('calendar-day today selected')
    expect(scrollTo.mock.calls.length).toBe(calls)
  })

  it('goes back to this month and today with Current Event, and takes the list where it opened', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(day(container, THU + 19)) // Tuesday 3 November
    expect(title(container)).toBe('November 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(title(container)).toBe('October 2026')
    expect(day(container, THU).className).toBe('calendar-day today selected')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'smooth' })
  })

  it('picks a row’s day on the calendar and takes the list to it, unless it’s the selected day already, as in the app', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    const calls = scrollTo.mock.calls.length
    const row = (n: number) => container.querySelector<HTMLElement>(`[data-day="${n}"] .leg`)!
    fireEvent.click(row(THU))
    expect(scrollTo.mock.calls.length).toBe(calls)
    fireEvent.click(row(THU + 2))
    expect(day(container, THU + 2).className).toBe('calendar-day selected')
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1340, behavior: 'smooth' })
    fireEvent.click(row(THU + 2))
    expect(scrollTo.mock.calls.length).toBe(calls + 1)
  })

  it('jumps instead of gliding for a visitor who asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const scrollTo = scrolls()
    layOut(DAYS)
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 1))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'auto' })
  })

  it('keeps the selected day and the month when the clock runs and new data arrives', () => {
    const { container, rerender } = render(page(LEGS, at(10)))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(day(container, THU + 19))
    rerender(page([...LEGS], at(11)))
    expect(title(container)).toBe('November 2026')
    expect(day(container, THU + 19).className).toBe('calendar-day selected')
  })

  it('moves the time line once a minute, as the app’s does', () => {
    const { container, rerender } = render(page(LEGS, at(10)))
    const line = () => container.querySelector<HTMLElement>('.calendar-line')!.style.left
    const before = line()
    rerender(page(LEGS, at(10) + 59_000))
    expect(line()).toBe(before)
    rerender(page(LEGS, at(10) + 60_000))
    expect(line()).not.toBe(before)
  })

  it('turns the calendar to a tapped row’s month as it picks the row’s day', () => {
    scrolls()
    const { container } = render(page([...LEGS, duty('event', 'Dinner', null, T0 + 444, T0 + 446)], at(10))) // Monday 2 November, 11am
    fireEvent.click(container.querySelector<HTMLElement>(`[data-day="${THU + 18}"] .leg`)!)
    expect(title(container)).toBe('November 2026')
    expect(day(container, THU + 18).className).toBe('calendar-day selected')
  })

  it('picks the day a row’s leg starts, for a leg that runs overnight', () => {
    scrolls()
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 2)) // Saturday first, so Thursday isn't the selected day
    fireEvent.click(container.querySelectorAll<HTMLElement>(`[data-day="${THU}"] .leg`)[1]) // the layover, Thursday 7:45am to Friday 6:15am
    expect(day(container, THU).className).toBe('calendar-day today selected')
  })

  it('moves nothing with Current Event when the day it would go to has no legs', () => {
    const scrollTo = scrolls()
    layOut(DAYS)
    render(page(LEGS.slice(0, 1), at(36))) // Friday noon: nothing next, nothing happening, and no legs today
    const calls = scrollTo.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(scrollTo.mock.calls.length).toBe(calls)
  })

  it('leaves the selected day alone as the list is scrolled by hand', () => {
    scrolls()
    const { container } = render(page(LEGS, at(10)))
    fireEvent.click(day(container, THU + 2))
    fireEvent.scroll(listBox(container))
    expect(day(container, THU + 2).className).toBe('calendar-day selected')
  })

  it('keeps focus on a tapped day', () => {
    scrolls()
    const { container } = render(page(LEGS, at(10)))
    day(container, THU + 2).focus()
    fireEvent.click(day(container, THU + 2))
    expect(document.activeElement).toBe(day(container, THU + 2))
  })

  it('moves today’s ring at midnight, keeping the selected day and the month', () => {
    const { container, rerender } = render(page(LEGS, at(23.5))) // Thursday 11:30pm
    rerender(page(LEGS, at(24.5))) // Friday 12:30am
    expect(day(container, THU + 1).className).toBe('calendar-day today')
    expect(day(container, THU).className).toBe('calendar-day selected')
    expect(title(container)).toBe('October 2026')
  })

  it('still shows the calendar, without bars, over the empty state when there are no legs', () => {
    const { container } = render(page([], at(10)))
    expect(container.querySelector('.calendar')).not.toBeNull()
    expect(container.querySelector('.calendar-bar')).toBeNull()
    expect(screen.getByText('No schedule data')).toBeTruthy()
  })

  it('starts the weeks on the first day of the visitor’s region when no test gives one', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    render(<SchedulePage legs={LEGS} pilot={pilot('LEX', 'SDF')} now={at(10)} timeZone={NY} h24={false} airports={testAirports} onBack={() => {}} />)
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('Monday')
  })
})

describe('SchedulePage on a short window (slice 3B §3.2)', () => {
  /** A window `height` px tall, as matchMedia sees it, with the change event a turn of the phone sends. */
  function windowOf(height: number) {
    const listeners = new Set<() => void>()
    const tall = {
      get matches() {
        return height >= 500
      },
      media: '(min-height: 500px)',
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }
    vi.stubGlobal('matchMedia', (query: string) => (query === tall.media ? tall : { matches: false, media: query }))
    return {
      listeners,
      turn(to: number) {
        height = to
        act(() => listeners.forEach((listener) => listener()))
      },
    }
  }

  it('pins the calendar under the bar on a window 500 px tall', () => {
    windowOf(500)
    const { container } = render(page(LEGS, at(10)))
    expect(container.querySelector('.calendar')!.parentElement!.className).toBe('schedule')
  })

  it('puts the calendar and its hairline at the top of the list on a shorter window, to scroll away with it', () => {
    windowOf(499)
    const { container } = render(page(LEGS, at(10)))
    expect([...listBox(container).children].slice(0, 3).map((el) => el.className)).toEqual(['calendar', 'calendar-rule', 'schedule-list'])
    expect(container.querySelector('.schedule')!.children[1]).toBe(listBox(container))
  })

  /**
   * Lays the page out as a browser would: the list's box from 60 px down, 315 px tall, and each day's 300 px section
   * `offsets` px into the list. The box's scroll moves the sections, and so does the calendar when it sits in the box:
   * its 91.5 px and 50 px a week row come first.
   */
  function layOutLive(offsets: Record<number, number>) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const box = document.querySelector<HTMLElement>('.schedule-days')!
      const calendar = box.querySelector('.calendar') ? 91.5 + 50 * box.querySelectorAll('.calendar-week').length : 0
      const day = Number((this.closest('[data-day]') as HTMLElement | null)?.dataset.day)
      const top = this === box ? 60 : this.classList.contains('schedule-day') ? 60 + calendar + (offsets[day] ?? 5000) - box.scrollTop : 0
      const height = this === box ? 315 : 300
      return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) } as DOMRect
    })
  }
  const sectionTop = (container: Element, day: number) => container.querySelector<HTMLElement>(`[data-day="${day}"]`)!.getBoundingClientRect().top

  it('keeps the list where it was as the phone turns, both ways: the day showing at its top stays as far down as it was', () => {
    const phone = windowOf(800)
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    layOutLive({ [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 })
    const { container } = render(page(LEGS, at(10)))
    expect(listBox(container).scrollTop).toBe(700) // opened at Friday
    listBox(container).scrollTop = 740 // and scrolled 40 px into it
    expect(sectionTop(container, THU + 1)).toBe(20)
    phone.turn(400)
    expect(listBox(container).firstElementChild!.className).toBe('calendar')
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1081.5)
    expect(sectionTop(container, THU + 1)).toBe(20)
    phone.turn(800)
    expect(container.querySelector('.calendar')!.parentElement!.className).toBe('schedule')
    expect(scrollTo).toHaveBeenLastCalledWith(0, 740)
    expect(sectionTop(container, THU + 1)).toBe(20)
  })

  it('goes back to the top of the list when the calendar filled the box and no day showed', () => {
    const phone = windowOf(400)
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    layOutLive({ [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 })
    const { container } = render(page(LEGS, at(10)))
    listBox(container).scrollTop = 0
    phone.turn(800)
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('gives focus back to the calendar’s control the move rebuilt', () => {
    const phone = windowOf(800)
    const { container } = render(page(LEGS, at(10)))
    screen.getByRole('button', { name: 'Next month' }).focus()
    phone.turn(400)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next month' }))
    container.querySelector<HTMLElement>(`[data-calendar-day="${THU + 5}"]`)!.focus()
    phone.turn(800)
    expect(document.activeElement).toBe(container.querySelector(`[data-calendar-day="${THU + 5}"]`))
  })

  it('takes the list to a tap’s day after the page has redrawn, as the calendar in it grows or shrinks with the month', () => {
    windowOf(400)
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    layOutLive({ [THU]: 100, [THU + 1]: 700, [THU + 2]: 1400 })
    const { container } = render(page(LEGS, at(10)))
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Next month' })) // January 2027: six week rows
    expect(container.querySelectorAll('.calendar-week').length).toBe(6)
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' })) // back to October's five
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1041.5, behavior: 'smooth' })
  })

  it('stops listening for the window’s height once it’s gone', () => {
    const phone = windowOf(800)
    const { unmount } = render(page(LEGS, at(10)))
    expect(phone.listeners.size).toBe(1)
    unmount()
    expect(phone.listeners.size).toBe(0)
  })
})
