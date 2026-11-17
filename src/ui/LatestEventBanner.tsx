import type { Ref } from 'preact'
import type { LatestEvent } from '../facts/factRow'
import type { Size } from './hooks/useSize'

/** How far the banner sits in from the map's edges, as the card's chips do (`.latest-event` in tripMap.css). */
export const BANNER_EDGE = 10

/** The room between the banner and the key to the two planes, beside it or under it. */
const KEY_GAP = 6

/** The room the camera leaves between the banner, or the key under it, and the plane: as under the card's chips. */
const CAMERA_GAP = 4

export interface BannerLayout {
  /** The key's top, down from the map's top edge, where it moves under the banner; null where it stays at the top right. */
  keyTop: number | null
  /** How far down from the map's top edge the banner, and the key with it, reach, and a gap: the camera keeps the plane below. */
  inset: number
}

/**
 * Where the key to the two planes goes while the banner shows, and how far down the two reach. The website's own (Todd,
 * 16 Nov 2026): the key stays where it always is, at the map's top right, where it fits beside the banner with a gap
 * between them, as on a computer; else it moves just under the banner, still at the right. `bannerRight` is the
 * banner's right edge from the map's left. A key of no width, none shown or not yet laid out, stays where it is.
 */
export function bannerLayout(bannerRight: number, banner: Size, key: Size, mapWidth: number): BannerLayout {
  const reach = (depth: number) => (depth > 0 ? BANNER_EDGE + depth + CAMERA_GAP : 0)
  const fitsBeside = bannerRight + KEY_GAP <= mapWidth - BANNER_EDGE - key.width
  if (fitsBeside || key.width === 0) return { keyTop: null, inset: reach(Math.max(banner.height, key.height)) }
  return { keyTop: BANNER_EDGE + banner.height + KEY_GAP, inset: reach(banner.height + KEY_GAP + key.height) }
}

export interface LatestEventBannerProps {
  event: LatestEvent
  /**
   * On the full map it's centred under the pill and reads its sentence to screen readers. On the card it sits in the
   * map's top corner, and the card's sentence has it.
   */
  isFullMap?: boolean
  /** The banner itself, measured for the key and the camera. */
  boxRef?: Ref<HTMLSpanElement>
}

/**
 * The newest event of the flight in the air, shown large until the next (latest event design §1, §2): what it was, and
 * under it, smaller, how long ago, in the chips' glass. Spans, as the card's map is inside its button.
 */
export function LatestEventBanner({ event, isFullMap = false, boxRef }: LatestEventBannerProps) {
  return (
    <span ref={boxRef} class={isFullMap ? 'latest-event centred' : 'latest-event'} aria-hidden={isFullMap ? undefined : 'true'}>
      <span class="latest-event-title" aria-hidden="true">{event.title}</span>
      <span class="latest-event-when" aria-hidden="true">{event.when}</span>
      {isFullMap && <span class="sr-only">{event.sentence}</span>}
    </span>
  )
}
