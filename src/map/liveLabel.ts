import type { LivePhase } from './liveProgress'

/**
 * Whether the real plane is ahead of the schedule or behind it (Stage 3 spec §5.3), as the app's LiveLabel.
 * `liveLabelText` in src/copy/tripMap.ts writes it.
 * - ahead, behind: `isEstimated` once the plane hasn't been seen for a while, and the words gain "About";
 * - stillOnGround: past the plan's takeoff and not off the ground. `minutesBehind` is null for the first few minutes.
 */
export type LiveLabel =
  | { kind: 'onSchedule' }
  | { kind: 'ahead'; minutes: number; isEstimated: boolean }
  | { kind: 'behind'; minutes: number; isEstimated: boolean }
  | { kind: 'stillOnGround'; minutesBehind: number | null }
  | { kind: 'landedOnTime' }
  | { kind: 'landedEarly'; minutes: number }
  | { kind: 'landedLate'; minutes: number }

/** A gap of this many minutes or fewer, either way, is on schedule. */
export const ON_SCHEDULE_WITHIN = 5

/**
 * The label for a flight in `phase`, `gapMinutes` ahead of the plan (behind when negative). Null where there's no gap
 * to tell, and for a flight that isn't live or is somewhere else.
 */
export function liveLabel(phase: LivePhase, gapMinutes: number | null): LiveLabel | null {
  if (gapMinutes == null) return null
  const minutes = Math.abs(gapMinutes)
  const isOnSchedule = minutes <= ON_SCHEDULE_WITHIN
  switch (phase) {
    case 'inAir':
    case 'estimated': {
      const isEstimated = phase === 'estimated'
      if (isOnSchedule) return { kind: 'onSchedule' }
      return gapMinutes > 0 ? { kind: 'ahead', minutes, isEstimated } : { kind: 'behind', minutes, isEstimated }
    }
    case 'onGround':
      return { kind: 'stillOnGround', minutesBehind: isOnSchedule ? null : minutes }
    case 'landed':
      if (isOnSchedule) return { kind: 'landedOnTime' }
      return gapMinutes > 0 ? { kind: 'landedEarly', minutes } : { kind: 'landedLate', minutes }
    case 'notLive':
    case 'elsewhere':
      return null
  }
}
