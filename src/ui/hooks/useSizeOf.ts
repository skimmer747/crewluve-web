import { useLayoutEffect, useState } from 'preact/hooks'
import type { Size } from './useSize'

const NOTHING: Size = { width: 0, height: 0 }

/**
 * An element's width and height in CSS pixels, measured as it appears and again whenever they change, or nothing while
 * there's none. Unlike `useSize`, it follows an element that comes and goes: pass the element itself, kept from a
 * callback ref.
 */
export function useSizeOf(element: HTMLElement | null): Size {
  const [size, setSize] = useState(NOTHING)
  useLayoutEffect(() => {
    if (!element) {
      setSize(NOTHING)
      return
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize((was) => (was.width === width && was.height === height ? was : { width, height }))
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return size
}
