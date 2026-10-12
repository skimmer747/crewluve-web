import { describe, expect, it } from 'vitest'
import { greatCirclePoint, type GeoPoint } from '../../src/ui/flightMapGeometry'
import { flightSky, solarTransition } from '../../src/ui/flightSky'
import { isSunUp } from '../../src/time/sun'
import { HOUR, MINUTE } from '../../src/time/zoned'

const SDF: GeoPoint = { lat: 38.1746, lon: -85.7382 }
const RFD: GeoPoint = { lat: 42.1954, lon: -89.0972 }
const ANC: GeoPoint = { lat: 61.1744, lon: -149.9983 }

/** Daylight on the plane at `progress` of a flight from `dep` at `out` to `arr` at `in_`. */
const dayAt = (dep: GeoPoint, arr: GeoPoint, out: number, in_: number, progress: number) => {
  const at = greatCirclePoint(dep, arr, progress)
  return isSunUp(out + (in_ - out) * progress, at.lat, at.lon)
}

describe('solarTransition', () => {
  // Anchorage at 5:40 AM, before sunrise, to Louisville at 2:40 PM: the sun rises on the way.
  const out = Date.UTC(2026, 9, 12, 13, 40)
  const in_ = out + 5 * HOUR

  it('finds the sunrise on a flight that leaves in the dark and lands in daylight', () => {
    const t = solarTransition(ANC, SDF, out, in_)!
    expect(t.sunrise).toBe(true)
    expect(t.progress).toBeGreaterThan(0)
    expect(t.progress).toBeLessThan(1)
  })

  it('puts it halfway between the last 5-minute sample in the dark and the first in daylight', () => {
    const t = solarTransition(ANC, SDF, out, in_)!
    const samples = 60 // 300 minutes in 5-minute steps
    const first = Array.from({ length: samples + 1 }, (_, i) => i).find((i) => dayAt(ANC, SDF, out, in_, i / samples))!
    expect(first).toBeGreaterThan(0)
    expect(dayAt(ANC, SDF, out, in_, (first - 1) / samples)).toBe(false)
    expect(t.progress).toBeCloseTo((first - 0.5) / samples, 12)
  })

  it('finds a sunset as well', () => {
    // Anchorage at 3 PM to Louisville at midnight, flying into the night.
    const afternoon = Date.UTC(2026, 9, 12, 23)
    expect(solarTransition(ANC, SDF, afternoon, afternoon + 5 * HOUR)?.sunrise).toBe(false)
  })

  it('is null when the daylight doesn’t change: Louisville to Rockford in the morning', () => {
    const morning = Date.UTC(2026, 9, 12, 15)
    expect(solarTransition(SDF, RFD, morning, morning + 90 * MINUTE)).toBeNull()
  })

  it('is null for a flight of 30 minutes or less, as in the app', () => {
    // Across the sunrise at Louisville, which a longer flight would find.
    const dawn = Date.UTC(2026, 9, 12, 11, 40)
    expect(solarTransition(SDF, RFD, dawn, dawn + 30 * MINUTE)).toBeNull()
    expect(solarTransition(SDF, RFD, dawn, dawn + 31 * MINUTE)).not.toBeNull()
  })
})

describe('flightSky', () => {
  it('paints one sky top to bottom when both ends have the same daylight', () => {
    expect(flightSky(true, true, 0.25, 0.75, null)).toEqual({ direction: 'down', time: 'day' })
    expect(flightSky(false, false, 0.25, 0.75, null)).toEqual({ direction: 'down', time: 'night' })
  })

  it('splits the sky across at the sunrise point, 15% of the width wide', () => {
    expect(flightSky(false, true, 0.25, 0.75, { progress: 0.5, sunrise: true })).toEqual({
      direction: 'across',
      left: 'night',
      right: 'day',
      leftUntil: 0.425,
      rightFrom: 0.575,
    })
  })

  it('puts the departure on the right for a westbound flight, measuring the point from it', () => {
    const sky = flightSky(true, false, 0.75, 0.25, { progress: 0.2, sunrise: false })
    expect(sky).toMatchObject({ direction: 'across', left: 'night', right: 'day' })
    if (sky.direction !== 'across') throw new Error('expected a split sky')
    expect(sky.leftUntil).toBeCloseTo(0.65 - 0.075, 9)
    expect(sky.rightFrom).toBeCloseTo(0.65 + 0.075, 9)
  })

  it('keeps the blend inside the map at its edges', () => {
    const sky = flightSky(false, true, 0.02, 0.98, { progress: 0, sunrise: true })
    expect(sky).toMatchObject({ leftUntil: 0, rightFrom: expect.closeTo(0.095, 9) })
    const late = flightSky(false, true, 0.02, 0.98, { progress: 1, sunrise: true })
    expect(late).toMatchObject({ leftUntil: expect.closeTo(0.905, 9), rightFrom: 1 })
  })

  it('blends across the whole width without a sunrise or sunset point', () => {
    expect(flightSky(false, true, 0.25, 0.75, null)).toEqual({ direction: 'across', left: 'night', right: 'day', leftUntil: 0, rightFrom: 1 })
  })
})
