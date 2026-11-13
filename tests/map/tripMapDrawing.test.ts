import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import { currentLeg, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { nightTime, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE } from './tripMapLegs'

const make = (legs: Leg[] = EUROPE, now = at(12)) => makeTripMap(legs, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
const styles = (t: number, legs: Leg[] = EUROPE) => Object.fromEntries(tripMapDrawing(make(legs, t), t).segments.map((s) => [s.id, s.style]))

describe('what the trip map draws (moving map spec §7.1, §7.2)', () => {
  it('splits the leg in the air at the plane, solid behind and dashed ahead', () => {
    expect(styles(at(4))).toEqual({ 'f1-flying': 'flying', 'f1-upcoming': 'upcoming', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const map = make(EUROPE, at(4))
    const drawing = tripMapDrawing(map, at(4))
    const leg = currentLeg(map)!
    expect(drawing.plane!.place.lat).toBeCloseTo(positionAt(leg, legProgress(leg, at(4))).lat, 9)
    expect(drawing.pin).toBeNull()
  })

  it('greys the flown leg and pins Cologne on the layover', () => {
    expect(styles(at(12))).toEqual({ 'f1-flown': 'flown', 'f2-upcoming': 'upcoming', 'f3-upcoming': 'upcoming' })
    const drawing = tripMapDrawing(make(), at(12))
    expect(drawing.plane).toBeNull()
    expect(drawing.pin?.code).toBe('CGN')
  })

  it('keeps the plane at the gate, with the whole leg ahead, while it taxis out', () => {
    expect(styles(at(0.1))['f1-upcoming']).toBe('upcoming')
    expect(styles(at(0.1))['f1-flying']).toBeUndefined()
    expect(tripMapDrawing(make(EUROPE, at(0.1)), at(0.1)).plane!.place.lat).toBeCloseTo(38.1744, 9)
  })

  it('lists each airport once, and parks a drive’s car halfway when nobody is driving', () => {
    expect(tripMapDrawing(make(), at(12)).airports.map((a) => a.code)).toEqual(['SDF', 'CGN', 'DXB'])
    const legs = [drive('d1', 'LEX', 'SDF', 0, 2)]
    const drawing = tripMapDrawing(make(legs, at(-1)), at(-1))
    expect(drawing.segments.map((s) => [s.id, s.style, s.geodesic])).toEqual([['d1-drive', 'drive', false]])
    expect(drawing.cars[0].place.lng).toBeCloseTo(positionAt(make(legs, at(-1)).legs[0], 0.5).lng, 9)
  })

  it('redraws the night only once it has moved enough to see', () => {
    expect(nightTime(1_000_059_000, 60_000)).toBe(1_000_020_000)
    expect(nightTime(1_000_059_000, 0)).toBe(1_000_059_000)
  })
})
