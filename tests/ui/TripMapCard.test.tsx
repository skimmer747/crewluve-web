// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTripMap } from '../../src/map/tripMap'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

const NY = 'America/New_York'
const card = (now: number, extra = {}) => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
  const onOpenMap = vi.fn()
  const onOpenTracking = vi.fn()
  render(
    <TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={4} delayMinutes={null} land={null}
      onOpenMap={onOpenMap} onOpenTracking={onOpenTracking} {...extra} />,
  )
  return { map, onOpenMap, onOpenTracking }
}

describe('the trip map card (moving map spec §5)', () => {
  afterEach(cleanup)

  it('opens the full map from the map, named by its one-sentence summary', () => {
    const { onOpenMap } = card(at(12))
    fireEvent.click(screen.getByRole('button', { name: /^Trip map\. Alex is in Cologne\./ }))
    expect(onOpenMap).toHaveBeenCalled()
  })

  it('shows the day, cities and miles on the ground', () => {
    card(at(12))
    expect(screen.getByText('Day 1 of 4')).toBeTruthy()
    expect(screen.getByText('2 cities')).toBeTruthy()
  })

  it('shows the flight and its landing in the air, and the flight number opens tracking', () => {
    const { map, onOpenTracking } = card(at(4))
    expect(screen.getByText('Lands 3:00 PM')).toBeTruthy()
    const number = screen.getByRole('button', { name: `${map.legs[0].flightNumber}. Opens flight tracking.` })
    fireEvent.click(number)
    expect(onOpenTracking).toHaveBeenCalledWith(number)
  })

  it('shows the delay banner in the air', () => {
    card(at(4), { delayMinutes: 45 })
    expect(document.querySelector('.inflight-banner.late')).toBeTruthy()
  })
})
