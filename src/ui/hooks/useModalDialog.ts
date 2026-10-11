import type { RefObject } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'

/**
 * What a modal dialog needs while it's open (slice 2B2 §3): focus on its first control, Tab and Shift-Tab kept inside
 * it, Escape to close it, and the page behind held still. It all starts before the browser paints, so focus never
 * rests on a page that has just turned inert. Whoever opened the dialog hands focus back afterwards.
 */
export function useModalDialog(container: RefObject<HTMLElement>, firstFocus: RefObject<HTMLElement>, onEscape: () => void) {
  // The key listener lives as long as the dialog, so it reaches the newest onEscape through a ref.
  const escape = useRef(onEscape)
  escape.current = onEscape
  useLayoutEffect(() => {
    firstFocus.current?.focus()
    const unlock = lockPageScroll()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        escape.current()
      } else if (e.key === 'Tab' && container.current) {
        keepFocusInside(container.current, e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [])
}

/**
 * Holds the page still behind the dialog, and returns what lets it go. The body is fixed where it was: iOS before 16
 * still scrolls a page by touch when its body only has overflow: hidden. The page goes back to the same place after.
 */
function lockPageScroll(): () => void {
  const { style } = document.body
  const y = window.scrollY
  const saved = { position: style.position, top: style.top, width: style.width, overflow: style.overflow }
  Object.assign(style, { position: 'fixed', top: `${-y}px`, width: '100%', overflow: 'hidden' })
  return () => {
    Object.assign(style, saved)
    window.scrollTo(0, y)
  }
}

/** Everything Tab can reach. */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Tab and Shift-Tab go round the dialog's controls instead of leaving it. */
function keepFocusInside(container: HTMLElement, e: KeyboardEvent) {
  const stops = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (stops.length === 0) return
  const first = stops[0]
  const last = stops[stops.length - 1]
  const active = document.activeElement
  const outside = !(active instanceof Node) || !container.contains(active)
  if (e.shiftKey ? outside || active === first : outside || active === last) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  }
}
