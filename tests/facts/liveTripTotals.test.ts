import { describe, expect, it } from 'vitest'
import { longestText, milesText } from '../../src/copy/factsTrip'
import { legPathLength } from '../../src/facts/legCourse'
import { longestFlight, milesFlown, totalMiles, totalsSoFar } from '../../src/facts/tripTotals'
import { METERS_PER_MILE } from '../../src/map/greatCircle'
import { legDistanceMeters } from '../../src/map/tripMap'
import { equatorFlight, flightMap } from './factsTestData'
import { date, dogLeg, equatorLive, equatorLiveLeg, liveTime } from './liveFacts'

/**
 * The trip's miles along real paths (Stage 3 spec §8), as the app's LiveTripTotalsTests. The made-up real plane is
 * `liveFacts.ts`': a degree of longitude every 8 minutes from 10:15 UTC. One degree along the equator is 69.09 mi, and
 * the flight is 1,382 mi.
 */

const at = (time: string) => date(`2026-03-20T${time}:00Z`)

describe('the trip’s miles along real paths (Stage 3 spec §8)', () => {
  it('count the whole trip, and find the longest flight, along the real path', () => {
    // The flight north to 2° N and back is about 171 mi longer than its great circle: longer than a flight to 20.5° E,
    // whose airports are further apart.
    const seenUntil = liveTime(13)
    const wandering = equatorLiveLeg(equatorLive(seenUntil, { latitude: dogLeg }), seenUntil)
    const straight = equatorFlight(0, 20.5, undefined, 'straight')
    expect(legDistanceMeters(wandering)).toBeLessThan(legDistanceMeters(straight))

    expect(longestFlight([straight, wandering])?.id).toBe(wandering.id)
    expect(totalMiles([wandering])).toBe(Math.round(legPathLength(wandering) / METERS_PER_MILE))
    expect(totalMiles([wandering])).toBeGreaterThan(1_382 + 150)
    expect(milesFlown([wandering], wandering.end), 'once it’s in, every mile of its path counts').toBe(totalMiles([wandering]))
    expect(longestText(wandering)).toBe(`E0 → E20, ${milesText(totalMiles([wandering]))}`)
  })

  // Not in the app's tests: of two flights along the same real path, the longest is the first, as the app's max(by:) has it.
  it('find the first of two longest flights', () => {
    const seenUntil = liveTime(13)
    const live = equatorLive(seenUntil, { latitude: dogLeg })
    expect(longestFlight([equatorLiveLeg(live, seenUntil, { id: 'first' }), equatorLiveLeg(live, seenUntil, { id: 'second' })])?.id).toBe('first')
  })

  it('flown by a flight in the air, are as far as the real plane is', () => {
    const leg = equatorLiveLeg(equatorLive(at('11:10')), at('11:10'))
    expect(milesFlown([leg], at('11:10'))).toBe(475)
    expect(milesFlown([leg], at('10:35'), true)).toBe(173)
    expect(milesFlown([leg], leg.start - 60_000)).toBe(0)
    expect(milesFlown([leg], leg.end)).toBe(1_382)
  })

  it('so far, in a replay, count as far as the record has the plane', () => {
    const leg = equatorLiveLeg(equatorLive(at('11:10')), at('11:10'))
    const map = flightMap(leg, null)
    expect(totalsSoFar(map, at('11:10'), {}).miles).toBe(475)
    expect(totalsSoFar(map, at('10:35'), {}, true).miles).toBe(173)
  })
})
