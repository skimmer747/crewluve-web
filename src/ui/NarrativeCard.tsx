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
        {spans.map((span, i) => (
          <span
            // Countdown spans are keyed by their text, so a new minute remounts them and replays the roll-in.
            key={span.digits ? `cd-${i}-${span.text}` : i}
            class={[span.bold && 'b', span.digits && 'digits'].filter(Boolean).join(' ') || undefined}
            style={span.color ? { color: span.color === 'status' ? statusColor : cssColor(span.color) } : undefined}
          >
            {span.text}
          </span>
        ))}
      </p>
    </section>
  )
}
