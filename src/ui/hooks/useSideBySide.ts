import { useEffect, useState } from 'preact/hooks'

/**
 * The windows that show the status and the schedule side by side (slice 3C §3): at least 744 px wide, an iPad mini held
 * upright, and 500 px tall, so phones keep one column even on their side.
 */
export const SIDE_BY_SIDE = '(min-width: 744px) and (min-height: 500px)'

/** Whether the window is that big now: no where the browser can't say. */
const sideBySideNow = () => typeof matchMedia === 'function' && matchMedia(SIDE_BY_SIDE).matches

/** Whether the status and the schedule show side by side, following the window as it's resized (slice 3C §3, §5.2). */
export function useSideBySide(): boolean {
  const [sideBySide, setSideBySide] = useState(sideBySideNow)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(SIDE_BY_SIDE)
    const follow = () => setSideBySide(query.matches)
    query.addEventListener?.('change', follow)
    return () => query.removeEventListener?.('change', follow)
  }, [])
  return sideBySide
}
