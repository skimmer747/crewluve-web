import { describe, expect, it } from 'vitest'
import { isBack, latestTry } from '../../src/map/flightPath'
import type { TrailPoint } from '../../src/map/liveFlight'
import { airport } from './liveCases'
import { fix, liveFlight, point } from './madeUpFlights'

/** An air return's rule beyond the shared cases (air return design §2, §4), from Louisville. */
const SDF = airport('SDF')
const at = (minutes: number, lat: number, lng: number, feet: number | null): TrailPoint => ({ ...point(minutes, lat, lng), altitudeFt: feet })
/** Out 40 nm east and back, from 2,000 ft up to `top` and down to 3,000. */
const outAndBack = (top: number | null) => [at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, top), at(29, 38.3, -85.4, 3_000)]
const onTheGround = (trail: TrailPoint[]) =>
  liveFlight(trail, { state: 'ground', fix: fix(44, SDF.lat, SDF.lng, { onGround: true }) })

describe('a plane back at its departure airport (air return design §2)', () => {
  it('has climbed 1,000 ft, the highest point of its trail over the lowest', () => {
    expect(isBack(onTheGround(outAndBack(9_000)), SDF)).toBe(true)
    // 3,000 over 2,000 is 1,000 ft.
    expect(isBack(onTheGround(outAndBack(null)), SDF)).toBe(true)
    expect(isBack(onTheGround([at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, 2_999)]), SDF)).toBe(false)
  })

  it('counts no point with no height, and no trail at all', () => {
    expect(isBack(onTheGround([at(17, 38.25, -85.55, null), at(23, 38.45, -85.0, null)]), SDF)).toBe(false)
    // 2,500 over 2,000 is 500 ft: the point with no height isn't at sea level.
    expect(isBack(onTheGround([at(17, 38.25, -85.55, null), at(23, 38.45, -85.0, 2_000), at(29, 38.3, -85.4, 2_500)]), SDF)).toBe(false)
    expect(isBack(onTheGround([]), SDF)).toBe(false)
  })

  it('is on the ground by Crewlu Cloud’s state, within 10 nm of the airport', () => {
    const flown = onTheGround(outAndBack(9_000))
    expect(isBack({ ...flown, state: 'airborne' }, SDF)).toBe(false)
    expect(isBack({ ...flown, state: 'landed' }, SDF)).toBe(false)
    // 11 nm north of the airport.
    expect(isBack({ ...flown, fix: fix(44, SDF.lat + 11 / 60, SDF.lng, { onGround: true }) }, SDF)).toBe(false)
    expect(isBack(null, SDF)).toBe(false)
  })
})

describe('a flight’s latest try (air return design §4)', () => {
  /** Off again an hour after the air return, its first new point 18 nm out, and seen again 4 minutes later. */
  const again = [at(90, 38.4, -85.4, 4_000), at(94, 38.6, -85.0, 12_000)]

  it('is the trail from a second takeoff on', () => {
    const flight = liveFlight([...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), ...again], { fix: fix(95, 38.62, -84.95) })
    expect(latestTry(flight, SDF)).toEqual(again)
  })

  it('isn’t restarted by a long gap away from the airport', () => {
    // Unseen for 40 minutes over the ocean of the way, far from Louisville.
    const far = [at(17, 38.25, -85.55, 2_000), at(30, 39.0, -80.0, 30_000), at(70, 39.5, -75.5, 30_000)]
    expect(latestTry(liveFlight(far, { fix: fix(71, 39.52, -75.4) }), SDF)).toEqual(far)
  })

  it('is restarted only after more than 10 minutes unseen', () => {
    // Back near the airport at 31, and seen 21 nm out exactly 10 minutes later: a hold, not a second takeoff.
    const hold = [...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), at(41, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(hold, { fix: fix(42, 38.41, -85.38) }), SDF)).toEqual(hold)
    const later = [...outAndBack(9_000), at(31, 38.18, -85.7, 1_500), at(41.5, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(later, { fix: fix(42, 38.41, -85.38) }), SDF)).toEqual(later.slice(4))
  })

  it('isn’t restarted after a gap that began away from the airport', () => {
    // Out 40 nm and climbing, unseen for 22 minutes, and seen again 21 nm from Louisville.
    const circling = [at(17, 38.25, -85.55, 2_000), at(23, 38.45, -85.0, 9_000), at(45, 38.4, -85.4, 4_000)]
    expect(latestTry(liveFlight(circling, { fix: fix(46, 38.41, -85.38) }), SDF)).toEqual(circling)
  })

  it('isn’t restarted by a point first seen more than 30 nm out', () => {
    // Back near the airport at 29, then first seen again 80 nm out, which can't tell a takeoff.
    const far = [...outAndBack(9_000).slice(0, 2), at(29, 38.18, -85.7, 1_500), at(60, 38.9, -84.3, 20_000)]
    expect(latestTry(liveFlight(far, { fix: fix(61, 38.92, -84.25) }), SDF)).toEqual(far)
  })

  it('isn’t restarted before the first try has climbed: a stray point while taxiing', () => {
    const stray = [at(5, 38.18, -85.73, 500), at(20, 38.25, -85.55, 2_000), at(24, 38.45, -85.0, 9_000)]
    expect(latestTry(liveFlight(stray, { fix: fix(25, 38.46, -84.95) }), SDF)).toEqual(stray)
  })

  it('is none while the plane is back on the ground, and none from a fix in the air that starts a try of its own', () => {
    expect(latestTry(onTheGround(outAndBack(9_000)), SDF)).toEqual([])
    const offAgain = liveFlight([...outAndBack(9_000), at(31, 38.18, -85.7, 1_500)], { fix: fix(90, 38.4, -85.4) })
    expect(latestTry(offAgain, SDF)).toEqual([])
    expect(latestTry(null, SDF)).toEqual([])
  })
})
