import { Icon } from './Icon'
import { useScheduleLink, type ScheduleLinkProps } from './ScheduleLink'

/** EstimatedReturnCardView's text. */
export function fallbackText(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Soon'
  return daysRemaining === 1 ? '~1 day' : `~${daysRemaining} days`
}

/** The way into the schedule is `link`: a chevron, and the whole card as a link (slice 3A §3.1). */
export function FallbackCard({ daysRemaining, link }: { daysRemaining: number; link?: ScheduleLinkProps }) {
  const { linked, chevron } = useScheduleLink(link)
  return (
    <section class={`card glass countdown${linked}`}>
      <div class="countdown-head">
        <Icon name="House" size={28} color="var(--green)" />
        <h2>Back Home In</h2>
        {chevron}
      </div>
      <div class="countdown-value">
        <span class="num" style={{ color: 'var(--green)' }}>{fallbackText(daysRemaining)}</span>
      </div>
    </section>
  )
}
