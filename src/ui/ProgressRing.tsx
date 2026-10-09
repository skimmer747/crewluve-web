const RADIUS = 20.5 // 44 px box with a 3 px stroke
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** NarrativeCardView's ring: 20% track, round-capped fill from 12 o'clock, clockwise. */
export function ProgressRing({ value, color }: { value: number; color: string }) {
  return (
    <svg class="ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={RADIUS} fill="none" style={{ stroke: color, strokeOpacity: 0.2, strokeWidth: 3 }} />
      <circle
        cx="22"
        cy="22"
        r={RADIUS}
        fill="none"
        transform="rotate(-90 22 22)"
        style={{ stroke: color, strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: `${CIRCUMFERENCE * value} ${CIRCUMFERENCE}` }}
      />
    </svg>
  )
}
