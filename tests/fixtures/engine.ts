import { RawBuilder } from '../../src/data/rowBuilder'
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

/** Tue 13 Oct 2026, 19:32 UTC: Z55377's report, in the back-to-back week below. */
export const B2B = Date.UTC(2026, 9, 13, 19, 32)

/**
 * The week of the 2026-10-13 report (home MCO, base SDF), in minutes from B2B. Z55377 lands at the base on
 * Wed 11:37 PM EDT, Z55423 reports 15 h 43 m later, and the only ride home is the commute after it: Sat 3:21 AM EDT.
 */
export function backToBackRaw(): RawSchedule {
  return new RawBuilder(B2B).pilot('Todd', 'SDF', 'MCO')
    .commute('c-work', 'MCO', 'SDF', 'toWork', -240, -120, 'Z55377')
    .trip('Z55377', {
      dutyPeriods: [
        {
          start: 0, end: 627, flights: [
            { dep: 'SDF', arr: 'DFW', out: 60, in: 192, number: '5768' },
            { dep: 'DFW', arr: 'RFD', out: 374, in: 492, number: '753' },
            { dep: 'RFD', arr: 'ORD', out: 507, in: 627, number: '8888', dh: true },
          ],
        },
        { start: 1791, end: 1940, flights: [{ dep: 'ORD', arr: 'SDF', out: 1851, in: 1925, number: '603' }] },
      ],
    })
    .trip('Z55423', {
      dutyPeriods: [
        { start: 2868, end: 3227, flights: [{ dep: 'SDF', arr: 'SJU', out: 2958, in: 3197, number: '328' }] },
        { start: 4531, end: 4909, flights: [{ dep: 'SJU', arr: 'SDF', out: 4621, in: 4879, number: '329', dh: true }] },
      ],
    })
    .commute('c-home', 'SDF', 'MCO', 'toHome', 4909, 5029, 'Z55423')
    .build()
}
