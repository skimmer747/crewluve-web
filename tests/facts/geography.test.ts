import { describe, expect, it } from 'vitest'
import { cityNear, makeGeography, parseGeography, placeAt, type Area } from '../../src/facts/geography'
import { appGeography, box, EQUATOR } from './factsTestData'

const at = (lat: number, lng: number) => ({ lat, lng })

describe('what’s under a point (Stage 2 spec §4.1)', () => {
  it('gives a state inside its country, and the country outside the state', () => {
    const geography = makeGeography([box('Delta', 'country', 0, 10), box('North', 'state', 0, 5, 'Delta')], [])
    expect(placeAt(geography, at(0, 2))).toEqual({ name: 'North', kind: 'state', country: 'Delta' })
    expect(placeAt(geography, at(0, 7))).toEqual({ name: 'Delta', kind: 'country', country: 'Delta' })
  })

  it('tries land before water', () => {
    const geography = makeGeography([box('the Sea', 'water', 0, 10), box('Island', 'country', 4, 6)], [])
    expect(placeAt(geography, at(0, 5))?.name).toBe('Island')
    expect(placeAt(geography, at(0, 8))).toEqual({ name: 'the Sea', kind: 'water', country: null })
  })

  it('snaps to land within 5 miles of a coast, as the app does (Stage 2 spec §4.1)', () => {
    const geography = makeGeography(
      [box('Coast', 'state', 0, 5, 'Land'), box('Land', 'country', 0, 5), box('the Sea', 'water', 5, 15)],
      [],
    )
    // 0.05° east of the coast is about 3.5 mi; 0.1° is about 6.9 mi.
    expect(placeAt(geography, at(0, 5.05))?.name).toBe('Coast')
    expect(placeAt(geography, at(0, 5.1))?.name).toBe('the Sea')
  })

  it('snaps to land near over nothing too', () => {
    const geography = makeGeography([box('Island', 'country', 0, 1)], [])
    expect(placeAt(geography, at(0, 1.05))?.name).toBe('Island')
    expect(placeAt(geography, at(0, 1.2))).toBeNull()
  })

  it('tries states and provinces before countries for the snap, and the nearer of two of a kind', () => {
    // At 5.001° the country is 0.009° (about 0.6 mi) off and the state 0.041° (about 2.8 mi), yet the state wins.
    const geography = makeGeography([box('Country', 'country', 5.01, 8), box('Region', 'state', 0, 4.96, 'Elsewhere')], [])
    expect(placeAt(geography, at(0, 5.001))?.name).toBe('Region')
    const two = makeGeography([box('Far', 'country', 5.04, 8), box('Near', 'country', 0, 4.99)], [])
    expect(placeAt(two, at(0, 5.001))?.name).toBe('Near')
  })

  it('is null outside everything', () => {
    expect(placeAt(EQUATOR, at(10, 5))).toBeNull()
  })

  it('counts a point in a hole as outside', () => {
    const ringed: Area = { name: 'Ring', kind: 'country', country: null, box: [0, -5, 10, 5], rings: [[0, -5, 10, -5, 10, 5, 0, 5], [4, -1, 6, -1, 6, 1, 4, 1]] }
    const geography = makeGeography([ringed], [])
    expect(placeAt(geography, at(0, 2))?.name).toBe('Ring')
    expect(placeAt(geography, at(0, 5))).toBeNull()
  })

  it('counts both of two separate rings', () => {
    const twoParts: Area = { name: 'Islands', kind: 'country', country: null, box: [0, -1, 20, 1], rings: [[0, -1, 2, -1, 2, 1, 0, 1], [18, -1, 20, -1, 20, 1, 18, 1]] }
    const geography = makeGeography([twoParts], [])
    expect(placeAt(geography, at(0, 1))?.name).toBe('Islands')
    expect(placeAt(geography, at(0, 19))?.name).toBe('Islands')
    expect(placeAt(geography, at(0, 10))).toBeNull()
  })

  it('wraps a longitude past the date line', () => {
    expect(placeAt(makeGeography([box('East', 'country', -175, -165)], []), at(0, 190))?.name).toBe('East')
  })

  it('finds the nearest city within 40 miles', () => {
    const geography = makeGeography([], [{ name: 'Near', lat: 0.3, lon: 6 }, { name: 'Nearer', lat: 0.1, lon: 6 }])
    expect(cityNear(geography, at(0, 6))?.name).toBe('Nearer')
  })

  it('finds none farther', () => {
    // 0.6° of latitude is about 41 mi.
    expect(cityNear(EQUATOR, at(-0.3, 6))).toBeNull()
  })

  it('reads the file’s format, leaving out what it can’t read', () => {
    const geography = parseGeography({
      source: 'test',
      areas: [
        { name: 'Kansas', kind: 'state', country: 'the United States', box: [-102, 37, -94.6, 40], rings: [[-102, 37, -94.6, 37, -94.6, 40, -102, 40]] },
        { name: 'Nowhere', kind: 'moon', box: [0, 0, 1, 1], rings: [[0, 0, 1, 0, 1, 1]] },
        { name: 'Broken', kind: 'country', box: [0, 0], rings: [] },
      ],
      cities: [{ name: 'Wichita', lat: 37.69, lon: -97.34 }, { name: 'Nowhere' }],
    })
    expect(geography.areas.map((a) => a.name)).toEqual(['Kansas'])
    expect(placeAt(geography, at(38.5, -98.5))).toEqual({ name: 'Kansas', kind: 'state', country: 'the United States' })
    expect(geography.cities.map((c) => c.name)).toEqual(['Wichita'])
    expect(parseGeography(null).areas).toEqual([])
  })

  it('finds the coastal cities and small countries the snap is for, in the site’s copy of the file (Stage 2 spec §4.1)', () => {
    const geography = appGeography()
    expect(placeAt(geography, at(40.71, -74.01))?.name).toBe('New York')
    expect(placeAt(geography, at(25.76, -80.19))?.name).toBe('Florida')
    expect(placeAt(geography, at(32.3, -64.78))?.name).toBe('Bermuda')
    expect(placeAt(geography, at(35.9, 14.45))?.name).toBe('Malta')
  })

  it('finds a state, a province, a country, a sea and a city in the site’s copy of the app’s file (§12.2)', () => {
    const geography = appGeography()
    expect(placeAt(geography, at(38.5, -98.5))?.name).toBe('Kansas')
    expect(placeAt(geography, at(50.0, -85.0))?.name).toBe('Ontario')
    expect(placeAt(geography, at(51.0, 10.0))?.name).toBe('Germany')
    expect(placeAt(geography, at(58.0, -54.0))?.name).toBe('the Labrador Sea')
    expect(cityNear(geography, at(45.55, -73.7))?.name).toBe('Montréal')
  })
})
