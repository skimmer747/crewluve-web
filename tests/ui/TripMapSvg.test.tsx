// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTripMap } from '../../src/map/tripMap'
import { PILOT_ICONS, TripMapSvg } from '../../src/ui/TripMapSvg'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

afterEach(cleanup)

const labels = (container: Element) => [...container.querySelectorAll('.trip-map-airport text')].map((t) => t.textContent)

describe('the trip map drawing (moving map spec §7.1)', () => {
  it('prints each airport’s code on a map framed on the whole trip', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const { container } = render(<TripMapSvg map={map} t={at(12)} width={390} height={500} focus={null} land={null} nightStep={60_000} />)
    expect(labels(container).sort()).toEqual(['CGN', 'DXB', 'SDF'])
  })

  it('leaves out a flight airport’s label that would print over another, and keeps its dot', () => {
    // Louisville and Lexington are 60 miles apart: on a view of the world they land a few pixels apart. Here both are
    // flown from, so both dots stay.
    const legs = [flight('f0', 'SDF', 'LEX', 0, 1), ...EUROPE.slice(0, 1).map((l) => ({ ...l, dep: 'LEX' }))]
    const map = makeTripMap(legs, { isNextTrip: false, home: 'SDF', now: at(0.5), airports: AIRPORTS })!
    const { container } = render(<TripMapSvg map={map} t={at(0.5)} width={390} height={500} focus={null} land={null} nightStep={60_000} />)
    expect(container.querySelectorAll('.trip-map-airport circle').length).toBe(3)
    expect(labels(container)).toHaveLength(2)
    expect(labels(container).join('')).not.toContain('SDLEX')
  })

  it('lets an airport only drives reach give way, dot and code, where it crowds another, and shows it zoomed in (tidy markers design §2)', () => {
    // A commuter's drive from Louisville to Lexington, then the flight to Cologne: only the drive reaches Louisville.
    const legs = [drive('d1', 'SDF', 'LEX', 0, 1), ...EUROPE.slice(0, 1).map((l) => ({ ...l, dep: 'LEX' }))]
    const map = makeTripMap(legs, { isNextTrip: false, home: 'SDF', now: at(0.5), airports: AIRPORTS })!
    const draw = (focus: typeof map.legs[number] | null) =>
      render(<TripMapSvg map={map} t={at(0.5)} width={390} height={500} focus={focus} land={null} nightStep={60_000} />).container
    expect(labels(draw(null)).sort()).toEqual(['CGN', 'LEX'])
    expect(document.querySelectorAll('.trip-map-airport circle').length).toBe(2)
    cleanup()
    // Framed on the drive, the two are far enough apart.
    expect(labels(draw(map.legs[0])).sort()).toEqual(['CGN', 'LEX', 'SDF'])
  })

  it('keeps every airport clear of a panel over the left side (Stage 2 spec §10)', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const xs = (insets?: { top: number; right: number; bottom: number; left: number }) => {
      const { container, unmount } = render(<TripMapSvg map={map} t={at(12)} width={1000} height={500} focus={null} land={null} nightStep={60_000} insets={insets} />)
      const found = [...container.querySelectorAll('.trip-map-airport circle')].map((c) => Number(c.getAttribute('cx')))
      unmount()
      return found
    }
    expect(Math.min(...xs())).toBeLessThan(400)
    expect(Math.min(...xs({ top: 0, right: 0, bottom: 0, left: 400 }))).toBeGreaterThanOrEqual(400)
  })
})

describe("the pilot's marker (activity markers design §2)", () => {
  const draw = (t: number, isNextTrip = false) => {
    const map = makeTripMap(EUROPE, { isNextTrip, home: 'SDF', now: t, airports: AIRPORTS })!
    return render(<TripMapSvg map={map} t={t} width={390} height={220} focus={null} land={null} nightStep={60_000} />).container
  }

  it('shows what the pilot is doing on the ground in its color: a layover in Cologne, home before a next trip', () => {
    expect(draw(at(12)).querySelector('.trip-map-pilot')?.getAttribute('class')).toBe('trip-map-pilot activity-layover')
    cleanup()
    expect(draw(at(-2), true).querySelector('.trip-map-pilot')?.getAttribute('class')).toBe('trip-map-pilot activity-home')
  })

  it('gives way to the plane in the air', () => {
    const svg = draw(at(4))
    expect(svg.querySelector('.trip-map-pilot')).toBeNull()
    expect(svg.querySelector('.trip-map-plane')).not.toBeNull()
  })

  it("draws the design's symbols: a bed, an hourglass, a briefcase and a house", () => {
    expect(PILOT_ICONS).toEqual({ layover: 'Bed', turn: 'Hourglass', base: 'Briefcase', home: 'House' })
  })
})
