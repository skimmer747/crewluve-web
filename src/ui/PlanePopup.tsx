import type { PopupWords } from '../copy/planePopup'

/** The room a popup needs over its plane, and either side of it, in px: `.trip-map-popup` is 240 px wide at most. */
export const POPUP_ROOM = { above: 96, side: 128 }

/** The gap between a plane's centre and its popup, in px: the plane's radius and a little more. */
const POPUP_GAP = 18

export interface PopupPlacement {
  /** Under the plane, near the map's top, where there's no room over it. */
  below: boolean
  /** How far the popup is slid sideways from the plane, in px, to stay inside a map `width` wide. */
  shift: number
}

/** Where the popup of a plane `at` px into a map `width` wide goes (which plane design §3). */
export function popupPlacement(at: { x: number; y: number }, width: number): PopupPlacement {
  const x = width < 2 * POPUP_ROOM.side ? width / 2 : Math.min(Math.max(at.x, POPUP_ROOM.side), width - POPUP_ROOM.side)
  return { below: at.y < POPUP_ROOM.above, shift: Math.round(x - at.x) }
}

/**
 * A plane's popup (which plane design §3), over or under its plane, `at` px into what it's laid over. It's part of the
 * map's picture, which screen readers don't see.
 */
export function PlanePopup({ words, at, placement }: { words: PopupWords; at: { x: number; y: number }; placement: PopupPlacement }) {
  const across = `calc(-50% + ${placement.shift}px)`
  const transform = placement.below ? `translate(${across}, ${POPUP_GAP}px)` : `translate(${across}, calc(-100% - ${POPUP_GAP}px))`
  return (
    <div class={`trip-map-popup${placement.below ? ' below' : ''}`} style={{ left: `${at.x}px`, top: `${at.y}px`, transform }} aria-hidden="true">
      <p class="trip-map-popup-title">{words.title}</p>
      {words.lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  )
}
