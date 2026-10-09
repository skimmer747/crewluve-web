import { Icon } from './Icon'

/** EstimatedReturnCardView's text. */
export function fallbackText(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Soon'
  return daysRemaining === 1 ? '~1 day' : `~${daysRemaining} days`
}

export function FallbackCard({ daysRemaining }: { daysRemaining: number }) {
  return (
    <section class="card glass countdown">
      <div class="countdown-head">
        <Icon name="House" size={28} color="var(--green)" />
        <h2>Back Home In</h2>
      </div>
      <div class="countdown-value">
        <span class="num" style={{ color: 'var(--green)' }}>{fallbackText(daysRemaining)}</span>
      </div>
    </section>
  )
}
