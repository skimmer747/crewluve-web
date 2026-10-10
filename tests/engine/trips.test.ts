import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs, type MoveLeg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { tripDayNumber, tripDays, tripProgress, upcomingTrip } from '../../src/engine/trips'
import type { Trip } from '../../src/engine/types'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'

/** A schedule and its legs from a RawBuilder. A is Fri 9 Oct 2026, 5:30am EDT. */
function engineOf(b: RawBuilder) {
  const schedule = buildSchedule(b.build(), A)
  return { schedule, legs: buildLegs(schedule) }
}
const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
const pat = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')
/** Sat 10 Oct: SDF→RFD→SDF; Sun 11 Oct: SDF→ANC. Two days, with the pilot back at SDF overnight in between. */
const twoDayTrip = () =>
  engineOf(
    alex().trip('t1', {
      days: 2,
      dutyPeriods: [
        { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'RFD', out: 1500, in: 1590 }, { dep: 'RFD', arr: 'SDF', out: 1650, in: 1740 }] },
        { start: 3000, end: 3500, flights: [{ dep: 'SDF', arr: 'ANC', out: 3060, in: 3360 }] },
      ],
    }),
  )

describe('tripDays', () => {
  const trip = (days: number | null, start: number, end: number): Trip => ({ id: 'x', start, end, days, dutyPeriods: [] })
  // Friday 10 pm to Saturday 9 am in New York: two calendar days there, one in UTC.
  const overnight = (days: number | null) => trip(days, Date.UTC(2026, 9, 10, 2, 0), Date.UTC(2026, 9, 10, 13, 0))

  it('uses trips.days when it is above 0', () => {
    expect(tripDays(overnight(4), NY)).toBe(4)
    expect(tripDays(overnight(1), NY)).toBe(1)
  })

  it.each<[number | null]>([[null], [0], [-2]])('counts the calendar days in the zone given when trips.days is %s', (days) => {
    expect(tripDays(overnight(days), NY)).toBe(2)
    expect(tripDays(overnight(days), 'UTC')).toBe(1)
  })

  it('counts the first and last calendar day both', () => {
    expect(tripDays(trip(null, at(0), at(2 * 1440 + 60)), NY)).toBe(3) // Friday 5:30 am to Sunday 6:30 am
  })
})

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

  it('counts Monday 9pm as day 4 in New York, where UTC already says day 5', () => {
    // Mon 9:00pm EDT is already Tue 1:00am UTC. A stored length of 5 keeps the cap out of it, so only the zone decides.
    expect(tripDayNumber(fourDays(5), at(5250), NY)).toBe(4)
  })

  it('never goes past the trip length', () => {
    expect(tripDayNumber(fourDays(3), at(5250), NY)).toBe(3)
  })

  it('never goes below day 1, before the trip has started', () => {
    expect(tripDayNumber(fourDays(4), at(-1440), NY)).toBe(1)
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

  it('leaves out flights already flown, as when home or at base overnight mid-trip', () => {
    const { schedule, legs } = twoDayTrip()
    expect(upcomingTrip(schedule, legs, at(2400), NY, none)?.route).toEqual(['SDF', 'ANC'])
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

  it('cuts the route at six stops after putting home first', () => {
    const b = pat()
      .trip('t1', {
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
      .jumpseat('js1', 'MCO', 'SDF', 1300, 1420)
    const { schedule, legs } = engineOf(b)
    const commute = legs.find((l) => l.id === 'js1') as MoveLeg
    expect(upcomingTrip(schedule, legs, at(0), NY, { commute, delay: null })?.route).toEqual(['MCO', 'SDF', 'RFD', 'ANC', 'ONT', 'HNL'])
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

describe('tripProgress', () => {
  /** Sat 10 Oct: SDF→RFD→ANC; Sun 11 Oct: ANC→SDF. Three days. */
  const threeDayTrip = () =>
    engineOf(
      alex().trip('t1', {
        days: 3,
        dutyPeriods: [
          { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'RFD', out: 1500, in: 1590 }, { dep: 'RFD', arr: 'ANC', out: 1650, in: 1980 }] },
          { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
        ],
      }),
    )

  it('gives the day, the length, and where the remaining flights land, in order', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(1600), NY)).toEqual({ tripId: 't1', day: 1, days: 3, upcoming: ['ANC', 'SDF'] })
  })

  it('names each airport once', () => {
    const b = alex().trip('t1', {
      dutyPeriods: [
        {
          start: 0,
          end: 900,
          flights: [
            { dep: 'SDF', arr: 'ANC', out: 60, in: 300 },
            { dep: 'ANC', arr: 'SDF', out: 360, in: 600 },
            { dep: 'SDF', arr: 'ANC', out: 660, in: 880 },
          ],
        },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(tripProgress(schedule, legs, at(30), NY)?.upcoming).toEqual(['ANC', 'SDF'])
  })

  it('has no cities left once the last flight is off', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(3100), NY)).toMatchObject({ day: 2, upcoming: [] })
  })

  it('is null before and after the trip', () => {
    const { schedule, legs } = threeDayTrip()
    expect(tripProgress(schedule, legs, at(1000), NY)).toBeNull()
    expect(tripProgress(schedule, legs, at(3600), NY)).toBeNull()
  })

  it('covers the trip from its first minute up to, but not including, its end', () => {
    const { schedule, legs } = twoDayTrip()
    expect(tripProgress(schedule, legs, at(1439), NY)).toBeNull()
    expect(tripProgress(schedule, legs, at(1440), NY)).not.toBeNull()
    expect(tripProgress(schedule, legs, at(3499), NY)).not.toBeNull()
    expect(tripProgress(schedule, legs, at(3500), NY)).toBeNull()
  })

  it('stays on while a late last flight is still in the air after the stored release time', () => {
    const { schedule, legs } = engineOf(
      alex().trip('t1', {
        days: 1,
        dutyPeriods: [{ start: 0, end: 330, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 300, actualOut: 120, actualIn: 360 }] }],
      }),
    )
    expect(tripProgress(schedule, legs, at(345), NY)).not.toBeNull()
    expect(tripProgress(schedule, legs, at(360), NY)).toBeNull()
  })

  it('counts the length in calendar days when trips.days is 0', () => {
    const b = alex().trip('t1', {
      days: 0,
      dutyPeriods: [
        { start: 1440, end: 2000, flights: [{ dep: 'SDF', arr: 'ANC', out: 1500, in: 1900 }] },
        { start: 3000, end: 3500, flights: [{ dep: 'ANC', arr: 'SDF', out: 3060, in: 3360 }] },
      ],
    })
    const { schedule, legs } = engineOf(b)
    expect(tripProgress(schedule, legs, at(1600), NY)?.days).toBe(2)
  })
})
