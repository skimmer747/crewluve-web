import type { RefObject } from 'preact'
import { useLayoutEffect, useState } from 'preact/hooks'

/**
 * An element's width in CSS pixels, measured as it mounts and again whenever it changes, as the app's GeometryReader
 * does (slice 2C §4.1). `fallback` stands in until then, and while the element has no width, as in a hidden page.
 */
export function useWidth(element: RefObject<HTMLElement>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = element.current
    if (!el) return
    const measure = () => {
      const measured = el.getBoundingClientRect().width
      setWidth(measured > 0 ? measured : fallback)
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [element, fallback])
  return width
}
