import { describe, expect, it } from 'vitest'
import { appleCamera, appleMapPlan, laidOut, offDateLine } from '../../src/map/appleMapPlan'
import { fitClear, fitRect, NO_INSETS } from '../../src/map/mapFit'
import { placeAt } from '../../src/map/svgPaths'
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

  it('marks what the pilot is doing where they are, in place of the old heart (activity markers design §2)', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    // Twelve hours in: on the ground in Cologne for a day, a layover.
    const plan = appleMapPlan(tripMapDrawing(map, at(12)), null)
    const pilot = plan.marks.filter((m) => m.kind === 'pilot')
    expect(pilot.map((m) => [m.id, m.activity, m.priority, m.label])).toEqual([['pilot:layover', 'layover', 'required', null]])
    expect(pilot[0].place).toEqual(map.legs[0].destination.place)
    expect(plan.marks.some((m) => (m.kind as string) === 'heart')).toBe(false)
    // In flight there's a plane and no pilot's marker.
    expect(appleMapPlan(tripMapDrawing(map, at(4)), null).marks.some((m) => m.kind === 'pilot')).toBe(false)
  })

  it('ranks an airport only drives reach below the rest, so it gives way where it crowds another (tidy markers design §2)', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 1), flight('f1', 'LEX', 'CGN', 2, 8)], { isNextTrip: true, home: 'SDF', now: at(-1), airports: AIRPORTS })!
    const plan = appleMapPlan(tripMapDrawing(map, at(-1)), null)
    const priority = Object.fromEntries(plan.marks.filter((m) => m.kind === 'airport').map((m) => [m.label, m.priority]))
    expect(priority).toEqual({ SDF: 'lowest', LEX: 'low', CGN: 'low' })
  })
})

describe('the camera on Apple’s map (Apple Maps spec §5; the app’s card framing design §4)', () => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
  const places = map.legs.flatMap((l) => [l.origin.place, l.destination.place])

  it('takes the view the SVG map takes, with nothing to keep clear', () => {
    const camera = appleCamera(places, null, 390, 520, NO_INSETS)
    expect(camera).toEqual({ rect: fitClear(fitRect(places)!, 390, 520), padding: NO_INSETS })
  })

  it('gives MapKit the part of the view beside the panel, and the panel as padding, so the trip and Apple’s logo keep clear of it', () => {
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(places, null, 1000, 500, insets)
    expect(camera.padding).toEqual(insets)
    // The whole view, rebuilt from the clear part: the same one the SVG map draws.
    const perPixel = camera.rect.width / 600
    const view = { x: camera.rect.x - 400 * perPixel, y: camera.rect.y, width: 1000 * perPixel, height: 500 * perPixel }
    const full = fitClear(fitRect(places)!, 1000, 500, insets)
    expect([view.x, view.y, view.width, view.height].map((v) => +v.toFixed(9))).toEqual([full.x, full.y, full.width, full.height].map((v) => +v.toFixed(9)))
    for (const place of places) expect(placeAt(place, { rect: view, width: 1000, height: 500 }).x).toBeGreaterThanOrEqual(400)
  })

  it('slides the view to show the pilot’s marker when the chips leave too thin a band to frame the trip in', () => {
    // A 220 px card whose chips cover 90 px each: a 40 px band, from 90 to 130 px down.
    const insets = { top: 90, right: 0, bottom: 90, left: 0 }
    // Cologne, the trip's northernmost airport, lies near the top of the view.
    const pilot = map.legs[0].destination.place
    const camera = appleCamera(places, pilot, 343, 220, insets)
    // Too thin to frame in, so MapKit gets the whole view and no padding, and the marker sits in the band.
    expect(camera.padding).toEqual(NO_INSETS)
    const y = placeAt(pilot, { rect: camera.rect, width: 343, height: 220 }).y
    expect(y).toBeGreaterThanOrEqual(90)
    expect(y).toBeLessThanOrEqual(130)
    // Without the slide the marker would lie outside the band.
    const unslid = placeAt(pilot, { rect: appleCamera(places, null, 343, 220, insets).rect, width: 343, height: 220 }).y
    expect(unslid < 90 || unslid > 130).toBe(true)
  })

  it('keeps a trip across the date line beside the panel too: Anchorage to Tokyo, the short way', () => {
    const pacific = makeTripMap([flight('p1', 'ANC', 'NRT', 0, 7)], { isNextTrip: false, home: 'ANC', now: at(1), airports: AIRPORTS })!
    const ends = [pacific.legs[0].origin.place, pacific.legs[0].destination.place]
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(ends, null, 1000, 500, insets)
    // The North Pacific, the short way round: 70° and its margins, where the long way would be over three quarters of the world.
    expect(camera.rect.width).toBeLessThan(0.5)
    const perPixel = camera.rect.width / 600
    const view = { x: camera.rect.x - 400 * perPixel, y: camera.rect.y, width: 1000 * perPixel, height: 500 * perPixel }
    for (const place of ends) {
      const x = placeAt(place, { rect: view, width: 1000, height: 500 }).x
      expect(x).toBeGreaterThanOrEqual(400)
      expect(x).toBeLessThanOrEqual(1000)
    }
  })
})
