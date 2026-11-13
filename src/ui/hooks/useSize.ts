import type { RefObject } from 'preact'
import { useLayoutEffect, useState } from 'preact/hooks'

export interface Size {
  width: number
  height: number
}

/**
 * An element's width and height in CSS pixels, measured as it mounts and again whenever either changes, as the app's
 * GeometryReader does (slice 2C §4.1). `fallback` stands in until then, and for a side the element has none of, as in a
 * hidden page. It watches the element the ref holds when the component mounts, so that element must render from the start.
 */
export function useSize(element: RefObject<HTMLElement>, fallback: Size): Size {
  const [size, setSize] = useState(fallback)
  const { width: fallbackWidth, height: fallbackHeight } = fallback
  useLayoutEffect(() => {
    const el = element.current
    if (!el) return
    const measure = () => {
      const box = el.getBoundingClientRect()
      const next = { width: box.width > 0 ? box.width : fallbackWidth, height: box.height > 0 ? box.height : fallbackHeight }
      setSize((was) => (was.width === next.width && was.height === next.height ? was : next))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [element, fallbackWidth, fallbackHeight])
  return size
}
