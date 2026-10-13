import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { resolveStatus } from '../../src/engine/status'
import { arrivalTarget, currentTripId } from '../../src/engine/targets'
import type { Pilot } from '../../src/engine/types'
import { A, B2B, M, at, backToBackRaw, engineFor } from '../fixtures/engine'
import { H, drive, duty, flight, pilot, sorted } from '../fixtures/legs'

function arrivalAt(e: ReturnType<typeof engineFor>, minutes: number) {
  const t = at(minutes)
  return arrivalTarget(e.legs, e.schedule.pilot, resolveStatus(e.legs, e.schedule.pilot, t), t)
}

function targetAtHour(legs: Leg[], p: Pilot, hours: number) {
  const t = hours * H
  return arrivalTarget(legs, p, resolveStatus(legs, p, t), t)
}

const minutesOf = (target: { time: number } | null) => (target ? (target.time - A) / M : null)

describe('arrivalTarget on the demo timeline (home LEX, base SDF, drives to work)', () => {
  const e = engineFor(demoRaw('driver', A))

  it.each([
    ['driving to work', -60],
    ['in the report window', 30],
    ['flying the first leg', 100],
    ['on the late last leg', 1700],
  ])('%s → back home when the (shifted) drive home ends', (_moment, minutes) => {
    expect(arrivalAt(e, minutes)).toEqual({ label: 'home', time: at(2000), schedTime: at(1960), airport: 'LEX', delayMin: 40 })
  })

  it('counts down to the drive home that is under way', () => {
    expect(minutesOf(arrivalAt(e, 1950))).toBe(2000)
  })

  it('uses last week’s drive home during last week’s layover', () => {
    expect(arrivalAt(e, -7800)).toMatchObject({ label: 'home', time: at(-6950), delayMin: 0 })
  })

  it('shows Released In during reserve and training', () => {
    expect(arrivalAt(e, 4500)).toEqual({ label: 'released', time: at(5040), schedTime: at(5040), airport: 'SDF', delayMin: 0 })
    expect(arrivalAt(e, 5900)).toMatchObject({ label: 'released', time: at(6240) })
  })
})

describe('arrivalTarget for a jumpseat commuter (home MCO)', () => {
  const e = engineFor(demoRaw('jumpseater', A))

  it('counts to the jumpseat home while commuting home', () => {
    expect(arrivalAt(e, 1960)).toEqual({ label: 'home', time: at(2160), schedTime: at(2160), airport: 'MCO', delayMin: 0 })
  })

  it('finds the logged jumpseat home from mid-trip', () => {
    expect(minutesOf(arrivalAt(e, 100))).toBe(2160)
  })
})

describe('arrivalTarget edge cases', () => {
  const commuter = pilot('LEX', 'SDF')
  const local = pilot(null, 'SDF')

  it('local pilot: the trip’s final landing at home, not a pass through home mid-trip', () => {
    const outAndBack = [flight('SDF', 'RFD', 0, 1), flight('RFD', 'SDF', 2, 3), flight('SDF', 'ANC', 20, 25)]
    // The trip passes through home but ends in Anchorage, so it has no homecoming: count down to the city.
    // Counting the pass through home would say "home" at hour 3, even while the pilot is flying into it.
    for (const hour of [0.5, 2.5]) {
      expect(targetAtHour(sorted(outAndBack), local, hour)).toMatchObject({ label: 'city', time: 25 * H, airport: 'ANC' })
    }
    // Once the trip lands at home for good, that landing is the homecoming.
    const legs = sorted([...outAndBack, flight('ANC', 'SDF', 40, 45)])
    for (const hour of [0.5, 2.5]) {
      expect(targetAtHour(legs, local, hour)).toMatchObject({ label: 'home', time: 45 * H, airport: 'SDF' })
    }
  })

  it('commuter with no ride logged: back at base, then no countdown at all (C26)', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H, airport: 'SDF' })
    expect(targetAtHour(legs, commuter, 26)).toBeNull()
  })

  it('never borrows the homecoming of a trip that starts more than a day after the landing (C14)', () => {
    const legs = sorted([
      flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25),
      flight('SDF', 'MIA', 50, 52, 'T2'), flight('MIA', 'SDF', 60, 62, 'T2'), drive('SDF', 'LEX', true, 63, 64),
    ])
    expect(targetAtHour(legs, commuter, 30)).toBeNull()
  })

  it('a trip that ends elsewhere counts down to that city', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'ONT', 20, 25)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'city', time: 25 * H, airport: 'ONT' })
  })

  it('ignores rides home more than 3 days after the trip', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25), flight('SDF', 'LEX', 105, 106, null)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base' })
  })

  it('an event at home is not a homecoming', () => {
    expect(targetAtHour([duty('event', 'Vacation', 'LEX', 0, 100)], commuter, 1)).toBeNull()
  })

  it('a drive-titled event home is', () => {
    const truck = { ...duty('event', 'Driving the truck home', 'LEX', 0, 3), driveLike: true }
    expect(targetAtHour([truck], commuter, 1)).toMatchObject({ label: 'home', time: 3 * H })
  })

  it('needs a home airport', () => {
    expect(targetAtHour([flight('SDF', 'ANC', 0, 5)], pilot(null, null), 1)).toBeNull()
  })

  it('counts a hot standby down to its end, like a reserve or training', () => {
    const standby = duty('hotStandby', 'Hot Standby', 'SDF', 0, 6)
    expect(targetAtHour([standby], commuter, 1)).toEqual({ label: 'released', time: 6 * H, schedTime: 6 * H, airport: 'SDF', delayMin: 0 })
  })

  it('puts a reserve with no airport at the base', () => {
    expect(targetAtHour([duty('reserve', 'RSVA', null, 0, 12)], commuter, 1)).toMatchObject({ label: 'released', time: 12 * H, airport: 'SDF' })
  })

  it('counts to the ride home that is under way, not to the next trip that starts within a day', () => {
    // Jumpseating home from Ontario. The next trip leaves in 7 hours and also ends at home.
    const legs = sorted([
      flight('SDF', 'ONT', 0, 5, 'T1'),
      flight('ONT', 'SDF', 100, 106, null),
      flight('SDF', 'MIA', 110, 112, 'T2'), flight('MIA', 'SDF', 150, 152, 'T2'),
    ])
    expect(targetAtHour(legs, local, 103)).toMatchObject({ label: 'home', time: 106 * H, airport: 'SDF' })
  })

  it('ignores a ride home that starts before the trip’s last flight departs', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25), flight('SDF', 'LEX', 10, 11, null)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H })
  })

  it('never counts down to a ride home that is already over (C3)', () => {
    const legs = sorted([
      flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25),
      flight('SDF', 'LEX', 26, 27, null), // jumpseated home ...
      duty('event', 'Safety meeting', 'SDF', 28, 29), // ... and came back to base for a meeting
    ])
    expect(targetAtHour(legs, commuter, 30)).toBeNull()
  })

  it('never counts down to a landing at home that is already over (C3)', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25), duty('event', 'Recurrent CBT', 'MIA', 28, 30)])
    expect(targetAtHour(legs, local, 31)).toBeNull()
  })
})

describe('the 3-day window for a ride home', () => {
  const landing = 240
  const DAY_MIN = 1440

  describe('during a trip, counted from its last landing', () => {
    const rideAfter = (minutes: number) => engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t1', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'ANC', arr: 'SDF', out: 60, in: landing }] }] })
        .jumpseat('ride', 'SDF', 'LEX', landing + minutes, landing + minutes + 60)
        .build(),
    )

    it.each([
      ['a day and a half after', 36 * 60, 'home'],
      ['exactly 3 days after', 3 * DAY_MIN, 'home'],
      ['3 days and a minute after', 3 * DAY_MIN + 1, 'base'],
    ])('a ride that starts %s the landing → %s', (_when, minutes, label) => {
      expect(arrivalAt(rideAfter(minutes), 120)?.label).toBe(label) // 'base': no ride, so the last flight is the target
    })
  })

  describe('with no trip in play, counted from now', () => {
    const rideAt = (startMinutes: number) => engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .manualEvent('mtg', 'Safety meeting', -60, -30, 'SDF')
        .jumpseat('ride', 'SDF', 'LEX', startMinutes, startMinutes + 60)
        .build(),
    )

    it('counts down to a ride that starts within 3 days', () => {
      expect(arrivalAt(rideAt(3 * DAY_MIN), 0)).toMatchObject({ label: 'home', time: at(3 * DAY_MIN + 60) })
    })

    it('ignores a ride that starts any later', () => {
      expect(arrivalAt(rideAt(3 * DAY_MIN + 1), 0)).toBeNull()
    })
  })
})

describe('currentTripId', () => {
  const p = pilot('LEX', 'SDF')
  const tripIdAt = (legs: Leg[], t: number) => currentTripId(legs, resolveStatus(legs, p, t), t)

  it('is the trip being flown, then one that ended within a day, then one starting within a day', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5, 'T1'), flight('SDF', 'MIA', 60, 62, 'T2')])
    const tripAt = (hours: number) => tripIdAt(legs, hours * H)
    expect(tripAt(1)).toBe('T1')
    expect(tripAt(20)).toBe('T1')
    expect(tripAt(30)).toBeNull()
    expect(tripAt(40)).toBe('T2')
  })

  it('counts both 24-hour windows inclusively', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5, 'T1'), flight('SDF', 'MIA', 60, 62, 'T2')])
    expect(tripIdAt(legs, 29 * H)).toBe('T1') // T1 landed exactly 24 hours ago
    expect(tripIdAt(legs, 29 * H + M)).toBeNull() // a minute more
    expect(tripIdAt(legs, 36 * H)).toBe('T2') // T2 leaves in exactly 24 hours
    expect(tripIdAt(legs, 36 * H - M)).toBeNull() // a minute less than that
  })

  it('skips a standalone event or jumpseat after the last trip leg', () => {
    const legs = sorted([
      flight('SDF', 'ANC', 0, 5, 'T1'),
      duty('event', 'Recurrent CBT', 'SDF', 6, 7), // right after T1 lands
      flight('LEX', 'SDF', 8, 9, null), // a jumpseat to work
      flight('SDF', 'MIA', 30, 32, 'T2'),
    ])
    expect(tripIdAt(legs, 7.5 * H)).toBe('T1') // not the event ...
    expect(tripIdAt(legs, 8.5 * H)).toBe('T1') // ... or the jumpseat that is under way
  })

  it('looks past a standalone drive to the next trip leg', () => {
    // T1 landed over a day ago; a drive to work starts in 1 hour and T2 leaves in 3.
    const legs = sorted([flight('SDF', 'ANC', 0, 5, 'T1'), drive('LEX', 'SDF', false, 30, 31), flight('SDF', 'MIA', 32, 34, 'T2')])
    expect(tripIdAt(legs, 29 * H + M)).toBe('T2')
  })

  it('takes the trip of the latest trip leg to end', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5, 'T1'), flight('SDF', 'MIA', 10, 12, 'T2')])
    expect(tripIdAt(legs, 13 * H)).toBe('T2')
  })
})

describe('the current trip ignores the standalone legs around it', () => {
  const commuterRaw = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')

  it('an event at base between the drive to work and the report doesn’t hide Back Home In', () => {
    const build = (withMeeting: boolean) => {
      const b = commuterRaw()
        .commute('work', 'LEX', 'SDF', 'toWork', -200, -110, 't1')
        .trip('t1', {
          dutyPeriods: [
            { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'ANC', out: 60, in: 360 }] },
            { start: 4000, end: 4400, flights: [{ dep: 'ANC', arr: 'SDF', out: 4060, in: 4340 }] },
          ],
        })
        .commute('home', 'SDF', 'LEX', 'toHome', 4400, 4470, 't1')
      if (withMeeting) b.manualEvent('mtg', 'Safety meeting', -100, -40, 'SDF')
      return engineFor(b.build())
    }
    const expected = { label: 'home', time: at(4470), airport: 'LEX' }
    expect(arrivalAt(build(false), -150)).toMatchObject(expected) // driving to work
    expect(arrivalAt(build(true), -150)).toMatchObject(expected) // same, with a meeting before the report
  })

  it('an event after the trip lands doesn’t borrow the next trip’s homecoming (C14, C26)', () => {
    const e = engineFor(
      commuterRaw()
        .trip('t1', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'ANC', arr: 'SDF', out: 60, in: 240 }] }] })
        .manualEvent('cbt', 'Recurrent CBT', 300, 360, 'SDF')
        .trip('t2', { // reports 26 hours after t1 lands, time enough to go home
          dutyPeriods: [
            { start: 1800, end: 2100, flights: [{ dep: 'SDF', arr: 'MIA', out: 1860, in: 2040 }] },
            { start: 3200, end: 3500, flights: [{ dep: 'MIA', arr: 'SDF', out: 3260, in: 3440 }] },
          ],
        })
        .commute('t2-home', 'SDF', 'LEX', 'toHome', 3500, 3570, 't2')
        .build(),
    )
    expect(arrivalAt(e, 420)).toBeNull() // t1 is over and no ride home is logged for it
  })
})

describe('back-to-back trips: the homecoming after the last one (back-home spec §4)', () => {
  const commuter = pilot('LEX', 'SDF')
  const local = pilot(null, 'SDF')
  const week = (() => {
    const schedule = buildSchedule(backToBackRaw(), B2B)
    return { schedule, legs: buildLegs(schedule) }
  })()
  const weekAt = (minutes: number) => {
    const t = B2B + minutes * M
    return arrivalTarget(week.legs, week.schedule.pilot, resolveStatus(week.legs, week.schedule.pilot, t), t)
  }

  it.each([
    ['in the report window (the report’s screenshot)', 4],
    ['in the air on the first leg', 100],
    ['on the layover in Chicago', 1000],
    ['in the air back to the base', 1900],
    ['at the base between the trips', 2400],
    ['on the second trip', 3000],
  ])('%s → back home in Orlando when the commute after the second trip lands', (_moment, minutes) => {
    expect(weekAt(minutes)).toEqual({ label: 'home', time: B2B + 5029 * M, schedTime: B2B + 5029 * M, airport: 'MCO', delayMin: 0 })
  })

  const T1 = [flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25)]
  const T2 = (start: number) => [flight('SDF', 'MIA', start, start + 2, 'T2'), flight('MIA', 'SDF', 60, 62, 'T2')]
  const rideHome = drive('SDF', 'LEX', true, 63, 64)

  it('goes on to a trip that starts exactly 24 hours after the landing, but not a minute later', () => {
    expect(targetAtHour(sorted([...T1, ...T2(49), rideHome]), commuter, 1)).toMatchObject({ label: 'home', time: 64 * H })
    const later = sorted([...T1, ...T2(49 + 1 / 60), rideHome])
    expect(targetAtHour(later, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H })
    expect(targetAtHour(later, commuter, 30)).toBeNull()
  })

  it('counts the day from the actual landing, not the scheduled one (C1)', () => {
    const lateLanding = [flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 27, 'T1', { schedEnd: 25 * H })]
    expect(targetAtHour(sorted([...lateLanding, ...T2(50), rideHome]), commuter, 1)).toMatchObject({ label: 'home', time: 64 * H })
  })

  it.each([
    ['a jumpseat from home', flight('LEX', 'SDF', 40, 41, null)],
    ['a drive from home', drive('LEX', 'SDF', false, 40, 41)],
    ['a drive to work from elsewhere', drive('CVG', 'SDF', false, 40, 41)],
    ['an event at home', duty('event', 'Dentist', 'LEX', 40, 41)],
  ])('stops at the landing when %s between the trips shows the pilot went home', (_leg, atHome) => {
    const legs = sorted([...T1, atHome, ...T2(45), rideHome])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H })
    expect(targetAtHour(legs, commuter, 30)).toBeNull()
  })

  it.each([
    ['a jumpseat', flight('LEX', 'SDF', 38, 39, null)],
    ['a drive', drive('LEX', 'SDF', false, 38, 39)],
  ])('goes on once %s back from home is over: he is away again until the next trip ends', (_ride, fromHome) => {
    expect(targetAtHour(sorted([...T1, fromHome, ...T2(45), rideHome]), commuter, 40)).toMatchObject({ label: 'home', time: 64 * H })
  })

  it('stops at the landing when the next trip leaves from home', () => {
    const legs = sorted([...T1, flight('LEX', 'ATL', 40, 42, 'T2'), flight('ATL', 'SDF', 50, 52, 'T2'), drive('SDF', 'LEX', true, 53, 54)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H })
    expect(targetAtHour(legs, commuter, 26)).toBeNull()
  })

  it('keeps the first homecoming: a ride home before the next trip wins', () => {
    const legs = sorted([...T1, drive('SDF', 'LEX', true, 26, 27), ...T2(40), rideHome])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'home', time: 27 * H })
  })

  it('gives the next trip’s ride home its own 3 days, from that trip’s landing', () => {
    const legs = sorted([...T1, flight('SDF', 'ANC', 30, 35, 'T2'), flight('ANC', 'SDF', 105, 110, 'T2'), drive('SDF', 'LEX', true, 111, 112)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'home', time: 112 * H })
  })

  it('ignores a ride home that starts before the next trip’s last flight departs, as for the current trip', () => {
    const legs = sorted([
      ...T1,
      flight('SDF', 'ANC', 30, 35, 'T2'), flight('SDF', 'LEX', 40, 41, null), flight('ANC', 'SDF', 50, 55, 'T2'),
      drive('SDF', 'LEX', true, 56, 57),
    ])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'home', time: 57 * H })
  })

  it('goes on through three trips in a row', () => {
    const legs = sorted([
      ...T1,
      flight('SDF', 'MIA', 30, 32, 'T2'), flight('MIA', 'SDF', 38, 40, 'T2'),
      flight('SDF', 'ONT', 50, 52, 'T3'), flight('ONT', 'SDF', 58, 60, 'T3'),
      drive('SDF', 'LEX', true, 61, 62),
    ])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'home', time: 62 * H, airport: 'LEX' })
  })

  it('takes the next trip’s own landing at home', () => {
    const legs = sorted([...T1, flight('SDF', 'ATL', 30, 32, 'T2'), flight('ATL', 'LEX', 36, 37, 'T2')])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'home', time: 37 * H, airport: 'LEX' })
  })

  it('keeps the first homecoming: a local pilot whose trip ends at home is home after it', () => {
    const legs = sorted([...T1, ...T2(30)])
    expect(targetAtHour(legs, local, 1)).toMatchObject({ label: 'home', time: 25 * H, airport: 'SDF' })
  })

  it('with no homecoming down the line, still counts to the landing at base, then nothing (C26)', () => {
    const legs = sorted([...T1, ...T2(30)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H, airport: 'SDF' })
    expect(targetAtHour(legs, commuter, 26)).toBeNull()
  })
})
