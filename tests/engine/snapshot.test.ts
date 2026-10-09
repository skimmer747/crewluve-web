import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot, tripDays } from '../../src/engine/snapshot'
import type { Schedule, Trip } from '../../src/engine/types'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const e = engineFor(demoRaw('driver', A))
const snap = (minutes: number) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

/** A snapshot of a RawBuilder schedule, `minutes` from the anchor. */
function snapOf(builder: RawBuilder, minutes: number) {
  const s = buildSchedule(builder.build(), A)
  return makeSnapshot(s, buildLegs(s), at(minutes), NY)
}

describe('makeSnapshot on the demo timeline', () => {
  it('rings the current flight, report window, layover, or duty — never a turn', () => {
    expect(snap(100).ring).toBeCloseTo(40 / 90, 8)
    expect(snap(30).ring).toBeCloseTo(0.5, 8)
    expect(snap(180).ring).toBeNull()
    expect(snap(4500).ring).toBeCloseTo(0.25, 8)
  })

  it('flags a 15+ minute delay on the flight that matters now', () => {
    expect(snap(1700).delay?.minutes).toBe(40) // in the air on the late leg
    expect(snap(1300).delay?.minutes).toBe(40) // on the layover before it
    expect(snap(100).delay).toBeNull()
  })

  it('celebrates inside the last 24 hours away', () => {
    expect(snap(1700).celebrate).toBe(true)
    expect(snap(100).celebrate).toBe(false)
    expect(snap(1950).celebrate).toBe(true) // driving the last stretch
  })

  it('does not celebrate at base, even with the drive home less than 24 hours away', () => {
    const s = snap(1910) // landed, 90 minutes before the drive home ends
    expect(s.status.kind).toBe('base')
    expect(s.arrival?.time).toBe(at(2000))
    expect(s.celebrate).toBe(false)
  })

  it('carries none of the Home extras while away', () => {
    const s = snap(100)
    expect(s.status.kind).toBe('inFlight')
    expect(s).toMatchObject({ leave: null, homecoming: null, driveToWork: null, daysHome: null, lastTripDays: null })
  })

  it('fills in the home details', () => {
    const s = snap(-1440)
    expect(s.status.kind).toBe('home')
    expect(s.arrival).toBeNull()
    expect(s.daysHome).toBe(3)
    expect(s.lastTripDays).toBe(2)
    expect(s.nextTripDays).toBe(2)
    expect(s.driveToWork?.id).toBe('demo-c1-work')
    expect(s.leave?.time).toBe(at(-90))
    expect(s.homecoming?.time).toBe(at(2000))
    expect(s.nextFlight?.dep).toBe('SDF')
  })

  it('names the pilot', () => {
    expect(snap(0).name).toBe('Alex')
    expect(snap(0).hasName).toBe(true)
  })
})

describe('makeSnapshot special cases', () => {
  it('says "Your pilot" when the profile has no first name', () => {
    const s = buildSchedule(new RawBuilder(A).pilot(null, 'SDF', null).build(), A)
    const sn = makeSnapshot(s, buildLegs(s), A, NY)
    expect(sn.name).toBe('Your pilot')
    expect(sn.hasName).toBe(false)
  })

  it('treats a mid-trip night at home as home, without the been-home extras', () => {
    const s = buildSchedule(
      new RawBuilder(A).pilot('Sam', 'SDF', null)
        // The trip before ended at home, so "been home" and "gone for" would have real values to show.
        .trip('t0', { days: 3, dutyPeriods: [{ start: -3000, end: -2700, flights: [{ dep: 'ANC', arr: 'SDF', out: -2940, in: -2760 }] }] })
        .trip('t1', {
          days: 2,
          dutyPeriods: [
            { start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150 }, { dep: 'RFD', arr: 'SDF', out: 200, in: 290 }] },
            { start: 1300, end: 1700, flights: [{ dep: 'SDF', arr: 'ANC', out: 1360, in: 1660 }] },
          ],
        })
        // The trip after has another length, so it can't be mistaken for the one in progress.
        .trip('t2', { days: 4, dutyPeriods: [{ start: 5000, end: 5300, flights: [{ dep: 'SDF', arr: 'MIA', out: 5060, in: 5200 }] }] })
        .build(),
      A,
    )
    const legs = buildLegs(s)

    // Between trips, the extras show.
    const between = makeSnapshot(s, legs, at(-1000), NY)
    expect(between.status.kind).toBe('home')
    expect(between.midTripAtHome).toBe(false)
    expect(between.daysHome).toBe(1)
    expect(between.lastTripDays).toBe(3)

    // The night at home in the middle of t1 is Home too, without them.
    const sn = makeSnapshot(s, legs, at(600), NY)
    expect(sn.status.kind).toBe('home')
    expect(sn.midTripAtHome).toBe(true)
    expect(sn.arrival).toBeNull()
    expect(sn.daysHome).toBeNull()
    expect(sn.lastTripDays).toBeNull()
    expect(sn.nextTripDays).toBe(2) // the trip in progress, not the one after it
    expect(sn.leave?.time).toBe(at(1360))
  })

  it('shows "On duty" and ~N days for a trip whose flights are all hidden', () => {
    const s = buildSchedule(
      new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
        days: 3,
        dutyPeriods: [
          { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 360, hidden: true }] },
          { start: 2880, end: 3300, flights: [{ dep: 'ANC', arr: 'SDF', out: 2940, in: 3240, hidden: true }] },
        ],
      }).build(),
      A,
    )
    const sn = makeSnapshot(s, buildLegs(s), at(1800), NY) // day 2 of 3
    expect(sn.status.kind).toBe('unknown')
    expect(sn.arrival).toBeNull()
    expect(sn.fallbackDaysRemaining).toBe(1)
  })
})

describe('trips with every flight hidden', () => {
  const hiddenTrip = (builder: RawBuilder, days?: number) => builder.trip('t1', {
    days,
    dutyPeriods: [
      { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 360, hidden: true }] },
      { start: 2880, end: 3300, flights: [{ dep: 'ANC', arr: 'SDF', out: 2940, in: 3240, hidden: true }] },
    ],
  })

  it('shows "On duty" even when the pilot last landed at base before the trip', () => {
    const earlierTrip = new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
      .trip('t0', { days: 2, dutyPeriods: [{ start: -3000, end: -2700, flights: [{ dep: 'ANC', arr: 'SDF', out: -2940, in: -2760 }] }] })
    const sn = snapOf(hiddenTrip(earlierTrip, 3), 1800)
    expect(sn.status).toMatchObject({ kind: 'unknown', airport: null, current: null })
    expect(sn.arrival).toBeNull()
    expect(sn.fallbackDaysRemaining).toBe(1)
  })

  it.each([[0], [undefined]])('counts calendar days for the ~N days card when trips.days is %s', (days) => {
    const sn = snapOf(hiddenTrip(new RawBuilder(A).pilot('Alex', 'SDF', 'LEX'), days), 1800)
    expect(sn.fallbackDaysRemaining).toBe(1) // Saturday is day 2 of Friday to Sunday
  })

  it('hides the ~N days card when a ride home gives the pilot a real target', () => {
    const sn = snapOf(hiddenTrip(new RawBuilder(A).pilot('Alex', 'SDF', 'LEX'), 3).commute('h', 'SDF', 'LEX', 'toHome', 2000, 2070, 't1'), 1800)
    expect(sn.arrival).toMatchObject({ label: 'home', time: at(2070) })
    expect(sn.fallbackDaysRemaining).toBeNull()
  })

  it('lets a drive that is under way keep its own status', () => {
    const sn = snapOf(hiddenTrip(new RawBuilder(A).pilot('Alex', 'SDF', 'LEX'), 3).commute('h', 'SDF', 'LEX', 'toHome', 1700, 1900, 't1'), 1800)
    expect(sn.status.kind).toBe('drivingHome')
    expect(sn.arrival).toMatchObject({ label: 'home', time: at(1900) })
  })
})

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

describe('the first flight of a trip', () => {
  /** One trip whose first flight leaves `shift` minutes off schedule from `dep`. The pilot's base is SDF. */
  const firstFlight = (shift: number, minutes: number, dep = 'SDF') => snapOf(
    new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
      dutyPeriods: [{ start: 0, end: 600, flights: [{ dep, arr: 'ANC', out: 60, in: 360, actualOut: 60 + shift, actualIn: 360 + shift }] }],
    }),
    minutes,
  )

  it.each<[number, number | null]>([[15, 15], [14, null], [-15, -15], [-14, null], [0, null]])(
    'leaving %i minutes off schedule is flagged as %s (early is negative)',
    (shift, flagged) => expect(firstFlight(shift, -300).delay?.minutes ?? null).toBe(flagged),
  )

  it('is flagged at home, at base, away from base, and in the air', () => {
    const states = [
      ['home', firstFlight(20, -300)],
      ['base', firstFlight(20, 30)], // in the report window at the base
      ['off', firstFlight(20, 30, 'ANC')], // in the report window somewhere else
      ['inFlight', firstFlight(20, 100)],
    ] as const
    for (const [kind, sn] of states) {
      expect(sn.status.kind).toBe(kind)
      expect(sn.delay?.minutes).toBe(20)
    }
  })

  it('rings the report window at the base, not somewhere else', () => {
    expect(firstFlight(0, 30).ring).toBeCloseTo(0.5, 8)
    expect(firstFlight(0, 30, 'ANC').status.kind).toBe('off')
    expect(firstFlight(0, 30, 'ANC').ring).toBeNull()
  })
})

describe('the legs around Home', () => {
  const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')

  it('offers a drive to work only if it comes before the next flight', () => {
    const sn = snapOf(
      alex()
        .trip('t1', { dutyPeriods: [{ start: 600, end: 900, flights: [{ dep: 'SDF', arr: 'ANC', out: 660, in: 840 }] }] }) // no drive logged for t1
        .trip('t2', { dutyPeriods: [{ start: 5000, end: 5300, flights: [{ dep: 'SDF', arr: 'MIA', out: 5060, in: 5200 }] }] })
        .commute('work2', 'LEX', 'SDF', 'toWork', 4900, 4990, 't2'),
      0,
    )
    expect(sn.status.kind).toBe('home')
    expect(sn.nextFlight?.tripId).toBe('t1')
    expect(sn.driveToWork).toBeNull()
  })

  it('lists only a drive, or a drive-titled event, that arrives home as the next way home', () => {
    // An event at home and a drive to work are not ways home.
    const neither = snapOf(alex().manualEvent('vacation', 'Vacation', 100, 200, 'LEX').commute('work', 'LEX', 'SDF', 'toWork', 300, 390), 0)
    expect(neither.nextHomeTrip).toBeNull()
    expect(snapOf(alex().manualEvent('truck', 'Driving the truck home', 100, 200, 'LEX'), 0).nextHomeTrip?.id).toBe('truck')
    expect(snapOf(alex().commute('back', 'SDF', 'LEX', 'toHome', 100, 170), 0).nextHomeTrip?.id).toBe('back')
  })
})

describe('the logged commute to the next trip', () => {
  /** Pat lives in Orlando and flies out of Louisville. The next trip leaves Louisville at minute 1500. */
  const pat = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')
  const withTrip = (b: RawBuilder) =>
    b.trip('t1', { dutyPeriods: [{ start: 1440, end: 1800, flights: [{ dep: 'SDF', arr: 'ANC', out: 1500, in: 1700 }] }] })
  const commuteAt = (b: RawBuilder, minutes = 0) => snapOf(withTrip(b), minutes).nextCommute

  it('is only looked for at home, like the other home-only extras', () => {
    const away = pat()
      .trip('t0', { dutyPeriods: [{ start: -120, end: 300, flights: [{ dep: 'SDF', arr: 'ANC', out: -60, in: 200 }] }] })
      .jumpseat('j1', 'MCO', 'SDF', 900, 1020)
    const sn = snapOf(withTrip(away), 0)
    expect(sn.status.kind).not.toBe('home')
    expect(sn.nextCommute).toBeNull()
  })

  it('is the standalone jumpseat from home to the trip’s first airport', () => {
    const sn = snapOf(withTrip(pat().jumpseat('j1', 'MCO', 'SDF', 900, 1020)), 0)
    expect(sn.status.kind).toBe('home')
    expect(sn.nextCommute).toMatchObject({ id: 'j1', kind: 'jumpseat', dep: 'MCO', arr: 'SDF', start: at(900) })
  })

  it('is the earliest one when several are logged', () => {
    expect(commuteAt(pat().jumpseat('later', 'MCO', 'SDF', 1100, 1200).jumpseat('sooner', 'MCO', 'SDF', 700, 800))?.id).toBe('sooner')
  })

  it.each([
    ['goes to some other city', (b: RawBuilder) => b.jumpseat('j', 'MCO', 'ATL', 900, 1020), 0],
    ['leaves from somewhere other than home', (b: RawBuilder) => b.jumpseat('j', 'ATL', 'SDF', 900, 1020), 0],
    ['leaves after the trip does', (b: RawBuilder) => b.jumpseat('j', 'MCO', 'SDF', 1600, 1700), 0],
    ['leaves the very minute the trip does', (b: RawBuilder) => b.jumpseat('j', 'MCO', 'SDF', 1500, 1600), 0],
    ['has already left', (b: RawBuilder) => b.jumpseat('j', 'MCO', 'SDF', 900, 1020), 1000],
    ['leaves this very minute', (b: RawBuilder) => b.jumpseat('j', 'MCO', 'SDF', 900, 1020), 900],
  ])('is null when the jumpseat %s', (_why, add, minutes) => {
    expect(commuteAt(add(pat()), minutes)).toBeNull()
  })

  it('is null when the trip leaves from home itself, even with a stray home-to-home jumpseat', () => {
    const sam = new RawBuilder(A).pilot('Sam', 'SDF', null)
    expect(snapOf(withTrip(sam.jumpseat('j', 'SDF', 'SDF', 900, 1020)), 0).nextCommute).toBeNull()
  })

  it('is null with no trip ahead', () => {
    expect(snapOf(pat().jumpseat('j', 'MCO', 'SDF', 900, 1020), 0).nextCommute).toBeNull()
  })

  it('ignores a jumpseat that belongs to a trip', () => {
    const s = buildSchedule(withTrip(pat().jumpseat('j', 'MCO', 'SDF', 900, 1020)).build(), A)
    const legs = buildLegs(s).map((l) => (l.kind === 'jumpseat' ? { ...l, tripId: 't1' } : l))
    expect(makeSnapshot(s, legs, A, NY).nextCommute).toBeNull()
  })
})

describe('safeSnapshot', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})
  /** The module afresh, so what it remembers about the failures it already logged starts empty. */
  async function freshSnapshotModule() {
    vi.resetModules()
    return import('../../src/engine/snapshot')
  }
  const onDuty = { kind: 'unknown', airport: null, current: null, previous: null, next: null }

  it('turns an engine crash into the "On duty" status', async () => {
    const error = quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    const sn = safeSnapshot(e.schedule, null as unknown as Leg[], A, NY)
    expect(sn.status.kind).toBe('unknown')
    expect(sn.arrival).toBeNull()
    expect(sn.nextCommute).toBeNull()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Status engine failed'), expect.any(Error))
  })

  it('keeps the pilot’s name when the schedule is what made the engine crash', async () => {
    quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    const broken = { ...e.schedule, trips: null } as unknown as Schedule // makeSnapshot reads schedule.trips
    const sn = safeSnapshot(broken, e.legs, A, NY)
    expect(sn).toMatchObject({ name: 'Alex', hasName: true, empty: false, ring: null, arrival: null, leave: null, celebrate: false, status: onDuty })
  })

  it.each([[null], [undefined], [{}], [{ pilot: null }], [42]])('survives a malformed schedule: %j', async (bad) => {
    quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    const sn = safeSnapshot(bad as unknown as Schedule, [], A, NY)
    expect(sn).toMatchObject({ name: 'Your pilot', hasName: false, empty: false, status: onDuty })
    expect(sn.pilot).toEqual({ firstName: null, base: null, home: null, effHome: null })
  })

  it('logs the same failure once, not on every clock tick', async () => {
    const error = quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    for (let i = 0; i < 5; i++) safeSnapshot(e.schedule, null as unknown as Leg[], at(i), NY)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('logs each different failure once, up to a limit', async () => {
    const error = quiet()
    const { safeSnapshot } = await freshSnapshotModule()
    const failWith = (message: string) => {
      const schedule = { ...e.schedule }
      Object.defineProperty(schedule, 'trips', { get() { throw new Error(message) } })
      safeSnapshot(schedule, e.legs, A, NY)
    }
    failWith('first')
    failWith('second')
    failWith('first')
    expect(error).toHaveBeenCalledTimes(2)
    for (let i = 0; i < 30; i++) failWith(`failure ${i}`)
    expect(error).toHaveBeenCalledTimes(10)
  })
})

describe('the commute ahead is bounded to the next trip (audit C7, C11, C22)', () => {
  /** The next trip leaves Louisville for Anchorage four days out, on Tuesday the 13th at 5:30am. */
  const tripAhead = (b: RawBuilder) =>
    b.trip('t1', { dutyPeriods: [{ start: 5700, end: 6100, flights: [{ dep: 'SDF', arr: 'ANC', out: 5760, in: 6000 }] }] })
  const alexAtHome = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
  const patAtHome = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')

  it('ignores the drive to work for a reserve day before the trip (C7)', () => {
    const b = alexAtHome()
      .commute('work-rsv', 'LEX', 'SDF', 'toWork', 1300, 1390)
      .manualEvent('rsv', 'RSVA', 1440, 2880, 'SDF')
      .commute('home-rsv', 'SDF', 'LEX', 'toHome', 2900, 2990)
    expect(snapOf(tripAhead(b), 0).driveToWork).toBeNull()
  })

  it('ignores the drive to work for a training day before the trip (C7)', () => {
    const b = alexAtHome()
      .commute('work-tr', 'LEX', 'SDF', 'toWork', 1300, 1390)
      .training('tr', 'RECURRENT', 1440, 1900, 'SDF')
      .commute('home-tr', 'SDF', 'LEX', 'toHome', 1950, 2040)
    expect(snapOf(tripAhead(b), 0).driveToWork).toBeNull()
  })

  it('ignores the drive of a trip whose flights are all hidden (C22)', () => {
    const b = alexAtHome()
      .trip('t0', { dutyPeriods: [{ start: 1440, end: 1800, flights: [{ dep: 'SDF', arr: 'MIA', out: 1500, in: 1700, hidden: true }] }] })
      .commute('w0', 'LEX', 'SDF', 'toWork', 1300, 1390, 't0')
    expect(snapOf(tripAhead(b), 0).driveToWork).toBeNull()
  })

  it('ignores a stray drive to work days before the trip (C11)', () => {
    expect(snapOf(tripAhead(alexAtHome().commute('stale', 'LEX', 'SDF', 'toWork', 300, 390)), 0).driveToWork).toBeNull()
  })

  it('keeps the trip’s own drive to work', () => {
    expect(snapOf(tripAhead(alexAtHome().commute('w1', 'LEX', 'SDF', 'toWork', 5600, 5690, 't1')), 0).driveToWork?.id).toBe('w1')
  })

  it('ignores an air commuter’s training-day jumpseat before the trip (C7)', () => {
    const b = patAtHome()
      .jumpseat('js-train', 'MCO', 'SDF', 1300, 1420)
      .training('tr', 'RECURRENT', 1500, 1900, 'SDF')
      .jumpseat('js-home', 'SDF', 'MCO', 2000, 2120)
    expect(snapOf(tripAhead(b), 0).nextCommute).toBeNull()
  })

  it('keeps the jumpseat that takes the commuter to the trip', () => {
    expect(snapOf(tripAhead(patAtHome().jumpseat('js1', 'MCO', 'SDF', 5400, 5520)), 0).nextCommute?.id).toBe('js1')
  })
})
