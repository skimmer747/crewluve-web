import { describe, expect, it } from 'vitest'
import { fitClear, fitRect, MIN_SIDE, toAspect, type WorldRect } from '../../src/map/mapFit'
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
})
