import { Fragment } from 'preact'
import type { ColorToken } from '../copy/colors'
import { cardCountdown, spokenDuration } from '../copy/format'
import type { IconName } from '../icons/iconPaths'
import { Celebration } from './Celebration'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { useScheduleLink, type ScheduleLinkProps } from './ScheduleLink'

export interface CountdownCardProps {
  title: string
  icon: IconName
  color: ColorToken
  target: number
  now: number
  subtitle: string | null
  celebrate?: boolean
  celebrateKey?: number
  /** The way into the schedule: a chevron, and the whole card as a link (slice 3A §3.1). */
  link?: ScheduleLinkProps
}

/** "Back Home In" / "Leaves Home In" card (CountdownCardView). */
export function CountdownCard({ title, icon, color, target, now, subtitle, celebrate = false, celebrateKey = 0, link }: CountdownCardProps) {
  const css = cssColor(color)
  const parts = cardCountdown(target - now)
  const { linked, card, chevron } = useScheduleLink(link)
  return (
    <section class={`card glass countdown${linked}`} {...card}>
      <div class="countdown-head">
        <Icon name={icon} size={28} color={css} />
        <h2>{title}</h2>
        {chevron}
      </div>
      {/* Screen readers hear the label in words ("11 days, 8 hours, 39 minutes") instead of the digits and unit letters. */}
      <div class="countdown-value" role="timer" aria-label={spokenDuration(target - now)}>
        {parts == null ? (
          <span class="num" aria-hidden="true" style={{ color: css }}>Now!</span>
        ) : (
          parts.map((part, i) => (
            <Fragment key={part.unit}>
              {i > 0 && <span class="gap" aria-hidden="true">{'  '}</span>}
              <span class="num" aria-hidden="true" style={{ color: css }}>{part.value}</span>
              <span class="unit" aria-hidden="true">{part.unit}</span>
            </Fragment>
          ))
        )}
      </div>
      {subtitle && <p class="countdown-sub">{subtitle}</p>}
      {celebrate && <Celebration playKey={celebrateKey} />}
    </section>
  )
}
