import { describe, expect, it } from 'vitest'
import { appleMapPlan, laidOut, offDateLine } from '../../src/map/appleMapPlan'
import { makeTripMap } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

describe('what Apple’s map shows (Apple Maps spec §8, §11)', () => {
  it('lays a line out in one piece across the date line, so MapKit draws it the short way', () => {
    const laid = laidOut([{ lat: 61, lng: -150 }, { lat: 60, lng: -175 }, { lat: 55, lng: 175 }, { lat: 36, lng: 140 }])
    expect(laid.map((p) => p.lng)).toEqual([-150, -175, -185, -220])
    expect(laidOut([{ lat: 0, lng: 10 }, { lat: 0, lng: 20 }]).map((p) => p.lng)).toEqual([10, 20])
  })

  it('keeps a night shape a hair off the date line, where MapKit takes 180° and −180° for one edge and fills the shape inside-out', () => {
    // A layer as wide as the world: its top edge, then its lower edge back, deep at the date line.
    const shape = [{ lat: 85, lng: -180 }, { lat: 85, lng: 0 }, { lat: 85, lng: 180 }, { lat: -60, lng: 180 }, { lat: 70, lng: 0 }, { lat: -60, lng: -180 }]
    const kept = offDateLine(shape)
    expect(kept.map((p) => p.lng)).toEqual([-179.999, 0, 179.999, 179.999, 0, -179.999])
    expect(kept.map((p) => p.lat)).toEqual(shape.map((p) => p.lat))
  })

  it('draws each segment as a line in its style: a flight along its great circle, a drive straight', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 1), flight('f1', 'LEX', 'CGN', 2, 8)], { isNextTrip: true, home: 'SDF', now: at(-1), airports: AIRPORTS })!
    const plan = appleMapPlan(tripMapDrawing(map, at(-1)), null)
    expect(plan.lines.map((l) => [l.style, l.points.length])).toEqual([['drive', 2], ['upcoming', 101]])
  })

  it('marks the airports, outranking the leg’s own, and the plane turned to its heading', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
    const drawing = tripMapDrawing(map, at(4))
    const plan = appleMapPlan(drawing, map.legs[0])
    const airports = plan.marks.filter((m) => m.kind === 'airport')
    expect(airports.map((m) => [m.label, m.priority])).toEqual(
      drawing.airports.map((a) => [a.code, a.code === 'SDF' || a.code === 'CGN' ? 'high' : 'low']),
    )
    const plane = plan.marks.find((m) => m.kind === 'plane')!
    expect(plane.priority).toBe('required')
    expect(plane.degrees).toBeCloseTo((drawing.plane!.angle * 180) / Math.PI + 90)
    expect(new Set(plan.marks.map((m) => m.id)).size).toBe(plan.marks.length)
  })
})
