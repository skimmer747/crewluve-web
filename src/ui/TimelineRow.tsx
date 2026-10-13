import { gapSpoken, gapText, legClock, type LegMoment } from '../copy/schedule'
import type { Leg } from '../engine/legs'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { memo } from './memo'
import type { Gap, RowLook } from './scheduleFacts'

export interface TimelineRowProps {
  leg: Leg
  look: RowLook
  /** The second line, worked out once per leg (legTimes). */
  times: string
  moment: LegMoment
  now: number
  /** The gap before this leg, or null (TimeGapView). */
  gap: Gap | null
  /**
   * A tap on the leg, handed over with it, which picks its day on the calendar (slice 3B §5.3). For the pointer only:
   * the days do the same.
   */
  onTap?: (leg: Leg) => void
}

/**
 * One leg in the list (TimelineRowView, slice 3A §4.4–4.9): its icon in a circle of its color, its title, times and
 * right-hand column on glass, with the edge and tag of the leg happening now, the next leg, or a leg ending at home.
 * The gap before it comes first: a dashed line and a label, which screen readers hear in words (§4.10). It draws again
 * only when its props change: the page gives the time only to the legs whose clock shows it (redraws §4.3).
 */
export const TimelineRow = memo(function TimelineRow({ leg, look, times, moment, now, gap, onTap }: TimelineRowProps) {
  const clock = legClock(leg.start, leg.end, now, moment)
  const edge = moment === 'happening' ? ' leg-happening' : moment === 'next' ? ' leg-next' : look.homeward ? ' leg-home' : ''
  return (
    <li class="leg-item">
      {gap && (
        <div class={`leg-gap leg-gap-${gap.kind}`}>
          <span class="leg-gap-line" aria-hidden="true" />
          <span class="leg-gap-text" aria-hidden="true">{gapText(gap.kind, gap.ms)}</span>
          <span class="sr-only">{gapSpoken(gap.kind, gap.ms)}</span>
        </div>
      )}
      <div class={`leg glass${edge}${look.homeward ? ' homeward' : ''}`} style={{ '--leg': cssColor(look.color) }} onClick={onTap && (() => onTap(leg))}>
        {moment === 'next' && (
          <span class="leg-ring" aria-hidden="true">
            <span class="leg-ring-turn" />
          </span>
        )}
        <span class={moment === 'happening' ? 'leg-icon pulsing' : 'leg-icon'}>
          <Icon name={look.icon} size={15} />
        </span>
        <span class="leg-text">
          <span class="leg-title">{look.title}</span>
          <span class="leg-times">{times}</span>
        </span>
        <span class="leg-clock">
          <span class="leg-clock-label" aria-hidden="true">{clock.label}</span>
          <span class="leg-clock-value" aria-hidden="true">{clock.value}</span>
          <span class="sr-only">{clock.spoken}</span>
        </span>
        {/* In capitals through CSS, so screen readers say the words rather than spell them. */}
        {moment === 'next' && <span class="up-next">Up next</span>}
        {/* The app's hint: "Up next event" on the next leg, which its UP NEXT tag says here, else this one. */}
        {look.homeward && moment !== 'next' && <span class="sr-only">Arriving at home airport</span>}
      </div>
    </li>
  )
})
