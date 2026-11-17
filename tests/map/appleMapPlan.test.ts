import { describe, expect, it } from 'vitest'
import { appleCamera, appleMapPlan, isSameView, keepInView, laidOut, offDateLine, slideIntoView, type AppleCamera } from '../../src/map/appleMapPlan'
import { fitClear, fitRect, NO_INSETS, type Insets, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'
import { placeAt } from '../../src/map/svgPaths'
import type { GeoPoint } from '../../src/map/greatCircle'
import { framingPoints, legProgress, makeTripMap, positionAt } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

/** Where a place is on the whole `width` × `height` view MapKit shows for `camera`: its rectangle, grown by its padding. */
function onCard(place: GeoPoint, { rect, padding }: AppleCamera, width: number, height: number) {
  const perPixel = rect.width / (width - padding.left - padding.right)
  const view = { x: rect.x - padding.left * perPixel, y: rect.y - padding.top * perPixel, width: width * perPixel, height: height * perPixel }
  return placeAt(place, { rect: view, width, height })
}

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
    const camera = appleCamera(places, [], 390, 520, NO_INSETS)
    expect(camera).toEqual({ rect: fitClear(fitRect(places)!, 390, 520), padding: NO_INSETS })
  })

  it('gives MapKit the part of the view beside the panel, and the panel as padding, so the trip and Apple’s logo keep clear of it', () => {
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(places, [], 1000, 500, insets)
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
    const camera = appleCamera(places, [pilot], 343, 220, insets)
    // Too thin to frame in, so the trip is framed above the bottom chip, which MapKit keeps as its padding for its logo
    // and Legal link, and the marker sits in the band.
    expect(camera.padding).toEqual({ ...NO_INSETS, bottom: 90 })
    const y = onCard(pilot, camera, 343, 220).y
    expect(y).toBeGreaterThanOrEqual(90)
    expect(y).toBeLessThanOrEqual(130)
    // Without the slide the marker would lie outside the band.
    const unslid = onCard(pilot, appleCamera(places, [], 343, 220, insets), 343, 220).y
    expect(unslid < 90 || unslid > 130).toBe(true)
  })

  it('keeps a trip across the date line beside the panel too: Anchorage to Tokyo, the short way', () => {
    const pacific = makeTripMap([flight('p1', 'ANC', 'NRT', 0, 7)], { isNextTrip: false, home: 'ANC', now: at(1), airports: AIRPORTS })!
    const ends = [pacific.legs[0].origin.place, pacific.legs[0].destination.place]
    const insets = { top: 0, right: 0, bottom: 0, left: 400 }
    const camera = appleCamera(ends, [], 1000, 500, insets)
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

describe('keeping the plane and its ghost in the card’s band under the latest event (latest event design §2)', () => {
  // Louisville to Anchorage, five hours into six: the plane is near Anchorage, at the top of the card's view of the leg,
  // and its ghost a little behind it. Todd's measures of the card at phone width: 342 × 220, the banner 50 px tall with
  // the key under it, 23 px, and the bottom chip 23 px: the camera keeps 93 px at the top and 37 at the bottom, a band
  // too thin to frame the leg in.
  const map = makeTripMap([flight('a1', 'SDF', 'ANC', 0, 6)], { isNextTrip: false, home: 'SDF', now: at(5), airports: AIRPORTS })!
  const leg = map.legs[0]
  const framing = framingPoints(map, leg)
  const plane = positionAt(leg, legProgress(leg, at(5)))
  const ghost = positionAt(leg, legProgress(leg, at(4.8)))
  const banner: Insets = { top: 93, right: 0, bottom: 37, left: 0 }
  const yOf = (place: GeoPoint, camera: AppleCamera) => onCard(place, camera, 342, 220).y

  it('slides the whole view so both sit in the band, their marks and margins clear of the banner, the key and the chip', () => {
    const camera = appleCamera(framing, [plane, ghost], 342, 220, banner)
    // MapKit keeps the bottom chip's padding, so its logo and Legal link stay above the chip (the review's fixes).
    expect(camera.padding).toEqual({ ...NO_INSETS, bottom: 37 })
    for (const place of [plane, ghost]) {
      expect(yOf(place, camera)).toBeGreaterThanOrEqual(93 + 20)
      expect(yOf(place, camera)).toBeLessThanOrEqual(220 - 37 - 20)
    }
    // Without them, as before, the plane sat under the banner.
    expect(yOf(plane, appleCamera(framing, [], 342, 220, banner))).toBeLessThan(93)
  })

  it('lets a ghost off the view as framed move it not at all: after a deviation, the real plane alone is kept', () => {
    // The ghost 15° north of the plane, far off the card's view of the leg.
    const astray = { lat: plane.lat + 15, lng: plane.lng }
    expect(appleCamera(framing, [plane, astray], 342, 220, banner)).toEqual(appleCamera(framing, [plane], 342, 220, banner))
  })

  it('between framings, slides again only once the plane’s marker pokes out of the band, then back to its margin', () => {
    const asked = appleCamera(framing, [plane], 342, 220, banner)
    expect(yOf(plane, asked)).toBeGreaterThanOrEqual(113)
    expect(yOf(plane, asked)).toBeLessThan(114)
    // The view as MapKit shows it once the plane has flown `px` further north.
    const perPixel = asked.rect.width / 342
    const flown = (px: number): AppleCamera => ({ ...asked, rect: { ...asked.rect, y: asked.rect.y + px * perPixel } })
    // 7 px into its 8 px margin, its marker still clear of the banner and the key: left alone, wherever its ghost is.
    expect(keepInView(flown(7), [plane, ghost], 342, 220, banner)).toBeNull()
    const ahead = { lat: plane.lat + 1, lng: plane.lng }
    expect(yOf(ahead, flown(7))).toBeLessThan(93 + 12)
    expect(keepInView(flown(7), [plane, ahead], 342, 220, banner)).toBeNull()
    // 10 px on, its marker a pixel past the band's edge: slid back so it and its margin are in, at the same zoom.
    const slid = keepInView(flown(10), [plane, ghost], 342, 220, banner)!
    expect(slid.rect.width).toBeCloseTo(asked.rect.width, 12)
    expect(yOf(plane, slid)).toBeGreaterThanOrEqual(113)
    expect(yOf(plane, slid)).toBeLessThanOrEqual(163)
    expect(keepInView(flown(10), [], 342, 220, banner)).toBeNull()
  })

  it('between framings, slides across too, once the plane’s marker pokes out of the card’s side', () => {
    const asked = appleCamera(framing, [plane], 342, 220, banner)
    const perPixel = asked.rect.width / 342
    const x = onCard(plane, asked, 342, 220).x
    // The view as MapKit shows it with the plane 5 px from the card's left edge: its 12 px marker pokes out.
    const atTheSide: AppleCamera = { ...asked, rect: { ...asked.rect, x: asked.rect.x + (x - 5) * perPixel } }
    const slid = keepInView(atTheSide, [plane], 342, 220, banner)!
    expect(onCard(plane, slid, 342, 220).x).toBeGreaterThanOrEqual(20)
  })

  it('knows MapKit’s report on an earlier ask by its rectangle, though newer padding is set by then', () => {
    // The full map framed, then framed again beside the side panel as it opens: MapKit reports late on the first.
    const first = appleCamera(framing, [plane], 1280, 740, NO_INSETS)
    const second = appleCamera(framing, [plane], 1280, 740, { ...NO_INSETS, left: 412 })
    const late: AppleCamera = { rect: first.rect, padding: second.padding }
    expect(isSameView(late, first, 1280)).toBe(true)
    expect(isSameView(late, second, 1280)).toBe(false)
    // A pixel out is the same view; two are not.
    const perPixel = first.rect.width / 1280
    expect(isSameView({ ...first, rect: { ...first.rect, x: first.rect.x + 0.9 * perPixel } }, first, 1280)).toBe(true)
    expect(isSameView({ ...first, rect: { ...first.rect, y: first.rect.y + 2 * perPixel } }, first, 1280)).toBe(false)
  })

  it('once MapKit shows what it was asked for, slides no more', () => {
    expect(slideIntoView(appleCamera(framing, [plane, ghost], 342, 220, banner), [plane, ghost], 342, 220, banner)).toBeNull()
  })
})

describe('keeping the pilot’s marker in view when MapKit won’t zoom out far enough (the app’s TripMapSlide)', () => {
  // The demo's Anchorage trip on the 343 × 220 card, under its top chip: MapKit stops zooming out short of it.
  const pacific = makeTripMap([flight('a1', 'SDF', 'ANC', 0, 6), flight('a2', 'ANC', 'SDF', 30, 6)], {
    isNextTrip: false, home: 'SDF', now: at(40), airports: AIRPORTS,
  })!
  const places = pacific.legs.flatMap((l) => [l.origin.place, l.destination.place])
  const home = pacific.legs[0].origin.place
  const insets: Insets = { top: 37, right: 0, bottom: 0, left: 0 }
  const [width, height] = [343, 220]

  /** The whole card MapKit shows: its visible rectangle, which is only the part inside its padding, grown by the padding. */
  const wholeView = ({ rect, padding }: AppleCamera): WorldRect => {
    const perPixel = rect.width / (width - padding.left - padding.right)
    return { x: rect.x - padding.left * perPixel, y: rect.y - padding.top * perPixel, width: width * perPixel, height: height * perPixel }
  }
  /** MapKit at its limit: the middle of what it was asked for, `share` as wide and as high, inside the same padding. */
  const atLimit = ({ rect, padding }: AppleCamera, share: number): AppleCamera => ({
    rect: { x: rect.x + (rect.width * (1 - share)) / 2, y: rect.y + (rect.height * (1 - share)) / 2, width: rect.width * share, height: rect.height * share },
    padding,
  })
  const marker = (shown: AppleCamera) => placeAt(home, { rect: wholeView(shown), width, height })
  const asked = appleCamera(places, [home], width, height, insets)

  it('leaves the view alone when MapKit shows what it was asked for: the marker is in view', () => {
    expect(slideIntoView(asked, [home], width, height, insets)).toBeNull()
  })

  it('slides MapKit’s closer view the shortest way, without zooming, to show the marker below the chip', () => {
    const shown = atLimit(asked, 0.6)
    // At MapKit's limit, Louisville, at the trip's edge, falls off the card.
    expect(marker(shown).x > width || marker(shown).y > height).toBe(true)
    const slid = slideIntoView(shown, [home], width, height, insets)!
    expect(slid.padding).toEqual(insets)
    // The same zoom MapKit settled on: asking for any wider would be held back again.
    expect(slid.rect.width).toBeCloseTo(shown.rect.width, 12)
    expect(slid.rect.height).toBeCloseTo(shown.rect.height, 12)
    // The marker, its 12 px radius and the 8 px margin all lie on the card below the chip.
    const at = marker(slid)
    expect(at.x).toBeGreaterThanOrEqual(20)
    expect(at.x).toBeLessThanOrEqual(width - 20)
    expect(at.y).toBeGreaterThanOrEqual(37 + 20)
    expect(at.y).toBeLessThanOrEqual(height - 20)
  })

  it('reads MapKit’s view as the part inside its padding: a marker just under the chip slides clear of it', () => {
    const shown = atLimit(asked, 0.6)
    const perPixel = shown.rect.width / width
    const was = marker(shown)
    // Moved so Louisville sits mid-card, 10 px below the chip: on the card, but without its margin below the chip.
    const nudged = { rect: { ...shown.rect, x: shown.rect.x + (was.x - width / 2) * perPixel, y: shown.rect.y + (was.y - 47) * perPixel }, padding: insets }
    expect(marker(nudged).x).toBeCloseTo(width / 2, 0)
    expect(marker(nudged).y).toBeCloseTo(47, 0)
    const slid = slideIntoView(nudged, [home], width, height, insets)!
    expect(marker(slid).x).toBeCloseTo(width / 2, 0)
    expect(marker(slid).y).toBeCloseTo(37 + 20, 0)
  })

  it('keeps the marker in the band when the chips leave too thin a part to frame in, where MapKit has no padding', () => {
    // Chips 90 and 105 px deep leave a 25 px band, too thin to frame in, and 115 px above the bottom one, too thin as well:
    // MapKit is given the whole card. The marker, larger than the band, is centred in it.
    const thin = { top: 90, right: 0, bottom: 105, left: 0 }
    const camera = appleCamera(places, [home], width, height, thin)
    expect(camera.padding).toEqual(NO_INSETS)
    const slid = slideIntoView(atLimit(camera, 0.6), [home], width, height, thin)!
    expect(slid.padding).toEqual(NO_INSETS)
    expect(Math.abs(marker(slid).y - 102.5)).toBeLessThanOrEqual(1)
  })

  it('keeps the bottom chip’s padding where it alone leaves room, as MapKit settles closer in', () => {
    const chips = { top: 90, right: 0, bottom: 90, left: 0 }
    const camera = appleCamera(places, [home], width, height, chips)
    expect(camera.padding).toEqual({ ...NO_INSETS, bottom: 90 })
    const slid = slideIntoView(atLimit(camera, 0.6), [home], width, height, chips)!
    expect(slid.padding).toEqual({ ...NO_INSETS, bottom: 90 })
    expect(marker(slid).y).toBeGreaterThanOrEqual(90)
    expect(marker(slid).y).toBeLessThanOrEqual(130)
  })

  describe('by the date line', () => {
    // A view just east of the date line, a ten-thousandth of the world to a pixel.
    const perPixel = 1e-4
    /** What MapKit shows for the whole card `view`, under the top chip. */
    const shownOf = (view: WorldRect): AppleCamera => ({ rect: { ...view, y: view.y + 37 * perPixel, height: (height - 37) * perPixel }, padding: insets })
    /** A place `px` pixels east of the date line, and the card with it `at` px in from the left, mid-card. */
    const scene = (px: number, at: number) => {
      const place = { lat: 52, lng: px * perPixel * 360 - 180 }
      const p = toWorld(place)
      return { place, view: { x: p.x - at * perPixel, y: p.y - 120 * perPixel, width: width * perPixel, height: height * perPixel } }
    }

    it('slides the short way, the marker 5 px from the left edge coming in, not round the world', () => {
      const { place, view } = scene(10, 5)
      const slid = slideIntoView(shownOf(view), [place], width, height, insets)!
      expect(wholeView(slid).width).toBeCloseTo(view.width, 12)
      expect(placeAt(place, { rect: wholeView(slid), width, height }).x).toBeCloseTo(20, 0)
    })

    it('counts a marker under a pixel from its place as in view, though the slide to it would cross the line', () => {
      // 0.3 px short of its margin: the slide there would take the view's left edge across the date line.
      const { place, view } = scene(19.85, 19.7)
      expect(view.x).toBeGreaterThan(0)
      expect(view.x - 0.3 * perPixel).toBeLessThan(0)
      expect(slideIntoView(shownOf(view), [place], width, height, insets)).toBeNull()
    })
  })

  it('takes a marker already slid into view as in view, so a second check never chases rounding', () => {
    const slid = slideIntoView(atLimit(asked, 0.6), [home], width, height, insets)!
    expect(slideIntoView(slid, [home], width, height, insets)).toBeNull()
  })
})
