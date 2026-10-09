import { describe, expect, it } from 'vitest'
import { CELEBRATION_MS, celebrationFrame, figureGeometry } from '../../src/ui/celebrationMath'

describe('celebrationFrame', () => {
  it('lasts 2.4 s: 2 s visible, then a 0.4 s fade', () => {
    expect(CELEBRATION_MS).toBe(2400)
    expect(celebrationFrame(-1)).toBeNull()
    expect(celebrationFrame(2400)).toBeNull()
    expect(celebrationFrame(1000)?.opacity).toBe(1)
    // Halfway through the fade an ease-out has covered 75% of the way, so a quarter of the opacity is left.
    // (A straight line would leave a half.)
    expect(celebrationFrame(2200)?.opacity).toBeCloseTo(0.25)
  })

  it('fades out on an ease-out curve, fast at first and slowing to nothing', () => {
    expect(celebrationFrame(2000)?.opacity).toBe(1)
    expect(celebrationFrame(2100)?.opacity).toBeCloseTo(0.5625)
    expect(celebrationFrame(2300)?.opacity).toBeCloseTo(0.0625)
    expect(celebrationFrame(2399)?.opacity).toBeCloseTo(0, 4)
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

  it.each([
    // [released at (s), size, starting x, drift]: the six hearts of CelebrationFigureView, in release order.
    [0.05, 10, -6, -4],
    [0.25, 8, 8, 5],
    [0.5, 12, -2, -2],
    [0.75, 9, 12, 6],
    [1.0, 7, -10, -6],
    [1.25, 11, 4, 3],
  ])('releases the heart at %f s with size %i, starting x %i and drift %i', (delay, size, x, drift) => {
    const ms = (seconds: number) => Math.round(seconds * 1000)
    const heart = celebrationFrame(ms(delay + 0.5))!.hearts.find((h) => h.size === size)
    expect(heart?.x).toBeCloseTo(x + drift * 0.5)
    expect(heart?.y).toBeCloseTo(-29.5)
    expect(celebrationFrame(ms(delay - 0.02))!.hearts.find((h) => h.size === size)).toBeUndefined()
    expect(celebrationFrame(ms(delay + 1.02))!.hearts.find((h) => h.size === size)).toBeUndefined()
  })

  it('bounces the figure through Crewluve’s keyframes', () => {
    expect(celebrationFrame(0)?.scale).toBe(1)
    expect(celebrationFrame(300)?.scale).toBeCloseTo(1.3)
    expect(celebrationFrame(1400)?.scale).toBeCloseTo(1)
  })

  it.each([[250, -12], [450, 0], [700, -10], [900, 0], [1100, -6], [1300, 0]])(
    'hops to offset keyframe %i ms: %i px', (ms, offsetY) => expect(celebrationFrame(ms)?.offsetY).toBeCloseTo(offsetY),
  )

  it.each([[250, 8], [550, -8], [800, 6], [1050, -6], [1300, 0]])(
    'tilts to rotation keyframe %i ms: %i°', (ms, rotation) => expect(celebrationFrame(ms)?.rotation).toBeCloseTo(rotation),
  )

  it('eases out of each keyframe instead of moving in straight lines', () => {
    // Halfway through a keyframe an ease-out has covered 75% of the way.
    expect(celebrationFrame(125)?.offsetY).toBeCloseTo(-9)
    expect(celebrationFrame(125)?.rotation).toBeCloseTo(6)
    expect(celebrationFrame(150)?.scale).toBeCloseTo(1.225)
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

  it('sizes the head, shoulders, and line weight from the 36 px width', () => {
    const g = figureGeometry(0)
    expect(g.headR).toBeCloseTo(5.4) // 15% of the width
    expect(g.headCy).toBeCloseTo(6.4) // one point below the top edge
    expect(g.shoulderY).toBeCloseTo(13.96) // 1.4 head radii under the head's centre
    expect(g.lineWidth).toBeCloseTo(3.24) // 9% of the width
  })

  it('bends the elbows up and in as the arms rise, mirrored on the left', () => {
    expect(figureGeometry(0).rElbow.x).toBeCloseTo(28.8)
    expect(figureGeometry(0).rElbow.y).toBeCloseTo(10.47)
    expect(figureGeometry(1).rElbow.x).toBeCloseTo(26.64)
    expect(figureGeometry(1).rElbow.y).toBeCloseTo(6.282)
    expect(figureGeometry(1).lElbow.x).toBeCloseTo(36 - 26.64)
    expect(figureGeometry(1).lElbow.y).toBeCloseTo(6.282)
  })
})
