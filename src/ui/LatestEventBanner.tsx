import type { Ref } from 'preact'
import { useState } from 'preact/hooks'
import { WIDEST_EVENT_WHEN } from '../copy/facts'
import type { LatestEvent } from '../facts/factRow'
import type { Size } from './hooks/useSize'
import { useSizeOf } from './hooks/useSizeOf'
import { ClockText } from './ClockText'

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

/** The banner's padding at each side (`.latest-event` in tripMap.css). */
const BANNER_PADDING = 12

/** The banner, its title and its hidden widest "when", each kept from a callback ref to be measured. */
export interface BannerRefs {
  box: Ref<HTMLSpanElement>
  title: Ref<HTMLSpanElement>
  widest: Ref<HTMLSpanElement>
}

/**
 * The banner's size as the key and the camera go by it. Its height is the banner's own. Its width is its title's or its
 * widest "when", whichever is wider, and its padding: the width it has with the widest "when" it could show. So where
 * the key goes doesn't change while the same event shows, as "Just now" grows to "About 1 h 5 min ago", or a replay's
 * clock time changes, and the camera doesn't frame again with it (the review's fixes). Nothing measured, it's 0 wide.
 */
export function useBannerSize(): { size: Size; refs: BannerRefs } {
  const [box, setBox] = useState<HTMLSpanElement | null>(null)
  const [title, setTitle] = useState<HTMLSpanElement | null>(null)
  const [widest, setWidest] = useState<HTMLSpanElement | null>(null)
  const height = useSizeOf(box).height
  const words = Math.max(useSizeOf(title).width, useSizeOf(widest).width)
  return { size: { width: words > 0 ? words + 2 * BANNER_PADDING : 0, height }, refs: { box: setBox, title: setTitle, widest: setWidest } }
}

export interface LatestEventBannerProps {
  event: LatestEvent
  /**
   * On the full map it's centred under the pill and reads its sentence to screen readers. On the card it sits in the
   * map's top corner, and the card's sentence has it.
   */
  isFullMap?: boolean
  /** The banner's parts, measured for the key and the camera (`useBannerSize`). */
  refs?: BannerRefs
}

/**
 * The newest event of the flight in the air, shown large until the next (latest event design §1, §2): what it was, and
 * under it, smaller, how long ago, in the chips' glass. Spans, as the card's map is inside its button. The widest "when"
 * it could show is laid out unseen beside it, out of its flow, only to be measured.
 */
export function LatestEventBanner({ event, isFullMap = false, refs }: LatestEventBannerProps) {
  return (
    <span ref={refs?.box} class={isFullMap ? 'latest-event centred' : 'latest-event'} aria-hidden={isFullMap ? undefined : 'true'}>
      <span ref={refs?.title} class="latest-event-title" aria-hidden="true">{event.title}</span>
      <span class="latest-event-when" aria-hidden="true"><ClockText text={event.when} /></span>
      <span ref={refs?.widest} class="latest-event-when latest-event-widest" aria-hidden="true">{WIDEST_EVENT_WHEN}</span>
      {isFullMap && <span class="sr-only">{event.sentence}</span>}
    </span>
  )
}
