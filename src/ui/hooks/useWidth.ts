import type { RefObject } from 'preact'
import { useSize } from './useSize'

/** An element's width in CSS pixels, measured as `useSize` does. `fallback` stands in until then, and while it has no width. */
export function useWidth(element: RefObject<HTMLElement>, fallback: number): number {
  return useSize(element, { width: fallback, height: 0 }).width
}
