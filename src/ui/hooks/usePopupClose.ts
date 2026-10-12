import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { prefersReducedMotion } from '../motion'

/** Closing fades a popup out over 0.2 s, as the app's dismissView does, before it goes (slice 2B2 §3, 2C §6). */
export const POPUP_CLOSE_MS = 200

/** A part of a popup that its opening animates: how to find it, and the properties the opening drives. */
export interface OpeningPart {
  find: () => HTMLElement | null | undefined
  properties: ReadonlyArray<'opacity' | 'transform'>
}

/**
 * Closing a popup (popup follow-ups §3, §5): once only, at once for visitors who ask for reduced motion, and otherwise
 * with the closing styles on for 0.2 s before `onClose`. A close during the opening holds each part where the opening
 * has it, so the close runs from there, as SwiftUI's animations pick up where the last left off.
 */
export function usePopupClose(onClose: () => void, parts: ReadonlyArray<OpeningPart>) {
  const [still] = useState(prefersReducedMotion)
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const letGo = useRef<Array<() => void>>([])
  useEffect(() => () => clearTimeout(timer.current), [])
  // The closing styles are on now: the held values come off, so the 0.2 s transition starts from them.
  useLayoutEffect(() => {
    if (!closing) return
    for (const release of letGo.current) release()
    letGo.current = []
  }, [closing])

  const close = () => {
    if (closed.current) return
    closed.current = true
    if (still) return onClose()
    letGo.current = parts.flatMap((part) => {
      const el = part.find()
      return el ? [hold(el, part.properties)] : []
    })
    setClosing(true)
    timer.current = setTimeout(onClose, POPUP_CLOSE_MS)
  }
  return { still, closing, close }
}

/**
 * Holds an element where its opening has it (§3.3): the animated values inline, the animation off, then a style
 * recalculation, so the browser starts the close from those values rather than from where the opening would end.
 * Returns what lets go of them. The element's other inline styles, such as a drag's offset, are left alone.
 */
function hold(el: HTMLElement, properties: ReadonlyArray<string>): () => void {
  const now = getComputedStyle(el)
  const values = properties.map((name) => [name, now.getPropertyValue(name)] as const)
  for (const [name, value] of values) el.style.setProperty(name, value)
  el.style.setProperty('animation', 'none')
  getComputedStyle(el).getPropertyValue('opacity')
  return () => {
    for (const [name] of values) el.style.removeProperty(name)
    el.style.removeProperty('animation')
  }
}
