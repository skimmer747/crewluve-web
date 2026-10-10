// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { UpcomingTrip } from '../../src/engine/trips'
import { UpcomingTripCard } from '../../src/ui/UpcomingTripCard'
import { testAirports } from '../fixtures/airports'

afterEach(cleanup)

const NY = 'America/New_York'
const NOW = Date.UTC(2026, 9, 8, 13, 30) // Thu 8 Oct, 9:30am EDT

describe('UpcomingTripCard', () => {
  const trip = (over: Partial<UpcomingTrip> = {}): UpcomingTrip => ({
    tripId: 't1',
    departs: Date.UTC(2026, 9, 9, 10, 30), // Fri 9 Oct, 6:30am EDT
    days: 2,
    route: ['SDF', 'RFD', 'ANC'],
    delayMinutes: null,
    ...over,
  })
  const card = (t: UpcomingTrip, h24 = false) => <UpcomingTripCard trip={t} now={NOW} timeZone={NY} h24={h24} airports={testAirports} />

  it('shows the Line Trip badge, when it departs, and how long it lasts', () => {
    render(card(trip()))
    expect(screen.getByText('Line Trip')).toBeTruthy()
    expect(screen.getByText('Departs tomorrow at 6:30am')).toBeTruthy()
    expect(screen.getByText('2 days')).toBeTruthy()
  })

  it('draws the route with blue ends, and reads it to screen readers as cities', () => {
    const { container } = render(card(trip()))
    const stops = [...container.querySelectorAll('.route-stop')]
    expect(stops.map((s) => s.textContent)).toEqual(['SDF', 'RFD', 'ANC'])
    expect(stops.map((s) => s.classList.contains('end'))).toEqual([true, false, true])
    expect(container.querySelectorAll('.route-line')).toHaveLength(2)
    expect(container.querySelector('.route-stops')!.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.route .sr-only')!.textContent).toBe('Route: Louisville, Rockford, Anchorage')
  })

  it('flags a delayed or early departure, and nothing when on time', () => {
    const { rerender } = render(card(trip({ delayMinutes: 40 })))
    expect(screen.getByText('Delayed')).toBeTruthy()
    rerender(card(trip({ delayMinutes: -20 })))
    expect(screen.getByText('Early')).toBeTruthy()
    rerender(card(trip()))
    expect(screen.queryByText('Delayed')).toBeNull()
    expect(screen.queryByText('Early')).toBeNull()
  })

  it('says "1 day" for a one-day trip, and uses 24-hour time when asked', () => {
    render(card(trip({ days: 1 }), true))
    expect(screen.getByText('1 day')).toBeTruthy()
    expect(screen.getByText('Departs tomorrow at 06:30')).toBeTruthy()
  })
})
