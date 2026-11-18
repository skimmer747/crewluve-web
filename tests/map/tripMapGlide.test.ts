import { describe, expect, it } from 'vitest'
import type { WorldRect } from '../../src/map/mapFit'
import { GLIDE_TIME_CONSTANT_MS, glideStep, isThere } from '../../src/map/tripMapGlide'

/**
 * The glide toward the frame that follows the plane (the app's follow the plane design §4), as the app's
 * TripMapGlideTests, in world units (a world across is 1) where the app's are MapKit's map points (268,435,456 across).
 */
const WORLD = 268_435_456
const rect = (x: number, y: number, width: number, height: number): WorldRect => ({ x: x / WORLD, y: y / WORLD, width: width / WORLD, height: height / WORLD })
const current = rect(100_000_000, 100_000_000, 8_000_000, 8_000_000)
const FRAME = 1000 / 60
const midX = (r: WorldRect) => r.x + r.width / 2
const midY = (r: WorldRect) => r.y + r.height / 2
/** Within a map point of the app's, in world units. */
const NEAR = 1 / WORLD

describe('the glide toward the frame (follow the plane design §4)', () => {
  it('closes part of the gap, in its middle and its zoom alike', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    const next = glideStep(current, target, GLIDE_TIME_CONSTANT_MS)
    const share = 1 - Math.exp(-1)
    expect(Math.abs(midX(next) - (midX(current) + (midX(target) - midX(current)) * share))).toBeLessThan(NEAR)
    expect(Math.abs(midY(next) - (midY(current) + (midY(target) - midY(current)) * share))).toBeLessThan(NEAR)
    // The zoom eases by the same share of its log: from 8 to 2 million is a quarter, so 4^0.632 smaller.
    expect(Math.abs(next.width - 8_000_000 / WORLD / 4 ** share)).toBeLessThan(NEAR)
    expect(Math.abs(next.height - next.width)).toBeLessThan(NEAR)
  })

  it('catches up in about a second, frame by frame', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    let r = current
    for (let i = 0; i < 60; i++) r = glideStep(r, target, FRAME)
    expect(Math.abs(midX(r) - midX(target)), 'within 6% after a second').toBeLessThan(0.06 * Math.abs(midX(current) - midX(target)))
    for (let i = 0; i < 240; i++) r = glideStep(r, target, FRAME)
    expect(r, 'there, exactly, and no further').toEqual(target)
  })

  it('is never in a hurry', () => {
    // A fifth of a second on, more than half the gap is still to go.
    const target = rect(104_000_000, 100_000_000, 8_000_000, 8_000_000)
    const next = glideStep(current, target, 200)
    expect(midX(target) - midX(next)).toBeGreaterThan(0.5 * (midX(target) - midX(current)))
  })

  it('never overshoots', () => {
    const target = rect(104_000_000, 102_000_000, 2_000_000, 2_000_000)
    expect(glideStep(current, target, 60_000)).toEqual(target)
    expect(glideStep(current, target, 0), 'no time, no move').toEqual(current)
  })

  it('goes the short way across the date line', () => {
    const west = rect(WORLD - 6_000_000, 100_000_000, 4_000_000, 4_000_000)
    const east = rect(2_000_000, 100_000_000, 4_000_000, 4_000_000)
    const next = glideStep(west, east, GLIDE_TIME_CONSTANT_MS)
    // Its middle moves east across the line, 6.32 million of the 8 million, not back across the world.
    const moved = (midX(next) - midX(west) + 1) % 1
    expect(Math.abs(moved - (8_000_000 / WORLD) * (1 - Math.exp(-1)))).toBeLessThan(NEAR)
    expect(next.x).toBeGreaterThanOrEqual(0)
    expect(next.x).toBeLessThan(1)
    // And back west across it, still starting on the map.
    const back = glideStep(east, west, GLIDE_TIME_CONSTANT_MS)
    expect(back.x).toBeGreaterThanOrEqual(0)
    expect(back.x).toBeLessThan(1)
  })

  it('is there only when the gap is tiny', () => {
    const nudged = { ...current, x: current.x + 4_000 / WORLD }
    expect(isThere(current, nudged), '4,000 of 8 million: a twentieth of a percent').toBe(true)
    expect(isThere(current, { ...current, x: current.x + 80_000 / WORLD })).toBe(false)
  })
})
