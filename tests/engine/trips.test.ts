import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs, type MoveLeg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { tripDayNumber, tripDays, upcomingTrip } from '../../src/engine/trips'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'

/** A schedule and its legs from a RawBuilder. A is Fri 9 Oct 2026, 5:30am EDT. */
function engineOf(b: RawBuilder) {
  const schedule = buildSchedule(b.build(), A)
  return { schedule, legs: buildLegs(schedule) }
}
const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
const pat = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')

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

describe('upcomingTrip', () => {
  const none = { commute: null, delay: null }
  /** Sat 10 Oct: SDF→RFD→ANC; Sun 11 Oct: ANC→SDF. */
  const withTrip = (b: RawBuilder) =>
    b.trip('t1', {
      days: 2,
      dutyPeriods: [
        { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'RFD', out: 1500, in: 1590 }, { dep: 'RFD', arr: 'ANC', out: 1650, in: 1980 }] },
        { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
      ],
    })

  it('is the next trip: each airport once in order, its first flight, and its length', () => {
    const { schedule, legs } = engineOf(withTrip(alex()))
    expect(upcomingTrip(schedule, legs, at(0), NY, none)).toEqual({
      tripId: 't1',
      departs: at(1500),
      days: 2,
      route: ['SDF', 'RFD', 'ANC'],
      delayMinutes: null,
    })
  })

  it('shows at most six stops', () => {
    const b = alex().trip('t1', {
      dutyPeriods: [
        {
          start: 1440,
          end: 2400,
          flights: [
            { dep: 'SDF', arr: 'RFD', out: 1500, in: 1560 },
            { dep: 'RFD', arr: 'ANC', out: 1600, in: 1700 },
            { dep: 'ANC', arr: 'ONT', out: 1750, in: 1850 },
            { dep: 'ONT', arr: 'HNL', out: 1900, in: 2000 },
            { dep: 'HNL', arr: 'MIA', out: 2050, in: 2150 },
            { dep: 'MIA', arr: 'ATL', out: 2200, in: 2300 },
          ],
        },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(upcomingTrip(schedule, legs, at(0), NY, none)?.route).toEqual(['SDF', 'RFD', 'ANC', 'ONT', 'HNL', 'MIA'])
  })

  it('starts from home, and leaves when the commute jumpseat does, when one was logged', () => {
    const { schedule, legs } = engineOf(withTrip(pat()).jumpseat('js1', 'MCO', 'SDF', 1300, 1420))
    const commute = legs.find((l) => l.id === 'js1') as MoveLeg
    expect(upcomingTrip(schedule, legs, at(0), NY, { commute, delay: null })).toMatchObject({
      departs: at(1300),
      route: ['MCO', 'SDF', 'RFD', 'ANC'],
    })
  })

  it('leaves home where the route already has it, as the app does', () => {
    const b = pat()
      .trip('t1', {
        dutyPeriods: [
          { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'MCO', out: 1500, in: 1620 }, { dep: 'MCO', arr: 'SDF', out: 1700, in: 1820 }] },
        ],
      })
      .jumpseat('js1', 'MCO', 'SDF', 1300, 1420)
    const { schedule, legs } = engineOf(b)
    const commute = legs.find((l) => l.id === 'js1') as MoveLeg
    expect(upcomingTrip(schedule, legs, at(0), NY, { commute, delay: null })?.route).toEqual(['SDF', 'MCO'])
  })

  it('carries a delay or an early departure on this trip’s flight, and ignores one on another trip', () => {
    const { schedule, legs } = engineOf(
      withTrip(alex()).trip('t0', {
        dutyPeriods: [{ start: -600, end: -100, flights: [{ dep: 'SDF', arr: 'MIA', out: -500, in: -300 }] }],
      }),
    )
    const flightOf = (id: string) => legs.find((l) => l.kind === 'flight' && l.tripId === id) as MoveLeg
    const delayed = (id: string, minutes: number) => ({ commute: null, delay: { flight: flightOf(id), minutes } })
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t1', 40))?.delayMinutes).toBe(40)
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t1', -20))?.delayMinutes).toBe(-20)
    expect(upcomingTrip(schedule, legs, at(0), NY, delayed('t0', 40))?.delayMinutes).toBeNull()
  })

  it('is null with no trip flight ahead', () => {
    const { schedule, legs } = engineOf(withTrip(alex()))
    expect(upcomingTrip(schedule, legs, at(4000), NY, none)).toBeNull()
  })
})
