import { describe, expect, it } from 'vitest'
import { routeLabel, upcomingCityPills } from '../../src/copy/trips'
import { buildAirportIndex } from '../../src/data/airports'
import { testAirports } from '../fixtures/airports'

describe('upcomingCityPills', () => {
  it('names each city with its state, or its country abroad', () => {
    expect(upcomingCityPills(['ANC', 'CGN', 'SDF'], testAirports)).toEqual([
      { city: 'Anchorage', subtitle: 'AK' },
      { city: 'Cologne', subtitle: 'Germany' },
      { city: 'Louisville', subtitle: 'KY' },
    ])
  })

  it('keeps the first three different cities', () => {
    expect(upcomingCityPills(['ANC', 'SDF', 'ANC', 'MIA', 'ONT'], testAirports).map((p) => p.city)).toEqual(['Anchorage', 'Louisville', 'Miami'])
  })

  it('makes one pill for two airports in the same city', () => {
    const nyc = buildAirportIndex([
      ['JFK', 'New York', 'USA', 40.64, -73.78, 'America/New_York', 'NY'],
      ['LGA', 'New York', 'USA', 40.78, -73.87, 'America/New_York', 'NY'],
    ])
    expect(upcomingCityPills(['JFK', 'LGA'], nyc)).toEqual([{ city: 'New York', subtitle: 'NY' }])
  })

  it('shows an unknown airport as its code, with no subtitle', () => {
    expect(upcomingCityPills(['XYZ'], testAirports)).toEqual([{ city: 'XYZ', subtitle: null }])
  })

  it('falls back to the country for a US airport without a state', () => {
    const odd = buildAirportIndex([['ZZV', 'Zanesville', 'USA', 39.94, -81.89, 'America/New_York']])
    expect(upcomingCityPills(['ZZV'], odd)).toEqual([{ city: 'Zanesville', subtitle: 'USA' }])
  })

  it('keeps the order the flights land in', () => {
    expect(upcomingCityPills(['SDF', 'ANC'], testAirports).map((p) => p.city)).toEqual(['Louisville', 'Anchorage'])
  })

  it('has no subtitle for an airport with neither state nor country', () => {
    const blank = buildAirportIndex([['ZZZ', 'Nowhere', '', 0, 0, 'UTC']])
    expect(upcomingCityPills(['ZZZ'], blank)).toEqual([{ city: 'Nowhere', subtitle: null }])
  })
})

describe('routeLabel', () => {
  it('reads the route as city names, and codes for unknown airports', () => {
    expect(routeLabel(['SDF', 'RFD', 'XYZ'], testAirports)).toBe('Route: Louisville, Rockford, XYZ')
  })

  it('keeps the route in flight order', () => {
    expect(routeLabel(['SDF', 'ANC', 'RFD'], testAirports)).toBe('Route: Louisville, Anchorage, Rockford')
  })
})
