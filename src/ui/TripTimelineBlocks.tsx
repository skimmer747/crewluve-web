import { useMemo } from 'preact/hooks'
import type { TimelineBlock } from '../map/timelineBlocks'

/** Half the thumb: how far in from each end its centre stops, as a range input's does. */
const INSET = 14

/** The thumb's centre at `p`, 0…1, across the bar, as CSS. */
const thumbX = (p: number) => `calc(${INSET}px + ${p} * (100% - ${2 * INSET}px))`

/** A block's edge at `p`: along the thumb's travel, with the first and last blocks reaching the bar's rounded ends. */
const blockEdge = (p: number) => (p <= 0 ? '0px' : p >= 1 ? '100%' : thumbX(p))

export interface TripTimelineBlocksProps {
  blocks: TimelineBlock[]
  /** Where the thumb is, 0…1. */
  progress: number
}

/** One layer's blocks, each placed along the bar, with a wait's length on it. */
const blockList = (blocks: TimelineBlock[]) =>
  blocks.map((b, i) => (
    <div key={i} class={`trip-timeline-block activity-${b.kind}`}
      style={{ left: blockEdge(b.start), width: `calc(${blockEdge(b.end)} - ${blockEdge(b.start)})` }}>
      {b.label && <span class="trip-timeline-label">{b.label}</span>}
    </div>
  ))

/**
 * The timeline's colored blocks (activity markers design §4.1), under the range input whose thumb moves over them: the
 * part ahead pale, and the part played in full color, clipped at the thumb. A wait's length shows when it fits.
 */
export function TripTimelineBlocks({ blocks, progress }: TripTimelineBlocksProps) {
  // The blocks change only with the trip and the pace. During a replay only the played layer's clip moves each frame,
  // so each layer keeps its blocks, and Preact skips them.
  const ahead = useMemo(() => blockList(blocks), [blocks])
  const played = useMemo(() => blockList(blocks), [blocks])
  const clipPath = `inset(0 calc(100% - ${thumbX(progress)}) 0 0)`
  return (
    <div class="trip-timeline-blocks" aria-hidden="true">
      <div class="trip-timeline-layer ahead">{ahead}</div>
      <div class="trip-timeline-layer played" style={{ clipPath }}>{played}</div>
    </div>
  )
}
