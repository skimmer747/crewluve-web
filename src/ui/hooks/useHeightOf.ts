import { useLayoutEffect, useState } from 'preact/hooks'

/**
 * An element's height in CSS pixels, measured as it appears and again whenever it changes, or 0 while there's none.
 * Unlike `useSize`, it follows an element that comes and goes: pass the element itself, kept from a callback ref.
 */
export function useHeightOf(element: HTMLElement | null): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    if (!element) {
      setHeight(0)
      return
    }
    const measure = () => setHeight(element.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return height
}
