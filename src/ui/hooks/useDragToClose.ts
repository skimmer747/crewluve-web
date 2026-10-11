import type { JSX } from 'preact'
import { useRef, useState } from 'preact/hooks'

/** A drag down further than this closes the popup; a shorter one springs back. */
export const DRAG_CLOSE_PX = 100

type PointerHandler = (e: JSX.TargetedPointerEvent<HTMLElement>) => void

/**
 * Dragging a card down by its top strip (slice 2B2 §3), as the app's DragGesture does. `offset` follows the pointer
 * down, never up. Letting go more than 100 px down calls `onClose`; a shorter drag, or one the browser cancels, springs
 * back. A press on a button is left to the button.
 */
export function useDragToClose(onClose: () => void): {
  offset: number
  dragging: boolean
  handlers: { onPointerDown: PointerHandler; onPointerMove: PointerHandler; onPointerUp: PointerHandler; onPointerCancel: PointerHandler }
} {
  const from = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const end = (e: JSX.TargetedPointerEvent<HTMLElement>, release: boolean) => {
    if (from.current == null) return
    const moved = e.clientY - from.current
    from.current = null
    setDragging(false)
    if (release && moved > DRAG_CLOSE_PX) onClose()
    else setOffset(0)
  }
  return {
    offset,
    dragging,
    handlers: {
      onPointerDown: (e) => {
        if (e.target instanceof Element && e.target.closest('button')) return
        from.current = e.clientY
        setDragging(true)
        if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove: (e) => {
        if (from.current != null) setOffset(Math.max(0, e.clientY - from.current))
      },
      onPointerUp: (e) => end(e, true),
      onPointerCancel: (e) => end(e, false),
    },
  }
}
