// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAirportIndex } from '../../src/data/airports'
import { makeTripFacts } from '../../src/facts/tripFacts'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { chipInsets, TripMapCard } from '../../src/ui/TripMapCard'
import { AIRPORTS, at, EUROPE, flight } from '../map/tripMapLegs'

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

describe('the card’s chips and its camera', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('works out the band each chip covers, from the map’s edge', () => {
    expect(chipInsets(26, 26)).toEqual({ top: 40, right: 0, bottom: 40, left: 0 })
    expect(chipInsets(0, 30)).toEqual({ top: 0, right: 0, bottom: 44, left: 0 })
  })

  it('keeps the trip and the pilot’s marker clear of the chips: a layover in Miami sits above the "Next" chip', () => {
    const airports = buildAirportIndex([
      ['SDF', 'Louisville', 'US', 38.1744, -85.736, 'America/New_York', 'KY'],
      ['MIA', 'Miami', 'US', 25.7959, -80.287, 'America/New_York', 'FL'],
    ])
    const map = makeTripMap([flight('f1', 'SDF', 'MIA', 0, 2.5), flight('f2', 'MIA', 'SDF', 24, 2.5)], {
      isNextTrip: false, home: 'SDF', now: at(10), airports,
    })!
    const marker = () => Number(document.querySelector('.trip-map-pilot circle')!.getAttribute('cy'))
    const draw = () =>
      render(<TripMapCard map={map} now={at(10)} viewerTz={NY} h24={false} name="Alex" day={1} days={2} delayMinutes={null} land={null}
        onOpenMap={() => {}} />)
    // Unmeasured (as happy-dom lays nothing out), the chips cover nothing, and Miami sits in the bottom chip's band.
    draw()
    expect(marker()).toBeGreaterThan(220 - 40)
    cleanup()
    // With each chip 26 px tall, the camera keeps the trip between them: from 40 px down to 40 px from the bottom.
    const measured = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('trip-map-chip') ? DOMRect.fromRect({ width: 200, height: 26 }) : measured.call(this)
    })
    draw()
    expect(marker()).toBeGreaterThanOrEqual(40)
    expect(marker()).toBeLessThanOrEqual(220 - 40)
  })

  it('slides the map to show the marker when the chips are too tall to leave a band, as at large text sizes', () => {
    const airports = buildAirportIndex([
      ['SDF', 'Louisville', 'US', 38.1744, -85.736, 'America/New_York', 'KY'],
      ['MIA', 'Miami', 'US', 25.7959, -80.287, 'America/New_York', 'FL'],
    ])
    const map = makeTripMap([flight('f1', 'SDF', 'MIA', 0, 2.5), flight('f2', 'MIA', 'SDF', 24, 2.5)], {
      isNextTrip: false, home: 'SDF', now: at(10), airports,
    })!
    // Chips 60 px tall cover 74 px from each edge, leaving 72 px between them: too little to frame the trip in, so it
    // fills the map, and then the view slides the marker into that band.
    const measured = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('trip-map-chip') ? DOMRect.fromRect({ width: 200, height: 60 }) : measured.call(this)
    })
    render(<TripMapCard map={map} now={at(10)} viewerTz={NY} h24={false} name="Alex" day={1} days={2} delayMinutes={null} land={null}
      onOpenMap={() => {}} />)
    // The marker, with its 12 px radius and 8 px margin, lies in the band: its centre from 94 to 126 px down.
    const y = Number(document.querySelector('.trip-map-pilot circle')!.getAttribute('cy'))
    expect(y).toBeGreaterThanOrEqual(74 + 20)
    expect(y).toBeLessThanOrEqual(220 - 74 - 20)
  })
})
