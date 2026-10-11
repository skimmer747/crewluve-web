import { useEffect, useState } from 'preact/hooks'

/**
 * Milliseconds since `running` turned on, new on every animation frame while it stays on: the big dial reads its loop
 * from it. The clock starts at the first frame, as the celebration's does, and stops when the component goes away.
 */
export function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    // A new run counts from zero, not from where the last one stopped.
    setElapsed(0)
    let start: number | null = null
    let raf = 0
    const tick = (now: number) => {
      start ??= now
      setElapsed(now - start)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])
  return elapsed
}
