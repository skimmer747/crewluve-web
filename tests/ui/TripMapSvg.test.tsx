// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTripMap } from '../../src/map/tripMap'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { AIRPORTS, at, drive, EUROPE } from '../map/tripMapLegs'

afterEach(cleanup)

const labels = (container: Element) => [...container.querySelectorAll('.trip-map-airport text')].map((t) => t.textContent)

describe('the trip map drawing (moving map spec §7.1)', () => {
  it('prints each airport’s code on a map framed on the whole trip', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    const { container } = render(<TripMapSvg map={map} t={at(12)} width={390} height={500} focus={null} land={null} nightStep={60_000} />)
    expect(labels(container).sort()).toEqual(['CGN', 'DXB', 'SDF'])
  })

  it('leaves out a label that would print over another, and keeps its dot', () => {
    // Louisville and Lexington are 60 miles apart: on a view of the world they land a few pixels apart.
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 1), ...EUROPE.slice(0, 1).map((l) => ({ ...l, dep: 'LEX' }))], {
      isNextTrip: false, home: 'SDF', now: at(0.5), airports: AIRPORTS,
    })!
    const { container } = render(<TripMapSvg map={map} t={at(0.5)} width={390} height={500} focus={null} land={null} nightStep={60_000} />)
    expect(container.querySelectorAll('.trip-map-airport circle').length).toBe(3)
    expect(labels(container)).toHaveLength(2)
    expect(labels(container).join('')).not.toContain('SDLEX')
  })
})
