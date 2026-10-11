import { moonCycle } from '../time/moon'

/** The icon's circle: center 12 and radius 9.5 in a 24-point box. */
const C = 12
const R = 9.5
const round = (v: number) => Math.round(v * 100) / 100

/**
 * The moon's lit part at `cycle` (0 new, 0.5 full) as an SVG path in the icon's box: the edge of the moon on the lit
 * side, then the shadow line back, a half ellipse whose width follows the phase. It's lit on the right while the moon
 * waxes and on the left while it wanes, as seen from the northern hemisphere.
 */
export function moonLitPath(cycle: number): string {
  const waxing = cycle < 0.5
  const k = Math.cos(cycle * 2 * Math.PI)
  const rx = round(R * Math.abs(k))
  // The edge runs top to bottom down the lit side; the shadow line comes back up, bulging toward the lit side while
  // the moon is a crescent (k > 0) and away from it when it's gibbous.
  const edgeSweep = waxing ? 1 : 0
  const lineSweep = waxing === k > 0 ? 0 : 1
  return `M${C} ${C - R}A${R} ${R} 0 0 ${edgeSweep} ${C} ${C + R}A${rx} ${R} 0 0 ${lineSweep} ${C} ${C - R}Z`
}

/** The popup's moon phase icon: the moon's outline with its lit part drawn for the exact age, in the text color. */
export function MoonPhaseIcon({ t, size = 17 }: { t: number; size?: number }) {
  return (
    <svg class="icon moon-phase" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d={moonLitPath(moonCycle(t))} fill="currentColor" />
    </svg>
  )
}
