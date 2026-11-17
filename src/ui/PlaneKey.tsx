import type { Ref } from 'preact'

export interface PlaneKeyProps {
  boxRef?: Ref<HTMLSpanElement>
  /**
   * Its top, down from the map's top edge, while it's moved just under the latest event's banner (Todd, 16 Nov 2026).
   * Null where it stays at the map's top right, as it always has.
   */
  top?: number | null
}

/**
 * The key to the map's two planes (which plane design §2): the real plane's mark and the ghost's, each named. It's the
 * key to a picture screen readers don't see, so they don't see it either: the card's sentence says it all.
 */
export function PlaneKey({ boxRef, top = null }: PlaneKeyProps) {
  return (
    <span ref={boxRef} class="trip-map-key" aria-hidden="true" style={top == null ? undefined : { top: `${top}px` }}>
      <span class="trip-map-key-item"><span class="trip-map-key-mark real" />Real plane</span>
      <span class="trip-map-key-item"><span class="trip-map-key-mark ghost" />On schedule</span>
    </span>
  )
}
