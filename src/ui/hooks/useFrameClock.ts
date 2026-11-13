import { useEffect, useState } from 'preact/hooks'

/**
 * The time, every animation frame while `active` (a replay playing), else `fallback`: the page's once-a-second now.
 * The frames stop once the time reaches `stopAt` (when the replay ends), and the time stays at or after it from then on.
 */
export function useFrameClock(active: boolean, fallback: number, stopAt = Infinity): number {
  const [frame, setFrame] = useState(fallback)
  useEffect(() => {
    if (!active) return
    let id = requestAnimationFrame(function tick() {
      const time = Date.now()
      setFrame(time)
      if (time < stopAt) id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [active, stopAt])
  return active ? frame : fallback
}
