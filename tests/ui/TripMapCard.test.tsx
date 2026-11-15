// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTripFacts } from '../../src/facts/tripFacts'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { fakeMapKit } from '../fixtures/fakeMapKit'
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

describe('the card on Apple’s map (Apple Maps spec §4.2)', () => {
  // The cards rendered above already tried MapKit, which tests refuse: start this block afresh.
  beforeEach(() => resetAppleMapKit())
  afterEach(() => {
    cleanup()
    resetAppleMapKit()
    localStorage.clear()
  })

  it('shows Apple’s map in the kept style, still, and opens the full map when tapped', async () => {
    localStorage.setItem('crewluve.mapStyle.v1', 'satellite')
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const { onOpenMap } = card(at(12))
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].mapType).toBe('satellite')
    expect(kit.maps[0].options).toMatchObject({ isScrollEnabled: false, isZoomEnabled: false, showsZoomControl: false })
    fireEvent.click(screen.getByRole('button', { name: /^Trip map\. Alex is in Cologne\./ }))
    expect(onOpenMap).toHaveBeenCalled()
  })
})

describe('the card’s facts (Stage 2 spec §6.4, §6.5)', () => {
  afterEach(cleanup)
  const show = (map: TripMap, now: number) => {
    const facts = makeTripFacts(map, { geography: null, comparisons: null, viewerTz: NY, h24: false })
    return render(<TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={null} days={null} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
  }

  it('in flight, puts the headline on the chip: a cockpit sunset coming up', () => {
    const { container } = show(makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(5.5), airports: AIRPORTS })!, at(5.5))
    expect(container.querySelector('.trip-map-chip.bottom')!.textContent).toMatch(/^Sunset from the cockpit in \d+ min$/)
  })

  it('for a day after the trip, is its recap', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(75), airports: AIRPORTS })!
    const { container } = show(map, at(75))
    expect(screen.getByRole('heading', { name: 'Trip recap' })).toBeTruthy()
    expect(container.querySelector('.trip-map-chip.top')!.textContent).toBe('Home from 4 days away')
    expect(container.querySelector('.trip-map-chip.bottom')!.textContent).toBe('Replay the trip')
    expect([...container.querySelectorAll('.trip-recap-tiles li')].map((li) => li.textContent)).toEqual(['2cities', '14,819miles', '18time zones', '1sunset aloft'])
    expect(screen.getByText('Longest: Dubai → Louisville, 7,382 mi')).toBeTruthy()
    expect(container.querySelector('.trip-map-stats')).toBeNull()
    expect(container.querySelector('[data-trip-map-open]')!.getAttribute('aria-label')).toBe(
      'Trip recap: home from 4 days away. 2 cities, 14,819 miles, 18 time zones, 1 sunset from the cockpit. ' +
        'Longest flight, Dubai to Louisville, 7,382 miles. Opens the map to replay the trip.',
    )
  })
})
