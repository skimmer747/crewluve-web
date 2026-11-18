import { describe, expect, it } from 'vitest'
import { legPlane } from '../../src/facts/planePosition'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { fitRect, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { followingFrame, followRect, LEAST_WIDTH_M, TAIL_SHARE, worldPerMeterAt } from '../../src/map/tripMapFollow'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date, equatorLive, equatorLiveLeg, liveTime } from '../facts/liveFacts'
import { AIRPORTS, at as tripAt, drive, EUROPE, flight as tripFlight } from './tripMapLegs'

/**
 * The frame that follows the plane (the app's follow the plane design §3), as the app's TripMapFollowTests. The flight is
 * the equator flight from E0 to E20, 1,382 mi: its gates at 10:00 and 13:22 UTC, its plan in the air from 10:15 to 13:15,
 * flown by the schedule.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const flight = equatorFlight(0, 20)

/** Whether `rect` holds `place`, in the copy of the world nearest its middle. */
function holds(rect: WorldRect, place: GeoPoint): boolean {
  const p = toWorld(place)
  const x = p.x + Math.round(rect.x + rect.width / 2 - p.x)
  return x >= rect.x && x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
}
const onEquator = (lng: number): GeoPoint => ({ lat: 0, lng })

describe('the frame that follows the plane (follow the plane design §3)', () => {
  it('holds the plane, its tail and the way ahead mid-flight, but not the start', () => {
    const rect = followRect(flight, at('11:45'), false)!
    const plane = legPlane(flight, at('11:45'), false).place
    expect(holds(rect, plane)).toBe(true)
    expect(holds(rect, onEquator(20)), 'the destination').toBe(true)
    // The tail is 10% of the flight behind the plane, 2° of its 20, and the margin adds a fifth of the width.
    expect(holds(rect, onEquator(plane.lng - 3)), 'the tail and its margin').toBe(true)
    expect(holds(rect, onEquator(plane.lng - 5))).toBe(false)
    expect(holds(rect, onEquator(0)), 'E0 is left behind').toBe(false)
    const whole = fitRect(framingPoints(flightMap(flight, null), flight))!
    expect(rect.width).toBeLessThan(whole.width * 0.85)
  })

  it('holds more ahead than behind, until the last tenth of the flight', () => {
    const rect = followRect(flight, at('11:45'), false)!
    const plane = toWorld(legPlane(flight, at('11:45'), false).place)
    expect(rect.x + rect.width - plane.x).toBeGreaterThan(2 * (plane.x - rect.x))
  })

  it('grows smaller as the flight goes on', () => {
    const [early, middle, late] = ['10:45', '11:45', '12:45'].map((time) => followRect(flight, at(time), false)!)
    expect(early.width).toBeGreaterThan(middle.width)
    expect(middle.width).toBeGreaterThan(late.width)
  })

  it('is never narrower than 300 miles', () => {
    // E0 to E2 is 138 mi: half way, the plane, a tail and the way ahead span far less than 300.
    const short = equatorFlight(0, 2, at('10:00'), 'short')
    const rect = followRect(short, (short.start + short.end) / 2, false)!
    const least = LEAST_WIDTH_M * worldPerMeterAt(0)
    expect(Math.abs(rect.width - least)).toBeLessThan(least * 0.01)
    expect(TAIL_SHARE).toBe(0.1)
  })

  it('is none before the plane has left, after the gate, and on a drive', () => {
    expect(followRect(flight, at('10:10'), false), 'taxiing out: the whole flight').toBeNull()
    expect(followRect(flight, at('13:30'), false), 'at the gate').toBeNull()
    expect(followRect({ ...flight, kind: 'drive', flightNumber: null }, at('11:45'), false)).toBeNull()
  })

  it('follows the real plane, where the map draws it', () => {
    // The real plane is seen to 6° E, ahead of the schedule's.
    const seenUntil = liveTime(6)
    const leg = equatorLiveLeg(equatorLive(seenUntil), seenUntil)
    const rect = followRect(leg, seenUntil, false)!
    const plane = legPlane(leg, seenUntil, false).place
    expect(Math.abs(plane.lng - 6)).toBeLessThan(0.1)
    expect(holds(rect, plane)).toBe(true)
    expect(holds(rect, onEquator(4.5)), 'its tail').toBe(true)
  })

  it('of a real plane still at the gate, is the whole flight now, but follows the replay’s plane', () => {
    const atTheGate: LiveFlight = {
      legId: 'eq', callsign: 'TST1', state: 'ground', landedAt: null, trail: [],
      fix: { place: onEquator(0), altitudeFt: null, groundSpeedKt: 0, trackDeg: null, onGround: true, registration: 'N370UP', typeCode: 'B763', seenAt: at('11:19') },
    }
    const leg = equatorLiveLeg(atTheGate, at('11:20'))
    expect(followRect(leg, at('11:20'), false), 'it hasn’t left').toBeNull()
    expect(followRect(leg, at('11:20'), true), 'the replay’s plane, by the schedule').not.toBeNull()
  })

})

describe('the frame the camera glides to while following, between legs too (follow the plane design §5)', () => {
  // Louisville to Cologne from 0 to 8 h, Cologne to Dubai from 32 to 38 h, Dubai to Louisville from 58 to 72 h.
  const trip = (now: number) => makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!

  it('follows the plane in the air, and frames the whole flight while it hasn’t left', () => {
    const map = flightMap(flight, null)
    expect(followingFrame(map, at('11:45'), false)).toEqual(followRect(flight, at('11:45'), false))
    expect(followingFrame(map, at('10:10'), false)).toEqual(fitRect(framingPoints(map, flight)))
    // On a trip, the flight's own route, not the whole trip: Cologne to Dubai, five minutes after its gate time.
    const taxiing = trip(tripAt(32) + 5 * 60_000)
    expect(followingFrame(taxiing, tripAt(32) + 5 * 60_000, false)).toEqual(fitRect(framingPoints(taxiing, taxiing.legs[1])))
  })

  it('frames the next flight’s whole route on the ground between two flights (“The next flight”, Todd, 17 Nov 2026)', () => {
    const map = trip(tripAt(20))
    expect(followingFrame(map, tripAt(20), false)).toEqual(fitRect(framingPoints(map, map.legs[1])))
  })

  it('frames what the map frames without the setting before the first flight, after the last, and on a drive', () => {
    const before = trip(tripAt(-5))
    expect(followingFrame(before, tripAt(-5), false)).toEqual(fitRect(framingPoints(before, null)))
    const after = trip(tripAt(80))
    expect(followingFrame(after, tripAt(80), false)).toEqual(fitRect(framingPoints(after, null)))
    const driving = makeTripMap([tripFlight('f1', 'SDF', 'CGN', 0, 8), drive('d1', 'CGN', 'DXB', 10, 2), tripFlight('f2', 'DXB', 'SDF', 20, 6)],
      { isNextTrip: false, home: 'SDF', now: tripAt(11), airports: AIRPORTS })!
    expect(followingFrame(driving, tripAt(11), false)).toEqual(fitRect(framingPoints(driving, driving.legs[1])))
  })
})
