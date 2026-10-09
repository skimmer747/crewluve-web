import { Fragment } from 'preact'
import type { ColorToken } from '../copy/colors'
import { cardCountdown } from '../copy/format'
import type { IconName } from '../icons/iconPaths'
import { Celebration } from './Celebration'
import { cssColor } from './colors'
import { Icon } from './Icon'

export interface CountdownCardProps {
  title: string
  icon: IconName
  color: ColorToken
  target: number
  now: number
  subtitle: string | null
  celebrate?: boolean
  celebrateKey?: number
}

/** "Back Home In" / "Leaves Home In" card (CountdownCardView). */
export function CountdownCard({ title, icon, color, target, now, subtitle, celebrate = false, celebrateKey = 0 }: CountdownCardProps) {
  const css = cssColor(color)
  const parts = cardCountdown(target - now)
  return (
    <section class="card glass countdown">
      <div class="countdown-head">
        <Icon name={icon} size={28} color={css} />
        <h2>{title}</h2>
      </div>
      <div class="countdown-value" role="timer">
        {parts == null ? (
          <span class="num" style={{ color: css }}>Now!</span>
        ) : (
          parts.map((part, i) => (
            <Fragment key={part.unit}>
              {i > 0 && <span class="gap">{'  '}</span>}
              <span class="num" style={{ color: css }}>{part.value}</span>
              <span class="unit">{part.unit}</span>
            </Fragment>
          ))
        )}
      </div>
      {subtitle && <p class="countdown-sub">{subtitle}</p>}
      {celebrate && <Celebration playKey={celebrateKey} />}
    </section>
  )
}
