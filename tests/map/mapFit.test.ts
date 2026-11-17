import { describe, expect, it } from 'vitest'
import { fitClear, fitRect, insetsThatFit, MIN_SIDE, NO_INSETS, slideToShow, toAspect, type WorldRect } from '../../src/map/mapFit'
import { toWorld } from '../../src/map/mercator'

const SDF = { lat: 38.1744, lng: -85.736 }
const CGN = { lat: 50.8659, lng: 7.1427 }
const ANC = { lat: 61.1743, lng: -149.9963 }
const NRT = { lat: 35.772, lng: 140.3929 }
const holds = (r: WorldRect, p: { x: number; y: number }) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

describe('the camera rectangle (moving map spec §6, §12)', () => {
  it('is null for no places', () => {
    expect(fitRect([])).toBeNull()
  })

  it('holds Louisville and Cologne', () => {
    const r = fitRect([SDF, CGN])!
    expect(holds(r, toWorld(SDF))).toBe(true)
    expect(holds(r, toWorld(CGN))).toBe(true)
  })

  it('frames the North Pacific, not the world, from Anchorage to Tokyo', () => {
    const r = fitRect([ANC, NRT], 0.1)!
    expect(r.width).toBeLessThan(0.25)
    expect(r.x + r.width).toBeGreaterThan(1)
    expect(holds(r, toWorld(NRT))).toBe(true)
    expect(holds(r, { x: toWorld(ANC).x + 1, y: toWorld(ANC).y })).toBe(true)
  })

  it('gives one place the smallest size, and never starts left of the date line', () => {
    const r = fitRect([SDF])!
    expect(r.width).toBeCloseTo(MIN_SIDE, 12)
    expect(r.x + r.width / 2).toBeCloseTo(toWorld(SDF).x, 12)
    const atDateLine = fitRect([{ lat: 20, lng: -179.9 }])!
    expect(atDateLine.x).toBeGreaterThanOrEqual(0)
    expect(atDateLine.x + atDateLine.width).toBeGreaterThan(1)
  })

  it('grows the short side about the centre to the screen shape', () => {
    const r: WorldRect = { x: 0.2, y: 0.3, width: 0.1, height: 0.1 }
    const wide = toAspect(r, 2)
    expect(wide.width).toBeCloseTo(0.2, 12)
    expect(wide.height).toBeCloseTo(0.1, 12)
    expect(wide.x + wide.width / 2).toBeCloseTo(0.25, 12)
    expect(toAspect(r, 0.5).height).toBeCloseTo(0.2, 12)
  })
})

describe('fitClear (Stage 2 spec §10)', () => {
  const rect = { x: 0.4, y: 0.4, width: 0.1, height: 0.1 }

  it('is toAspect without insets', () => {
    const plain = toAspect(rect, 2)
    const clear = fitClear(rect, 1000, 500, { top: 0, right: 0, bottom: 0, left: 0 })
    expect(clear.x).toBeCloseTo(plain.x, 12)
    expect(clear.y).toBeCloseTo(plain.y, 12)
    expect(clear.width).toBeCloseTo(plain.width, 12)
    expect(clear.height).toBeCloseTo(plain.height, 12)
  })

  it('centres the trip in the part a panel on the left leaves clear', () => {
    // 1000 × 500 px with 400 px covered: the clear part is 600 × 500, so the trip spans 0.12 × 0.1 of the world there,
    // at 0.0002 world units a pixel, and the whole view starts 400 px further left.
    const clear = fitClear(rect, 1000, 500, { top: 0, right: 0, bottom: 0, left: 400 })
    expect(clear.width).toBeCloseTo(0.2, 12)
    expect(clear.height).toBeCloseTo(0.1, 12)
    expect(clear.x).toBeCloseTo(0.31, 12)
    expect(clear.y).toBeCloseTo(0.4, 12)
    // The trip's centre lands in the middle of the clear part: 400 + 600 / 2 px from the left.
    expect((0.45 - clear.x) / (clear.width / 1000)).toBeCloseTo(700, 6)
  })

  it('leaves a panel along the bottom clear', () => {
    const clear = fitClear(rect, 400, 800, { top: 0, right: 0, bottom: 300, left: 0 })
    expect((0.45 - clear.y) / (clear.height / 800)).toBeCloseTo(250, 6)
  })

  it('ignores insets that leave less than 120 px clear', () => {
    const plain = toAspect(rect, 1)
    const clear = fitClear(rect, 400, 400, { top: 0, right: 0, bottom: 0, left: 300 })
    expect(clear.x).toBeCloseTo(plain.x, 12)
    expect(clear.width).toBeCloseTo(plain.width, 12)
  })

  it('keeps the bottom chip clear where the banner and the chip leave too little, but the chip alone doesn’t', () => {
    // The card's 343 × 220 map under a banner 65 px deep, over a chip 38 px deep: 117 px between, and 182 px above the chip.
    const card = { top: 65, right: 0, bottom: 38, left: 0 }
    const above = fitClear(rect, 343, 220, { ...NO_INSETS, bottom: 38 })
    expect(fitClear(rect, 343, 220, card)).toEqual(above)
    // The trip's centre lands in the middle of the part above the chip: 91 px down.
    expect((0.45 - above.y) / (above.height / 220)).toBeCloseTo(91, 6)
  })
})

describe('the insets the camera frames inside (Apple Maps spec §4.2; the review’s fixes)', () => {
  it('are all of them where they leave 120 px clear each way', () => {
    expect(insetsThatFit({ top: 40, right: 0, bottom: 40, left: 0 }, 343, 220)).toEqual({ top: 40, right: 0, bottom: 40, left: 0 })
    expect(insetsThatFit({ top: 0, right: 0, bottom: 0, left: 412 }, 1280, 740)).toEqual({ top: 0, right: 0, bottom: 0, left: 412 })
    // Exactly 120 px is enough.
    expect(insetsThatFit({ top: 50, right: 0, bottom: 50, left: 0 }, 343, 220)).toEqual({ top: 50, right: 0, bottom: 50, left: 0 })
    expect(insetsThatFit({ top: 65, right: 0, bottom: 100, left: 0 }, 343, 220)).toEqual({ top: 0, right: 0, bottom: 100, left: 0 })
  })

  it('are the bottom one alone where they don’t, but it does: Apple’s logo and Legal link stay above the bottom chip', () => {
    expect(insetsThatFit({ top: 65, right: 0, bottom: 38, left: 0 }, 343, 220)).toEqual({ top: 0, right: 0, bottom: 38, left: 0 })
    expect(insetsThatFit({ top: 93, right: 0, bottom: 37, left: 0 }, 342, 220)).toEqual({ top: 0, right: 0, bottom: 37, left: 0 })
  })

  it('are none where even the bottom one alone leaves too little', () => {
    expect(insetsThatFit({ top: 65, right: 0, bottom: 110, left: 0 }, 343, 220)).toEqual(NO_INSETS)
    expect(insetsThatFit({ top: 0, right: 0, bottom: 0, left: 300 }, 400, 400)).toEqual(NO_INSETS)
  })
})

describe('sliding the view to show the pilot’s marker (the app’s card framing design §4.2)', () => {
  // 400 × 200 px over a rectangle a quarter of a thousandth of the world per pixel. The marker and its 8 px margin reach
  // 20 px from its centre.
  const rect = { x: 0.2, y: 0.3, width: 0.1, height: 0.05 }
  const perPixel = 0.1 / 400
  const chips = { ...NO_INSETS, top: 40, bottom: 40 }

  it('leaves the view alone when the marker shows in the clear part', () => {
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 100 }], 12, chips)).toBe(rect)
  })

  it('slides up just far enough to lift the marker out of the bottom chip’s band', () => {
    // The band ends 40 px from the bottom, at 160 px: the marker's centre goes to 140 px, 45 px up.
    const slid = slideToShow(rect, 400, 200, [{ x: 100, y: 185 }], 12, chips)
    expect(slid.x).toBe(rect.x)
    expect(slid.y).toBeCloseTo(rect.y + 45 * perPixel, 12)
  })

  it('slides each axis on its own: in from the right edge and down from the top', () => {
    const slid = slideToShow(rect, 400, 200, [{ x: 395, y: 5 }], 12)
    expect(slid.x).toBeCloseTo(rect.x + 15 * perPixel, 12)
    expect(slid.y).toBeCloseTo(rect.y - 15 * perPixel, 12)
  })

  it('centres a marker larger than the clear part in it', () => {
    // 20 px clear between 90 and 110 px, less than the marker's 40: its centre goes to 100 px.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 150 }], 12, { ...NO_INSETS, top: 90, bottom: 90 })
    expect(slid.y).toBeCloseTo(rect.y + 50 * perPixel, 12)
  })

  // A band from 60 px down to 160 px, under the latest event's banner and over the bottom chip (latest event design §2).
  const band = { ...NO_INSETS, top: 60, bottom: 40 }

  /** How far the view slid down, in px, to a millionth: what's on it moved down by as much. */
  const slidDown = (slid: WorldRect) => Math.round(((rect.y - slid.y) / perPixel) * 1e6) / 1e6

  it('shows the ghost beside the real plane where a little more slide shows it', () => {
    // Both above the band, the ghost 10 px higher: the real plane alone would come down 50 px, to 80; the ghost 10 more
    // shows it too, 20 px inside the band's top.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 30 }, { x: 210, y: 20 }], 12, band)
    expect(slid.x).toBe(rect.x)
    expect(slid.y).toBeCloseTo(rect.y - 60 * perPixel, 12)
  })

  it('keeps the real plane in the band whatever its ghost asks: here the ghost is left above', () => {
    // 180 px apart in a 100 px band: the real plane, below it, comes up to 140 px, the most the ghost can pull it.
    const slid = slideToShow(rect, 400, 200, [{ x: 200, y: 190 }, { x: 200, y: 10 }], 12, band)
    expect(slid.y).toBeCloseTo(rect.y + 50 * perPixel, 12)
  })

  it('lets a ghost off the view as framed move it not at all: after a deviation the real plane alone is kept', () => {
    // The real path 300 px east of the planned arc: the real plane near the view's left, its ghost off it, 250 px further
    // left. Across, the two would fit in the 400 px view, and once the view slid 270 px to show them.
    expect(slideToShow(rect, 400, 200, [{ x: 50, y: 100 }, { x: -250, y: 100 }], 12, band)).toBe(rect)
    // Off the view above, the same: the real plane above the band comes just inside it, 40 px down, as it would alone.
    expect(slidDown(slideToShow(rect, 400, 200, [{ x: 200, y: 40 }, { x: 200, y: -200 }], 12, band))).toBeCloseTo(40, 9)
  })

  it('pulls toward showing all the other marks together, their nearer end first', () => {
    // The real plane at 90 px needs nothing. The others, at 70 and 75 px, all show 10 px down: 10 px to bring the higher in.
    expect(slidDown(slideToShow(rect, 400, 200, [{ x: 200, y: 90 }, { x: 200, y: 70 }, { x: 200, y: 75 }], 12, band))).toBeCloseTo(10, 9)
  })

  it('lets a ghost on the view pull it no further than a marker and its margin, 20 px', () => {
    // The real plane in the band at 100 px, its ghost 90 px above, which 70 px of slide would show: the view goes 20.
    expect(slidDown(slideToShow(rect, 400, 200, [{ x: 200, y: 100 }, { x: 200, y: 10 }], 12, band))).toBeCloseTo(20, 9)
  })

  it('moves the view smoothly as the ghost draws away, with no jump where the two stop fitting together', () => {
    // The real plane at 100 px, in the band, needs no slide. Its ghost goes from beside it to the view's top, a pixel at a
    // time. Showing both once took up to 40 px of slide, and none the pixel after they stopped fitting together.
    const slides = Array.from({ length: 101 }, (_, i) => slidDown(slideToShow(rect, 400, 200, [{ x: 200, y: 100 }, { x: 200, y: 100 - i }], 12, band)))
    slides.forEach((slide, i) => {
      if (i > 0) expect(Math.abs(slide - slides[i - 1])).toBeLessThanOrEqual(1 + 1e-9)
      // The real plane stays in the band, its marker and margin with it, and the view never goes more than 20 px for the ghost.
      expect(100 + slide).toBeGreaterThanOrEqual(80)
      expect(100 + slide).toBeLessThanOrEqual(140)
      expect(Math.abs(slide)).toBeLessThanOrEqual(20)
    })
    expect(Math.max(...slides)).toBe(20)
  })

  it('with nothing to keep in view, as on a drive, leaves the view alone, however thin the band', () => {
    expect(slideToShow(rect, 400, 200, [], 12, band)).toBe(rect)
    expect(slideToShow(rect, 400, 200, [], 12, { ...NO_INSETS, top: 90, bottom: 90 })).toBe(rect)
  })

  it('slides by whole pixels, so a plane moving a little each second moves the camera only once it has moved a pixel', () => {
    // 35.1 or 35.9 px below where the band lets it be: it slides 36, so all of it is in.
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 175.1 }], 12, band).y).toBeCloseTo(rect.y + 36 * perPixel, 12)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 175.9 }], 12, band).y).toBeCloseTo(rect.y + 36 * perPixel, 12)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 24.6 }], 12, band).y).toBeCloseTo(rect.y - 56 * perPixel, 12)
    // Under half a pixel out, as a hair of rounding, is no slide at all; half a pixel is one.
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 140.3 }], 12, band)).toBe(rect)
    expect(slideToShow(rect, 400, 200, [{ x: 200, y: 140.5 }], 12, band).y).toBeCloseTo(rect.y + perPixel, 12)
  })
})
