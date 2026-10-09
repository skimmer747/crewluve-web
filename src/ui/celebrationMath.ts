/** Pure motion math for Crewluve's CelebrationFigureView (spec §4.4). */

export const CELEBRATION_MS = 2400 // 2.0 s visible + 0.4 s fade

export interface HeartFrame {
  x: number
  y: number
  size: number
  opacity: number
  scale: number
}

export interface CelebrationFrame {
  opacity: number
  /** 0 = arms low, 1 = arms raised. */
  armRaise: number
  scale: number
  offsetY: number
  rotation: number
  hearts: HeartFrame[]
}

interface Point {
  x: number
  y: number
}

const HEARTS = [
  { x: -6, delay: 0.05, size: 10, drift: -4 },
  { x: 8, delay: 0.25, size: 8, drift: 5 },
  { x: -2, delay: 0.5, size: 12, drift: -2 },
  { x: 12, delay: 0.75, size: 9, drift: 6 },
  { x: -10, delay: 1.0, size: 7, drift: -6 },
  { x: 4, delay: 1.25, size: 11, drift: 3 },
]

const SCALE_KEYS: [number, number][] = [[1.3, 0.3], [0.9, 0.25], [1.2, 0.3], [1.0, 0.3]]
const OFFSET_KEYS: [number, number][] = [[-12, 0.25], [0, 0.2], [-10, 0.25], [0, 0.2], [-6, 0.2], [0, 0.2]]
const ROTATION_KEYS: [number, number][] = [[8, 0.25], [-8, 0.3], [6, 0.25], [-6, 0.25], [0, 0.25]]

/** Quadratic ease-out for p from 0 to 1: quick at first, slowing to a stop (stands in for SwiftUI's easeOut). */
function easeOut(p: number): number {
  return 1 - (1 - p) * (1 - p)
}

/** Keyframe track: ease out from the previous value to each [value, seconds] in turn (stands in for SpringKeyframe). */
function track(keys: [number, number][], seconds: number, initial: number): number {
  let from = initial
  let start = 0
  for (const [to, duration] of keys) {
    if (seconds < start + duration) {
      const p = (seconds - start) / duration
      return from + (to - from) * easeOut(p)
    }
    from = to
    start += duration
  }
  return from
}

/** One animation frame, or null once the celebration is over. */
export function celebrationFrame(elapsedMs: number): CelebrationFrame | null {
  if (elapsedMs < 0 || elapsedMs >= CELEBRATION_MS) return null
  const e = elapsedMs / 1000
  const hearts: HeartFrame[] = []
  for (const h of HEARTS) {
    const t = e - h.delay
    if (t > 0 && t < 1) hearts.push({ x: h.x + h.drift * t, y: -t * 35 - 12, size: h.size, opacity: 1 - t, scale: 1 - t * 0.4 })
  }
  return {
    opacity: e < 2 ? 1 : 1 - easeOut((e - 2) / 0.4),
    armRaise: Math.cos(e * Math.PI * 3) * 0.5 + 0.5,
    scale: track(SCALE_KEYS, e, 1),
    offsetY: track(OFFSET_KEYS, e, 0),
    rotation: track(ROTATION_KEYS, e, 0),
    hearts,
  }
}

/** The 36×28 stick figure (CelebrationFigureView.drawFigure). */
export function figureGeometry(armRaise: number): {
  headR: number
  headCy: number
  shoulderY: number
  lineWidth: number
  rElbow: Point
  rHand: Point
  lElbow: Point
  lHand: Point
} {
  const w = 36
  const h = 28
  const headR = w * 0.15
  const headCy = headR + 1
  const shoulderY = headCy + headR * 1.4
  const lerp = (a: number, b: number) => a + (b - a) * armRaise
  const rElbow = { x: lerp(w * 0.8, w * 0.74), y: lerp(shoulderY * 0.75, shoulderY * 0.45) }
  const rHand = { x: lerp(w * 0.74, w * 0.62), y: lerp(h * 0.1, Math.max(0, h * -0.01)) }
  return {
    headR,
    headCy,
    shoulderY,
    lineWidth: w * 0.09,
    rElbow,
    rHand,
    lElbow: { x: w - rElbow.x, y: rElbow.y },
    lHand: { x: w - rHand.x, y: rHand.y },
  }
}
