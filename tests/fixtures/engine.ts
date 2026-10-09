import type { RawSchedule } from '../../src/data/rows'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'

/** Fri 9 Oct 2026, 5:30am EDT: the report time of the demo's main trip. */
export const A = Date.UTC(2026, 9, 9, 9, 30)
export const M = 60_000
export const at = (minutes: number) => A + minutes * M

export function engineFor(raw: RawSchedule) {
  const schedule = buildSchedule(raw, A)
  return { schedule, legs: buildLegs(schedule) }
}
