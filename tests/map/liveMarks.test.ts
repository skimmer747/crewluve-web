import { describe, expect, it } from 'vitest'
import { appleMapPlan } from '../../src/map/appleMapPlan'
import { distanceMeters, EARTH_RADIUS_M, pointsAlong } from '../../src/map/greatCircle'
import { makeMapFlight } from '../../src/map/mapFlight'
import { makeTripMap } from '../../src/map/tripMap'
import { routePoints, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { FLYING, LIVE_AIRPORTS, liveTripMap, PHL, SDF, SDF_PHL, TRAIL } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

describe('the trip map with a real plane (Stage 3 spec §5.4, §7.3)', () => {
  it("draws it and its ghost, and not the schedule's plane", () => {
    const d = tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR)
    expect(d.plane).toBeNull()
    expect(d.realPlane).not.toBeNull()
    expect(d.ghost).not.toBeNull()
  })

  it('marks an estimated plane as one', () => {
    expect(tripMapDrawing(liveTripMap(ESTIMATED), ESTIMATED).realPlane?.isEstimated).toBe(true)
    expect(tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR).realPlane?.isEstimated).toBe(false)
  })

  it('in the replay draws the real plane alone', () => {
    const d = tripMapDrawing(liveTripMap(IN_THE_AIR), START + 30 * MINUTE, true)
    expect(d.realPlane).not.toBeNull()
    expect([d.plane, d.ghost]).toEqual([null, null])
  })

  it("draws legs that are one flight as one real plane, with no schedule's plane", () => {
    const flight = makeMapFlight(SDF_PHL.start, SDF_PHL.end, SDF, PHL, FLYING)!
    const twin = { ...SDF_PHL, id: 'f9' }
    const map = makeTripMap([SDF_PHL, twin], { isNextTrip: false, home: 'SDF', now: IN_THE_AIR, airports: LIVE_AIRPORTS, flights: new Map([['f1', flight], ['f9', flight]]) })!
    const plan = appleMapPlan(tripMapDrawing(map, IN_THE_AIR), null)
    expect(plan.marks.filter((m) => m.kind === 'realPlane')).toHaveLength(1)
    expect(plan.marks.filter((m) => m.kind === 'plane')).toHaveLength(0)
  })
})

describe("Apple's map with a real plane", () => {
  it('puts the ghost under the real plane, which is faded while it is an estimate', () => {
    const kinds = (t: number) => appleMapPlan(tripMapDrawing(liveTripMap(t), t), null).marks.filter((m) => m.kind === 'ghost' || m.kind === 'realPlane')
    expect(kinds(IN_THE_AIR).map((m) => [m.id, m.faded ?? false])).toEqual([['ghost', false], ['realPlane', false]])
    expect(kinds(ESTIMATED).map((m) => [m.id, m.faded ?? false])).toEqual([['ghost', false], ['realPlane', true]])
  })

  it('turns the real plane the way it goes, a quarter more than its screen angle, as the plane icon points up', () => {
    const drawing = tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR)
    const real = appleMapPlan(drawing, null).marks.find((m) => m.kind === 'realPlane')!
    expect(real.degrees).toBeCloseTo((drawing.realPlane!.angle * 180) / Math.PI + 90, 12)
  })

  it('draws the seen path over every other line', () => {
    const lines = appleMapPlan(tripMapDrawing(liveTripMap(IN_THE_AIR), IN_THE_AIR), null).lines.map((l) => l.style)
    expect(lines).toEqual(['unseen', 'upcoming', 'seen', 'seen'])
  })
})

describe("a route's line", () => {
  const ONE_DEGREE = (EARTH_RADIUS_M * Math.PI) / 180

  it('of two places is 101 places along their great circle, as before', () => {
    expect(routePoints({ id: 'a', points: [SDF, PHL], style: 'upcoming', geodesic: true })).toEqual(pointsAlong(SDF, PHL, 101))
    expect(routePoints({ id: 'b', points: [SDF, PHL], style: 'drive', geodesic: false })).toEqual([SDF, PHL])
  })

  it('of a real path passes every place, in steps of a degree at most', () => {
    const places = [SDF, ...TRAIL.map((p) => p.place), PHL]
    const line = routePoints({ id: 'c', points: places, style: 'seen', geodesic: true })
    // Each join's places are worked out along its great circle, so its last can be a rounding error off the place seen.
    for (const place of places) expect(line.some((p) => Math.abs(p.lat - place.lat) < 1e-9 && Math.abs(p.lng - place.lng) < 1e-9)).toBe(true)
    for (let i = 1; i < line.length; i++) expect(distanceMeters(line[i - 1], line[i])).toBeLessThanOrEqual(ONE_DEGREE + 1e-6)
    expect(line[0]).toEqual(SDF)
  })
})
