// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UpcomingTrip } from '../../src/engine/trips'
import { Chevron } from '../../src/ui/Chevron'
import { CountdownCard } from '../../src/ui/CountdownCard'
import { FallbackCard } from '../../src/ui/FallbackCard'
import { SCHEDULE_HASH, ViewScheduleLink, type ScheduleLinkName } from '../../src/ui/ScheduleLink'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

const NOW = Date.UTC(2026, 9, 9, 12)
const leaveCard = (onOpen?: (name: ScheduleLinkName) => void) => (
  <CountdownCard title="Leaves Home In" icon="Car" color="blue" target={NOW + 3_600_000} now={NOW} subtitle={null}
    link={onOpen && { name: 'leave', onOpen }} />
)
const trip: UpcomingTrip = { tripId: 't1', departs: NOW + 86_400_000, days: 2, route: ['SDF', 'RFD'], delayMinutes: 40 }

describe('Chevron', () => {
  it('draws SF Symbols’ chevron as a line with round ends, right or left, hidden from screen readers', () => {
    const { container, rerender } = render(<Chevron />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect([svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('viewBox')]).toEqual(['8', '14', '0 0 8 14'])
    const line = svg.querySelector('polyline')!
    expect(line.getAttribute('points')).toBe('1.5,1.5 6.5,7 1.5,12.5')
    expect([line.getAttribute('stroke'), line.getAttribute('stroke-width'), line.getAttribute('stroke-linecap')]).toEqual(['currentColor', '2', 'round'])
    rerender(<Chevron direction="left" size={17} weight={2.4} />)
    expect(container.querySelector('polyline')!.getAttribute('points')).toBe('6.5,1.5 1.5,7 6.5,12.5')
    expect(container.querySelector('svg')!.getAttribute('height')).toBe('17')
    expect(container.querySelector('polyline')!.getAttribute('stroke-width')).toBe('2.4')
  })
})

describe('the cards that open the schedule (slice 3A §3.1)', () => {
  it('ends the countdown card’s top row with a link named Schedule to the schedule’s address, and marks the card', () => {
    const { container } = render(leaveCard(() => {}))
    const link = screen.getByRole('link', { name: 'Schedule' })
    expect(link.getAttribute('href')).toBe(SCHEDULE_HASH)
    expect(link.getAttribute('data-schedule-link')).toBe('leave')
    expect(link.parentElement!.className).toBe('countdown-head')
    expect(link.previousElementSibling!.tagName).toBe('H2')
    expect(link.querySelector('svg polyline')).not.toBeNull()
    expect(container.querySelector('section')!.className).toBe('card glass countdown linked')
  })

  it('leaves a card without a link as it was', () => {
    const { container } = render(leaveCard())
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelector('section')!.className).toBe('card glass countdown')
  })

  it('opens the schedule on a plain click, and leaves a click with a modifier key or another button to the browser', () => {
    const onOpen = vi.fn()
    render(leaveCard(onOpen))
    const link = screen.getByRole('link', { name: 'Schedule' })
    // Records whether the card's own handler took the click, then keeps the test page where it is.
    const taken: boolean[] = []
    const record = (e: Event) => {
      taken.push(e.defaultPrevented)
      e.preventDefault()
    }
    document.addEventListener('click', record)
    try {
      fireEvent.click(link)
      for (const init of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) fireEvent.click(link, init)
    } finally {
      document.removeEventListener('click', record)
    }
    expect(taken).toEqual([true, false, false, false, false, false])
    expect(onOpen.mock.calls).toEqual([['leave']])
  })

  it('opens the schedule from a tap anywhere on the card, once, as the app’s card button does', () => {
    const onOpen = vi.fn()
    render(leaveCard(onOpen))
    fireEvent.click(screen.getByRole('heading', { level: 2 }))
    expect(onOpen.mock.calls).toEqual([['leave']])
    fireEvent.click(screen.getByRole('link', { name: 'Schedule' }))
    expect(onOpen.mock.calls).toEqual([['leave'], ['leave']])
  })

  it('gives the ~N days card and the upcoming trip card the same link, the trip card’s after its delay badge', () => {
    render(<FallbackCard daysRemaining={2} link={{ name: 'fallback', onOpen: () => {} }} />)
    expect(screen.getByRole('link', { name: 'Schedule' }).getAttribute('data-schedule-link')).toBe('fallback')
    cleanup()
    const { container } = render(
      <UpcomingTripCard trip={trip} now={NOW} timeZone="America/New_York" h24={false} airports={testAirports} link={{ name: 'trip', onOpen: () => {} }} />,
    )
    const link = screen.getByRole('link', { name: 'Schedule' })
    expect(link.getAttribute('data-schedule-link')).toBe('trip')
    expect(link.parentElement!.className).toBe('trip-head')
    expect(link.previousElementSibling!.className).toBe('badge')
    expect(container.querySelector('section')!.className).toBe('card glass trip-card linked')
  })

  it('presses the card in while a pointer holds any part of it, and lets go when it lifts, leaves or turns into a scroll', () => {
    const { container } = render(leaveCard(() => {}))
    const card = container.querySelector('section')!
    for (const part of [screen.getByRole('heading', { level: 2 }), screen.getByRole('link', { name: 'Schedule' })]) {
      for (const end of ['pointerUp', 'pointerLeave', 'pointerCancel'] as const) {
        fireEvent.pointerDown(part, { button: 0 })
        expect(card.className).toBe('card glass countdown linked pressed')
        fireEvent[end](card)
        expect(card.className).toBe('card glass countdown linked')
      }
    }
    fireEvent.pointerDown(card, { button: 2 })
    expect(card.className).toBe('card glass countdown linked')
  })
})

describe('ViewScheduleLink (slice 3A §3.2)', () => {
  it('is one link named View Schedule, with the blue calendar and a small chevron, that opens the schedule', () => {
    const onOpen = vi.fn()
    render(<ViewScheduleLink onOpen={onOpen} />)
    const link = screen.getByRole('link', { name: 'View Schedule' })
    expect(link.getAttribute('href')).toBe(SCHEDULE_HASH)
    expect(link.getAttribute('data-schedule-link')).toBe('view')
    expect(link.className).toBe('card glass view-schedule linked')
    expect(iconNameOf(link.querySelector('svg.icon'))).toBe('CalendarBlank')
    expect(link.querySelector('.chevron')!.getAttribute('height')).toBe('12')
    expect(fireEvent.click(link)).toBe(false)
    expect(onOpen).toHaveBeenCalledWith('view')
    fireEvent.pointerDown(link, { button: 0 })
    expect(link.className).toBe('card glass view-schedule linked pressed')
    fireEvent.pointerUp(link)
    expect(link.className).toBe('card glass view-schedule linked')
  })
})
