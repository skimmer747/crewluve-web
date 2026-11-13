import { describe, expect, it } from 'vitest'
import { distanceMeters, pointAlong, pointsAlong, type GeoPoint } from '../../src/map/greatCircle'

const JFK: GeoPoint = { lat: 40.6413, lng: -73.7781 }
const LHR: GeoPoint = { lat: 51.47, lng: -0.4543 }
const ANC: GeoPoint = { lat: 61.1743, lng: -149.9963 }
const NRT: GeoPoint = { lat: 35.772, lng: 140.3929 }

// Expected values were worked out independently on the same sphere (radius 6,371,008.8 m).
describe('great circles (moving map spec §7.1)', () => {
  it('puts New York about 5,540 km from London, either way', () => {
    expect(distanceMeters(JFK, LHR) / 1000).toBeCloseTo(5540.02, 1)
    expect(distanceMeters(LHR, JFK)).toBeCloseTo(distanceMeters(JFK, LHR), 3)
    expect(distanceMeters(JFK, JFK)).toBe(0)
  })

  it('starts and ends at the airports, and holds fractions outside the leg at its ends', () => {
    expect(pointAlong(JFK, LHR, 0).lat).toBeCloseTo(JFK.lat, 9)
    expect(pointAlong(JFK, LHR, 1).lng).toBeCloseTo(LHR.lng, 9)
    expect(pointAlong(JFK, LHR, -0.5).lat).toBeCloseTo(JFK.lat, 9)
    expect(pointAlong(JFK, LHR, 1.5).lng).toBeCloseTo(LHR.lng, 9)
  })

  it('curves north over the Atlantic halfway to London', () => {
    const middle = pointAlong(JFK, LHR, 0.5)
    expect(middle.lat).toBeCloseTo(52.2167, 3)
    expect(middle.lng).toBeCloseTo(-41.3027, 3)
  })

  it('crosses the date line the short way from Anchorage to Tokyo', () => {
    const middle = pointAlong(ANC, NRT, 0.5)
    expect(middle.lat).toBeCloseTo(53.557, 3)
    expect(middle.lng).toBeCloseTo(165.165, 3)
  })

  it('gives the count asked for, with both ends, and never fewer than two', () => {
    const points = pointsAlong(JFK, LHR, 33)
    expect(points).toHaveLength(33)
    expect(points[32].lng).toBeCloseTo(LHR.lng, 9)
    expect(pointsAlong(JFK, LHR, 1)).toHaveLength(2)
    expect(pointAlong(JFK, JFK, 0.5)).toEqual(JFK)
  })
})
