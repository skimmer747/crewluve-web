import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot } from '../../src/engine/snapshot'
import { RECAP_MS, RECAP_YIELDS_WITHIN_MS, recapTrip } from '../../src/engine/trips'
import { HOUR } from '../../src/time/zoned'
import { A, at } from '../fixtures/engine'

const NY = 'America/New_York'
/** Sam's two-day trip lands home at Louisville at minute 2040. */
const LANDED = 2040

/** Sam's snapshot `minutes` after the trip's report, with a next trip leaving `nextIn` minutes after that, if given. */
function snapshotAt(minutes: number, nextIn: number | null = null) {
  let builder = new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
    days: 2,
    dutyPeriods: [
      { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'CGN', out: 60, in: 540 }] },
      { start: 1500, end: 2100, flights: [{ dep: 'CGN', arr: 'SDF', out: 1560, in: LANDED }] },
    ],
  })
  if (nextIn != null) {
    const out = minutes + nextIn
    builder = builder.trip('t2', { days: 1, dutyPeriods: [{ start: out - 60, end: out + 240, flights: [{ dep: 'SDF', arr: 'MIA', out, in: out + 150 }] }] })
  }
  const schedule = buildSchedule(builder.build(), A)
  return makeSnapshot(schedule, buildLegs(schedule), at(minutes), NY)
}

describe('the recap’s trip (Stage 2 spec §8.1)', () => {
  it('shows for a day, and gives way to a trip leaving within 12 hours', () => {
    expect(RECAP_MS).toBe(24 * HOUR)
    expect(RECAP_YIELDS_WITHIN_MS).toBe(12 * HOUR)
  })

  it('is the trip that landed 3 hours ago, with CrewLu’s count of its days', () => {
    const snap = snapshotAt(LANDED + 180)
    expect(snap.status.kind).toBe('home')
    expect(snap.recap).toEqual({ tripId: 't1', days: 2 })
  })

  it('is gone 25 hours after', () => {
    expect(snapshotAt(LANDED + 25 * 60).recap).toBeNull()
  })

  it('gives way to the next trip leaving within 12 hours', () => {
    const snap = snapshotAt(LANDED + 180, 600)
    expect(snap.recap).toBeNull()
    expect(snap.upcomingTrip?.tripId).toBe('t2')
  })

  it('stays when the next trip leaves later', () => {
    expect(snapshotAt(LANDED + 180, 840).recap).toEqual({ tripId: 't1', days: 2 })
  })

  it('isn’t shown away from home, mid-trip', () => {
    expect(snapshotAt(1000).recap).toBeNull()
  })

  it('waits for home: a commuter at base still has the way home ahead (Swift test_initStatus_atBaseNotYetHome)', () => {
    // Home MCO, base SDF: landing at the base with no commute home logged is "base", not "home".
    const raw = new RawBuilder(A).pilot('Sam', 'SDF', 'MCO').trip('t1', {
      days: 1,
      dutyPeriods: [{ start: 0, end: 600, flights: [{ dep: 'CGN', arr: 'SDF', out: 60, in: 540 }] }],
    }).build()
    const schedule = buildSchedule(raw, A)
    const snap = makeSnapshot(schedule, buildLegs(schedule), at(540 + 180), NY)
    expect(snap.status.kind).toBe('base')
    expect(snap.recap).toBeNull()
  })

  it('is no recap of the last trip while a later trip is under way (Swift test_initStatus_aLaterTripUnderWay)', () => {
    // t1 landed 20 hours ago; t2 has flown, and has its next flight ahead after a night at home. Asked directly, since
    // the snapshot only asks at home.
    const raw = new RawBuilder(A).pilot('Sam', 'SDF', null)
      .trip('t1', { days: 1, dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'CGN', out: 30, in: 270 }] }] })
      .trip('t2', {
        days: 2,
        dutyPeriods: [
          { start: 1500, end: 1800, flights: [{ dep: 'SDF', arr: 'CGN', out: 1530, in: 1700 }] },
          { start: 2600, end: 3000, flights: [{ dep: 'CGN', arr: 'SDF', out: 2630, in: 2900 }] },
        ],
      }).build()
    const schedule = buildSchedule(raw, A)
    const legs = buildLegs(schedule)
    const now = at(1900)
    expect(recapTrip(schedule, legs, now, NY)).toBeNull()
    // Once t2 has landed too, t2 is the recap, not t1.
    expect(recapTrip(schedule, legs, at(2900 + 60), NY)).toEqual({ tripId: 't2', days: 2 })
  })

  it('is the latest trip to end when two ended in the past day', () => {
    const raw = new RawBuilder(A).pilot('Sam', 'SDF', null)
      .trip('t1', { days: 1, dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'CGN', out: 30, in: 270 }] }] })
      .trip('t2', { days: 1, dutyPeriods: [{ start: 400, end: 700, flights: [{ dep: 'CGN', arr: 'SDF', out: 430, in: 670 }] }] }).build()
    const schedule = buildSchedule(raw, A)
    expect(recapTrip(schedule, buildLegs(schedule), at(670 + 120), NY)).toEqual({ tripId: 't2', days: 1 })
  })

  it('doesn’t count a standalone jumpseat as a trip', () => {
    const raw = new RawBuilder(A).pilot('Sam', 'SDF', null).jumpseat('j1', 'MIA', 'SDF', 0, 150).build()
    const schedule = buildSchedule(raw, A)
    expect(recapTrip(schedule, buildLegs(schedule), at(150 + 120), NY)).toBeNull()
  })
})
