import type { WorldRect } from './mapFit'

/**
 * The glide toward the frame that follows the plane (the app's follow the plane design §4, as its TripMapGlide): on every
 * display frame the map closes part of the gap to the frame it wants, its middle and its zoom together, so it tracks the
 * plane smoothly with no steps, and catches up in about a second.
 */

/** How quickly the gap closes: it shrinks by e (to 37%) every this long, so it's down to 5% in about a second. */
export const GLIDE_TIME_CONSTANT_MS = 350

/** Closer than this share of the frame's size, in its middle and its zoom, the glide has arrived. */
export const GLIDE_ARRIVAL = 0.001

/**
 * The frame `elapsedMs` on from `current`, gliding toward `target`. Its middle and its zoom (the log of its size) each
 * close the same share of their gaps, 1 − e^(−elapsed ÷ `GLIDE_TIME_CONSTANT_MS`), so zooming in and out ease alike, and
 * a frame across the date line glides the short way round. It's `target` once within `GLIDE_ARRIVAL`.
 */
export function glideStep(current: WorldRect, target: WorldRect, elapsedMs: number): WorldRect {
  if (!(current.width > 0 && current.height > 0 && target.width > 0 && target.height > 0)) return target
  const share = elapsedMs > 0 ? 1 - Math.exp(-elapsedMs / GLIDE_TIME_CONSTANT_MS) : 0
  const midX = (r: WorldRect) => r.x + r.width / 2
  const midY = (r: WorldRect) => r.y + r.height / 2
  // The short way round: a whole world (1 across) is no move.
  let dx = midX(target) - midX(current)
  dx -= Math.round(dx)
  const dy = midY(target) - midY(current)
  const widthRatio = target.width / current.width
  const heightRatio = target.height / current.height
  const left = 1 - share
  const isThere = Math.abs(dx * left) < GLIDE_ARRIVAL * target.width && Math.abs(dy * left) < GLIDE_ARRIVAL * target.height
    && Math.abs(Math.log(widthRatio) * left) < GLIDE_ARRIVAL && Math.abs(Math.log(heightRatio) * left) < GLIDE_ARRIVAL
  if (isThere) return target
  const width = current.width * widthRatio ** share
  const height = current.height * heightRatio ** share
  let x = midX(current) + dx * share - width / 2
  // A frame is kept starting on the map, running on past its right edge if it must, as `fitRect` keeps it.
  x -= Math.floor(x)
  return { x, y: midY(current) + dy * share - height / 2, width, height }
}

/** Whether `current` is close enough to `target` to show `target` at once, with no glide. */
export const isThere = (current: WorldRect, target: WorldRect): boolean => {
  const next = glideStep(current, target, 0)
  return next.x === target.x && next.y === target.y && next.width === target.width && next.height === target.height
}
