import { Fragment } from 'preact'
import type { Span } from '../copy/narrative'
import type { Visual } from '../copy/visuals'
import { cssColor } from './colors'
import { Icon } from './Icon'
import { ProgressRing } from './ProgressRing'

/** The "what's happening now" card (NarrativeCardView). */
export function NarrativeCard({ spans, visual, ring }: { spans: Span[]; visual: Visual; ring: number | null }) {
  const statusColor = cssColor(visual.color)
  return (
    <section class="card glass narrative">
      <div class="narrative-icon">
        {ring != null && <ProgressRing value={ring} color={statusColor} />}
        <Icon name={visual.icon} size={28} color={statusColor} />
      </div>
      <p class="narrative-text">
        {spans.map((span, i) => {
          // Countdown spans are keyed by their text, so a new minute remounts them and replays the roll-in.
          const key = span.digits ? `cd-${i}-${span.text}` : i
          const shown = (
            <span
              key={key}
              class={[span.bold && 'b', span.digits && 'digits'].filter(Boolean).join(' ') || undefined}
              style={span.color ? { color: span.color === 'status' ? statusColor : cssColor(span.color) } : undefined}
              aria-hidden={span.spoken ? 'true' : undefined}
            >
              {span.text}
            </span>
          )
          if (!span.spoken) return shown
          // Screen readers get the countdown in words ("49 minutes"), not "49m", which can be read as meters.
          return (
            <Fragment key={key}>
              {shown}
              <span class="sr-only">{span.spoken}</span>
            </Fragment>
          )
        })}
      </p>
    </section>
  )
}
