import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { tripDayNumber, tripDays } from '../../src/engine/trips'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'

/** A schedule and its legs from a RawBuilder. A is Fri 9 Oct 2026, 5:30am EDT. */
function engineOf(b: RawBuilder) {
  const schedule = buildSchedule(b.build(), A)
  return { schedule, legs: buildLegs(schedule) }
}
const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')

describe('tripDayNumber', () => {
  /** Fri 9 Oct 5:30am to Mon 12 Oct 10:00pm EDT: four calendar days in New York. */
  const fourDays = (days?: number) =>
    engineOf(
      alex().trip('t1', {
        days,
        dutyPeriods: [
          { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 400 }] },
          { start: 4800, end: 5310, flights: [{ dep: 'ANC', arr: 'SDF', out: 4860, in: 5250 }] },
        ],
      }),
    ).schedule.trips[0]

  it('counts calendar days from the start of the trip in the base time zone', () => {
    expect(tripDayNumber(fourDays(4), at(100), NY)).toBe(1)
    expect(tripDayNumber(fourDays(4), at(1440), NY)).toBe(2)
  })

  it('stays on the last day late on a US evening, where a UTC count reads one more', () => {
    // Mon 9:00pm EDT is already Tue 1:00am UTC, so Duty's UTC count says "Day 5 of 4".
    expect(tripDayNumber(fourDays(4), at(5250), NY)).toBe(4)
  })

  it('never goes past the trip length', () => {
    expect(tripDayNumber(fourDays(3), at(5250), NY)).toBe(3)
  })

  it('turns over at midnight in the base zone, not in UTC', () => {
    // Starts Sat 10 Oct 11:00pm EDT (Sun 3:00am UTC). At Sun 1:00am EDT it is day 2 in New York, still day 1 in UTC.
    const late = engineOf(
      alex().trip('t1', {
        days: 2,
        dutyPeriods: [{ start: 2490, end: 3000, flights: [{ dep: 'SDF', arr: 'ANC', out: 2550, in: 2900 }] }],
      }),
    ).schedule.trips[0]
    expect(tripDayNumber(late, at(2610), NY)).toBe(2)
  })

  it('uses the calendar-day length when trips.days is 0', () => {
    expect(tripDays(fourDays(0), NY)).toBe(4)
  })
})
