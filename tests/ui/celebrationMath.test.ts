import { describe, expect, it } from 'vitest'
import { CELEBRATION_MS, celebrationFrame, figureGeometry } from '../../src/ui/celebrationMath'

describe('celebrationFrame', () => {
  it('lasts 2.4 s: 2 s visible, then a 0.4 s fade', () => {
    expect(CELEBRATION_MS).toBe(2400)
    expect(celebrationFrame(-1)).toBeNull()
    expect(celebrationFrame(2400)).toBeNull()
    expect(celebrationFrame(1000)?.opacity).toBe(1)
    expect(celebrationFrame(2200)?.opacity).toBeCloseTo(0.5)
  })

  it('waves the arms about every 0.67 s', () => {
    expect(celebrationFrame(0)?.armRaise).toBeCloseTo(1)
    expect(celebrationFrame(1000 / 3)?.armRaise).toBeCloseTo(0)
  })

  it('releases hearts that rise 35 px over a second while fading and shrinking', () => {
    expect(celebrationFrame(0)?.hearts).toEqual([])
    const frame = celebrationFrame(550)!
    expect(frame.hearts).toHaveLength(3) // released at 0.05, 0.25, and 0.50 s
    const [first] = frame.hearts
    expect(first.x).toBeCloseTo(-8)
    expect(first.y).toBeCloseTo(-29.5)
    expect(first.size).toBe(10)
    expect(first.opacity).toBeCloseTo(0.5)
    expect(first.scale).toBeCloseTo(0.8)
  })

  it('bounces the figure through Crewluve’s keyframes', () => {
    expect(celebrationFrame(0)?.scale).toBe(1)
    expect(celebrationFrame(300)?.scale).toBeCloseTo(1.3)
    expect(celebrationFrame(1400)?.scale).toBeCloseTo(1)
  })
})

describe('figureGeometry', () => {
  it('raises the hands toward the head', () => {
    expect(figureGeometry(0).rHand.x).toBeCloseTo(26.64)
    expect(figureGeometry(0).rHand.y).toBeCloseTo(2.8)
    expect(figureGeometry(1).rHand.x).toBeCloseTo(22.32)
    expect(figureGeometry(1).rHand.y).toBe(0)
    expect(figureGeometry(1).lHand.x).toBeCloseTo(36 - 22.32)
  })
})
