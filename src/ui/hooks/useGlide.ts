import { useEffect, useRef, useState } from 'preact/hooks'
import type { WorldRect } from '../../map/mapFit'
import { glideStep, isThere } from '../../map/tripMapGlide'

/** Whether the person asked for less motion: the map then goes straight to its frame (follow the plane design §4). */
export const prefersStill = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The view the SVG map shows while it follows the plane (follow the plane design §4): `target` while `gliding` is off,
 * and else the view gliding toward it, a step on every display frame, from wherever the map was. One loop glides at a
 * time and reads the newest `target` on every step, so a frame that moves as a replay plays is followed, not started
 * over. The first view, a gap too small to see, and every view with reduced motion, are `target` at once.
 */
export function useGlide(target: WorldRect, gliding: boolean): WorldRect {
  const [, redraw] = useState(0)
  const shown = useRef(target)
  const latest = useRef(target)
  const frame = useRef(0)
  latest.current = target
  if (!gliding || prefersStill() || isThere(shown.current, target)) shown.current = target
  useEffect(() => {
    if (!gliding) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
      return
    }
    if (frame.current || shown.current === latest.current) return
    let last = performance.now()
    const step = (now: number) => {
      shown.current = glideStep(shown.current, latest.current, now - last)
      last = now
      redraw((n) => n + 1)
      frame.current = shown.current === latest.current ? 0 : requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return shown.current
}
