import { describe, expect, it } from 'vitest'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory, placeAtFraction, routeStory } from '../../src/facts/legStory'
import type { GeoPoint } from '../../src/map/greatCircle'
import { box, EQUATOR, equatorFlight, mark } from './factsTestData'

/** Along the equator from 0° to 20° E, where a fraction of the way is a fraction of the longitude. */
const story = (geography: Geography | null = EQUATOR, home: GeoPoint | null = null) => routeStory({ lat: 0, lng: 0 }, { lat: 0, lng: 20 }, geography, home)

describe('a flight’s story (Stage 2 spec §4.2)', () => {
  it('names each place under the route from where it starts', () => {
    const { stretches } = story()
    // The 21-mile Wedge is dropped by the hold rule.
    expect(stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Bravo', 'the Test Sea'])
    expect(stretches[0].start).toBe(0)
    expect(stretches[1].start).toBeCloseTo(0.25, 3)
    // The coast snap moves the sea 5 mi offshore: 12.0724° E.
    expect(stretches[2].start).toBeCloseTo(0.6036, 3)
  })

  it('changes nothing across a gap with no place', () => {
    const geography = makeGeography([box('Alpha', 'country', -1, 5), box('Alpha', 'country', 7, 21)], [])
    expect(story(geography).stretches.map((s) => s.place.name)).toEqual(['Alpha'])
  })

  it('counts a place held for 25 miles or more', () => {
    // 0.5° is about 35 mi.
    const geography = makeGeography([box('Wide', 'country', 9, 9.5), box('Alpha', 'country', -1, 21)], [])
    expect(story(geography).stretches.map((s) => s.place.name)).toEqual(['Alpha', 'Wide', 'Alpha'])
  })

  it('has no places without geography', () => {
    expect(story(null).stretches).toEqual([])
  })

  it('reads the place at a fraction', () => {
    const equator = story()
    expect(placeAtFraction(equator, 0.1)?.name).toBe('Alpha')
    // Inside the dropped Wedge.
    expect(placeAtFraction(equator, 0.46)?.name).toBe('Bravo')
    expect(placeAtFraction(equator, 0.9)?.name).toBe('the Test Sea')
  })

  it('finds where the route passes closest to home', () => {
    const closest = story(EQUATOR, { lat: 0.5, lng: 14 }).closestToHome!
    expect(closest.fraction).toBeCloseTo(0.7, 3)
    // Half a degree.
    expect(Math.abs(closest.meters - 55_597)).toBeLessThan(100)
  })

  it('has no closest point over 100 miles away', () => {
    // 2° is about 138 mi.
    expect(story(EQUATOR, { lat: 2, lng: 14 }).closestToHome).toBeNull()
  })

  it('has no closest point at an end of the route', () => {
    expect(story(EQUATOR, { lat: 0.5, lng: 21 }).closestToHome).toBeNull()
  })

  it('leaves home out of a flight from home', () => {
    const leg = equatorFlight(0, 20)
    expect(legStory(leg, null, leg.origin).closestToHome).toBeNull()
    expect(legStory(leg, null, mark('HOME', 0.5, 14)).closestToHome).not.toBeNull()
  })
})
