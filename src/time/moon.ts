import { DAY } from './zoned'

const PHASES = ['new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'lastQuarter', 'waningCrescent'] as const

/** The moon's eight phases, as Apple's WeatherKit has them (MoonPhase in the app), in order from new moon. */
export type MoonPhase = (typeof PHASES)[number]

/** The mean length of the moon's cycle, new moon to new moon, in days. */
export const SYNODIC_MONTH = 29.530588853

/** A new moon to count from: 6 January 2000 at 18:14 UTC. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

/** How far through its cycle the moon is at `t`: 0 at new moon, 0.5 at full, just under 1 before the next new moon. */
export function moonCycle(t: number): number {
  const cycles = (t - KNOWN_NEW_MOON) / DAY / SYNODIC_MONTH
  return cycles - Math.floor(cycles)
}

/**
 * The phase at `t` (slice 2B2 §8): eight equal parts of the cycle, each centered on its own point, so "Full Moon"
 * runs from 1/16 of a cycle before full to 1/16 after. The mean cycle keeps it within about a day of the true phase.
 */
export function moonPhase(t: number): MoonPhase {
  return PHASES[Math.floor(moonCycle(t) * 8 + 0.5) % 8]
}
