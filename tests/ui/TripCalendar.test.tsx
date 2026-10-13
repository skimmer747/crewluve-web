// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { dayOf } from '../../src/time/zoned'
import type { Month } from '../../src/ui/calendarFacts'
import { TripCalendar, type TripCalendarProps } from '../../src/ui/TripCalendar'
import { drive, flight, H, place } from '../fixtures/legs'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
const OCT: Month = { year: 2026, month: 10 }
/** Monday 12 Oct 2026, today in these tests, and its midnight in New York in the fixtures' hours. */
const TODAY = dayOf(2026, 10, 12)
const MON = Date.UTC(2026, 9, 12, 4) / H
const LEGS: Leg[] = [
  drive('LEX', 'SDF', false, MON + 13.75, MON + 15),
  flight('SDF', 'RFD', MON + 16.25, MON + 17.75, 'T1'),
  place('turn', 'RFD', MON + 17.75, MON + 19, 'T1'),
  flight('RFD', 'ANC', MON + 19, MON + 24.5, 'T1'),
  place('layover', 'ANC', MON + 24.5, MON + 41.25, 'T1'),
  flight('ANC', 'SDF', MON + 41.25, MON + 46.25, 'T1'),
]

function calendar(props: Partial<TripCalendarProps> = {}) {
  const handlers = { onSelect: vi.fn(), onMonth: vi.fn(), onCurrentEvent: vi.fn() }
  const result = render(
    <TripCalendar month={OCT} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={TODAY} {...handlers} {...props} />,
  )
  return { ...result, ...handlers }
}

const dayButton = (container: Element, day: number) => container.querySelector<HTMLElement>(`[data-calendar-day="${day}"]`)!
/** Where an element sits in its week, as hours from the week's start, from its left edge and its width. */
const hoursAt = (percent: string) => Math.round(((parseFloat(percent) * 7) / 100) * 24 * 100) / 100
const span = (el: HTMLElement) => [hoursAt(el.style.left), hoursAt(el.style.left) + hoursAt(el.style.width)]

describe('TripCalendar (slice 3B §4)', () => {
  it('shows the month between its arrows and Current Event, and the weekday letters named in full', () => {
    const { container } = calendar()
    const header = container.querySelector('.calendar-header')!
    expect([...header.children].map((el) => el.className)).toEqual([
      'calendar-arrow', 'calendar-space', 'calendar-title', 'calendar-space', 'calendar-now', 'calendar-space', 'calendar-arrow',
    ])
    expect(screen.getByRole('button', { name: 'Previous month' }).querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    expect(screen.getByRole('button', { name: 'Next month' }).querySelector('polyline')!.getAttribute('points')).toBe('1.5,1.5 6.5,7 1.5,12.5')
    expect(screen.getByRole('button', { name: 'Current Event' }).className).toBe('calendar-now')
    const title = header.querySelector('.calendar-title')!
    expect([title.textContent, title.getAttribute('aria-live')]).toEqual(['October 2026', 'polite'])
    expect(screen.getByRole('grid').getAttribute('aria-labelledby')).toBe(title.id)
    const columns = screen.getAllByRole('columnheader')
    expect(columns.map((c) => c.textContent).join('')).toBe('SMTWTFS')
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
  })

  it('lays the month out in weeks, with the days of the months either side', () => {
    const { container } = calendar()
    const weeks = [...container.querySelectorAll('.calendar-week')]
    expect(weeks.map((w) => [...w.querySelectorAll('.calendar-day')].map((d) => d.textContent).join(' '))).toEqual([
      '27 28 29 30 1 2 3', '4 5 6 7 8 9 10', '11 12 13 14 15 16 17', '18 19 20 21 22 23 24', '25 26 27 28 29 30 31',
    ])
    expect(weeks.every((w) => w.getAttribute('role') === 'row')).toBe(true)
    expect(dayButton(container, dayOf(2026, 9, 30)).className).toBe('calendar-day other')
    expect(dayButton(container, dayOf(2026, 10, 1)).className).toBe('calendar-day')
    expect(dayButton(container, dayOf(2026, 10, 15)).getAttribute('aria-label')).toBe('Thursday, October 15')
  })

  it('marks today with a ring and the selected day with a filled circle, for screen readers too', () => {
    const { container, rerender } = calendar()
    const today = dayButton(container, TODAY)
    expect([today.className, today.getAttribute('aria-current'), today.parentElement!.getAttribute('aria-selected')]).toEqual([
      'calendar-day today selected', 'date', 'true',
    ])
    const thursday = dayOf(2026, 10, 15)
    rerender(<TripCalendar month={OCT} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY} selected={thursday}
      onSelect={() => {}} onMonth={() => {}} onCurrentEvent={() => {}} />)
    expect([today.className, today.parentElement!.getAttribute('aria-selected')]).toEqual(['calendar-day today', 'false'])
    const selected = dayButton(container, thursday)
    expect([selected.className, selected.getAttribute('aria-current'), selected.parentElement!.getAttribute('aria-selected')]).toEqual([
      'calendar-day selected', null, 'true',
    ])
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(35)
  })

  it('reports a tap on a day, a day of the month before, the arrows, and Current Event', () => {
    const { container, onSelect, onMonth, onCurrentEvent } = calendar()
    fireEvent.click(dayButton(container, dayOf(2026, 10, 15)))
    fireEvent.click(dayButton(container, dayOf(2026, 9, 30)))
    expect(onSelect.mock.calls).toEqual([[dayOf(2026, 10, 15)], [dayOf(2026, 9, 30)]])
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onMonth.mock.calls).toEqual([[{ year: 2026, month: 9 }], [{ year: 2026, month: 11 }]])
    fireEvent.click(screen.getByRole('button', { name: 'Current Event' }))
    expect(onCurrentEvent).toHaveBeenCalledTimes(1)
  })

  it('draws each week’s bars by kind, rounded where the trip starts and ends, with the layover’s code, hidden from screen readers', () => {
    const { container } = calendar()
    const week = container.querySelectorAll('.calendar-week')[2]
    const art = week.querySelector<HTMLElement>('.calendar-art')!
    expect(art.getAttribute('aria-hidden')).toBe('true')
    const bars = [...art.querySelectorAll<HTMLElement>('.calendar-bar')]
    expect(bars.map((b) => b.className)).toEqual([
      'calendar-bar bar-rest round-start round-end',
      'calendar-bar bar-duty round-start',
      'calendar-bar bar-duty',
      'calendar-bar bar-duty',
      'calendar-bar bar-rest',
      'calendar-bar bar-duty round-end',
    ])
    expect(bars.map(span)).toEqual([[37.75, 39], [40.25, 41.75], [41.75, 43], [43, 48.5], [48.5, 65.25], [65.25, 70.25]])
    const code = art.querySelector<HTMLElement>('.calendar-code')!
    expect(code.textContent).toBe('ANC')
    expect((parseFloat(code.style.left) * 7 * 24) / 100).toBeCloseTo((48.5 + 65.25) / 2, 6)
    expect(container.querySelectorAll('.calendar-week')[1].querySelector('.calendar-bar')).toBeNull()
  })

  it('draws the time line in the week of now only, at now, and none when now is outside the month shown', () => {
    const { container, rerender } = calendar()
    const lines = [...container.querySelectorAll<HTMLElement>('.calendar-line')]
    expect(lines).toHaveLength(1)
    expect(lines[0].closest('.calendar-week')).toBe(container.querySelectorAll('.calendar-week')[2])
    expect(hoursAt(lines[0].style.left)).toBe(41)
    rerender(<TripCalendar month={{ year: 2026, month: 12 }} firstDay={0} legs={LEGS} now={(MON + 17) * H} timeZone={NY} today={TODAY}
      selected={TODAY} onSelect={() => {}} onMonth={() => {}} onCurrentEvent={() => {}} />)
    expect(container.querySelector('.calendar-line')).toBeNull()
  })

  it('draws six grid lines down every week, after its bars so they cross them, as the app lays its lines over', () => {
    const { container } = calendar()
    for (const art of container.querySelectorAll('.calendar-art')) {
      const lines = [...art.querySelectorAll<HTMLElement>('.calendar-vline')]
      expect(lines.map((l) => Math.round(parseFloat(l.style.left) * 7) / 100)).toEqual([1, 2, 3, 4, 5, 6])
      expect(art.lastElementChild).toBe(lines[5])
    }
  })

  it('starts the weeks on Monday for a visitor whose week does', () => {
    const { container } = calendar({ firstDay: 1 })
    expect(screen.getAllByRole('columnheader')[0].getAttribute('aria-label')).toBe('Monday')
    expect(container.querySelector('.calendar-day')!.textContent).toBe('28')
  })
})
