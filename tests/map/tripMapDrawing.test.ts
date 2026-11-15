import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { currentLeg, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { nightTime, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, HOUR } from './tripMapLegs'

const make = (legs: Leg[] = EUROPE, now = at(12)) => makeTripMap(legs, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
const styles = (t: number, legs: Leg[] = EUROPE) => Object.fromEntries(tripMapDrawing(make(legs, t), t).segments.map((s) => [s.id, s.style]))

describe('what the trip map draws (moving map spec §7.1, §7.2)', () => {
  it('splits the leg in the air at the plane, solid behind and dashed ahead', () => {
    expect(styles(at(4))).toEqual({ 'f1-flying': 'flying', 'f1-upcoming': 'upcoming', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const map = make(EUROPE, at(4))
    const drawing = tripMapDrawing(map, at(4))
    const leg = currentLeg(map)!
    expect(drawing.plane!.place.lat).toBeCloseTo(positionAt(leg, legProgress(leg, at(4))).lat, 9)
    expect(drawing.pilot).toBeNull()
  })

  it('greys the flown leg and marks the pilot on the layover in Cologne', () => {
    expect(styles(at(12))).toEqual({ 'f1-flown': 'flown', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const drawing = tripMapDrawing(make(), at(12))
    expect(drawing.plane).toBeNull()
    expect(drawing.pilot).toMatchObject({ kind: 'layover', place: { code: 'CGN' } })
  })

  it('keeps the plane at the gate, with the whole leg ahead, while it taxis out', () => {
    expect(styles(at(0.1))['f1-upcoming']).toBe('upcoming')
    expect(styles(at(0.1))['f1-flying']).toBeUndefined()
    expect(tripMapDrawing(make(EUROPE, at(0.1)), at(0.1)).plane!.place.lat).toBeCloseTo(38.1744, 9)
  })

  it('lists each airport once, saying which only drives reach (tidy markers design §2)', () => {
    expect(tripMapDrawing(make(), at(12)).airports.map((a) => a.code)).toEqual(['SDF', 'CGN', 'DXB'])
    // A commuter: Lexington is reached only by the drive to Louisville.
    const commute = [drive('d1', 'LEX', 'SDF', 0, 2), ...EUROPE.map((l) => ({ ...l, start: l.start + 4 * HOUR, end: l.end + 4 * HOUR }))]
    expect(tripMapDrawing(make(commute, at(12)), at(12)).airports.map((a) => [a.code, a.driveOnly])).toEqual([
      ['LEX', true], ['SDF', false], ['CGN', false], ['DXB', false],
    ])
  })

  it('shows the car only while the pilot drives, where they are along the drive (tidy markers design §1)', () => {
    const legs = [drive('d1', 'LEX', 'SDF', 0, 2)]
    const map = make(legs, at(-1))
    expect(tripMapDrawing(map, at(-1)).segments.map((s) => [s.id, s.style, s.geodesic])).toEqual([['d1-drive', 'drive', false]])
    expect(tripMapDrawing(map, at(-1)).cars).toEqual([])
    expect(tripMapDrawing(map, at(3)).cars).toEqual([])
    expect(tripMapDrawing(map, at(1)).cars[0].place.lng).toBeCloseTo(positionAt(map.legs[0], 0.5).lng, 9)
  })

  it('redraws the night only once it has moved enough to see', () => {
    expect(nightTime(1_000_059_000, 60_000)).toBe(1_000_020_000)
    expect(nightTime(1_000_059_000, 0)).toBe(1_000_059_000)
  })
})
