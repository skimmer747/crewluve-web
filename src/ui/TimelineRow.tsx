import { gapText, legClock, legTimes, type GapKind, type LegMoment } from '../copy/schedule'
import type { Leg } from '../engine/legs'
import { cssColor } from './colors'
import { Icon } from './Icon'
import type { RowLook } from './scheduleFacts'

export interface TimelineRowProps {
  leg: Leg
  look: RowLook
  moment: LegMoment
  now: number
  /** The visitor's zone, for the times. */
  timeZone: string
  h24: boolean
  /** The gap before this leg, or null (TimeGapView). */
  gap: { kind: GapKind; ms: number } | null
}

/**
 * One leg in the list (TimelineRowView, slice 3A §4.4–4.9): its icon in a circle of its color, its title, times and
 * right-hand column on glass, with the edge and tag of the leg happening now, the next leg, or a leg ending at home.
 * The gap before it comes first: a dashed line and a label, which screen readers skip since the times say it (§4.10).
 */
export function TimelineRow({ leg, look, moment, now, timeZone, h24, gap }: TimelineRowProps) {
  const clock = legClock(leg.start, leg.end, now, moment)
  const edge = moment === 'happening' ? ' leg-happening' : moment === 'next' ? ' leg-next' : look.homeward ? ' leg-home' : ''
  return (
    <li class="leg-item">
      {gap && (
        <div class={`leg-gap leg-gap-${gap.kind}`} aria-hidden="true">
          <span class="leg-gap-line" />
          {gapText(gap.kind, gap.ms)}
        </div>
      )}
      <div class={`leg glass${edge}${look.homeward ? ' homeward' : ''}`} style={{ '--leg': cssColor(look.color) }}>
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
          <span class="leg-times">{legTimes(leg.start, leg.end, timeZone, h24)}</span>
        </span>
        <span class="leg-clock">
          <span class="leg-clock-label" aria-hidden="true">{clock.label}</span>
          <span class="leg-clock-value" aria-hidden="true">{clock.value}</span>
          <span class="sr-only">{clock.spoken}</span>
        </span>
        {moment === 'next' && <span class="up-next">UP NEXT</span>}
        {look.homeward && <span class="sr-only">Arriving at home airport</span>}
      </div>
    </li>
  )
}
