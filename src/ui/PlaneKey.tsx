import type { Ref } from 'preact'

/**
 * The key to the map's two planes (which plane design §2): the real plane's mark and the ghost's, each named. It's the
 * key to a picture screen readers don't see, so they don't see it either: the card's sentence says it all.
 */
export function PlaneKey({ boxRef }: { boxRef?: Ref<HTMLSpanElement> }) {
  return (
    <span ref={boxRef} class="trip-map-key" aria-hidden="true">
      <span class="trip-map-key-item"><span class="trip-map-key-mark real" />Real plane</span>
      <span class="trip-map-key-item"><span class="trip-map-key-mark ghost" />On schedule</span>
    </span>
  )
}
