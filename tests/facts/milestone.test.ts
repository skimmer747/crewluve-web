import { describe, expect, it } from 'vitest'
import { makeGeography, type Geography } from '../../src/facts/geography'
import { legStory } from '../../src/facts/legStory'
import { milestones, roundedMiles, type Milestone } from '../../src/facts/milestone'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import type { AirportMark, MapLeg } from '../../src/map/tripMap'
import { box, EQUATOR, equatorFlight, EQUINOX, mark } from './factsTestData'

const HOUR = 3_600_000
const found = (leg: MapLeg, geography: Geography, home: AirportMark | null = null) => milestones(leg, legStory(leg, geography, home))
/** The milestones without their times: `toEqual` passes over a property that's undefined. */
const what = (list: Milestone[]) => list.map((m) => ({ ...m, time: undefined }))
/** Within 5 seconds, as the app's tests allow. */
const at = (milestone: Milestone, iso: string) => expect(Math.abs(milestone.time - Date.parse(iso))).toBeLessThanOrEqual(5_000)

describe('a flight’s milestones (Stage 2 spec §4.3)', () => {
  it('along the equator, are the crossings, halfway and home, a tenth of the way every 18 minutes', () => {
    const list = found(equatorFlight(0, 20), EQUATOR, mark('HOME', 0.5, 14))
    expect(what(list)).toEqual([
      { kind: 'crossedInto', name: 'Bravo' },
      { kind: 'halfway' },
      { kind: 'outOver', name: 'the Test Sea' },
      { kind: 'closestToHome', miles: 35 },
    ])
    at(list[0], '2026-03-20T11:00:00Z')
    at(list[1], '2026-03-20T11:45:00Z')
    // 5 mi offshore, by the coast snap.
    at(list[2], '2026-03-20T12:03:39Z')
    at(list[3], '2026-03-20T12:21:00Z')
  })

  it('names the state at a state line, and the country at a border', () => {
    const geography = makeGeography([
      box('North', 'state', 29, 35.5, 'Delta'),
      box('South', 'state', 35.5, 37, 'Delta'),
      box('Delta', 'country', 29, 37),
      box('Echo', 'country', 37, 41),
    ], [])
    const list = found(equatorFlight(30, 40, EQUINOX + 4 * HOUR), geography)
    expect(what(list)).toEqual([{ kind: 'halfway' }, { kind: 'crossedInto', name: 'South' }, { kind: 'crossedInto', name: 'Echo' }])
    at(list[1], '2026-03-20T15:54:00Z')
    at(list[2], '2026-03-20T16:21:00Z')
  })

  it('isn’t one from one sea into another, but landfall after it names the country', () => {
    const geography = makeGeography([
      box('the Test Sea', 'water', 49, 53),
      box('the Other Sea', 'water', 53, 56),
      box('Foxtrot', 'country', 56, 61),
    ], [])
    const list = found(equatorFlight(50, 60, EQUINOX + 8 * HOUR), geography)
    expect(what(list)).toEqual([{ kind: 'halfway' }, { kind: 'crossedInto', name: 'Foxtrot' }])
    // 5 mi before the coast, by the coast snap.
    at(list[1], '2026-03-20T20:01:42Z')
  })

  it('isn’t one across a gap where only the country is known', () => {
    const geography = makeGeography([
      box('Kansas', 'state', -1, 5, 'the United States'),
      box('Nebraska', 'state', 6, 21, 'the United States'),
      box('the United States', 'country', -1, 21),
    ], [])
    expect(what(found(equatorFlight(0, 20), geography))).toEqual([{ kind: 'crossedInto', name: 'Nebraska' }, { kind: 'halfway' }])
  })

  it('isn’t a crossing back into the same state after a gap', () => {
    const geography = makeGeography([
      box('Kansas', 'state', -1, 5, 'the United States'),
      box('Kansas', 'state', 6, 21, 'the United States'),
      box('the United States', 'country', -1, 21),
    ], [])
    expect(what(found(equatorFlight(0, 20), geography))).toEqual([{ kind: 'halfway' }])
  })

  it('rounds the distance home to the nearest 5 miles, never under 5', () => {
    expect(roundedMiles(34.55 * METERS_PER_MILE)).toBe(35)
    expect(roundedMiles(52 * METERS_PER_MILE)).toBe(50)
    expect(roundedMiles(53 * METERS_PER_MILE)).toBe(55)
    expect(roundedMiles(2 * METERS_PER_MILE)).toBe(5)
  })
})
