import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { lastHomeArrival, leaveTarget, nextTripFlight, nextTripHomecoming } from '../../src/engine/home'
import { A, at, engineFor } from '../fixtures/engine'
import { H, drive, duty, flight, pilot, sorted } from '../fixtures/legs'

const local = pilot(null, 'SDF')
const commuter = pilot('LEX', 'SDF')

describe('leaveTarget', () => {
  it('commuter who drives: leaves home when the drive to work starts', () => {
    const e = engineFor(demoRaw('driver', A))
    expect(leaveTarget(e.legs, e.schedule.pilot, at(-1440))).toEqual({
      label: 'leavesHome', time: at(-90), schedTime: at(-90), viaDrive: true, commuterUnlogged: false, airport: 'LEX', delayMin: 0,
    })
  })

  it('jumpseat commuter: leaves home on the jumpseat', () => {
    const e = engineFor(demoRaw('jumpseater', A))
    expect(leaveTarget(e.legs, e.schedule.pilot, at(-1440))).toMatchObject({ label: 'leavesHome', time: at(-300), viaDrive: false, airport: 'MCO' })
  })

  it('local pilot: the first flight, delay-aware', () => {
    const legs = [flight('SDF', 'ANC', 10, 15, 'T1', { start: 10.5 * H, schedStart: 10 * H })]
    expect(leaveTarget(legs, local, 0)).toEqual({
      label: 'leavesHome', time: 10.5 * H, schedTime: 10 * H, viaDrive: false, commuterUnlogged: false, airport: 'SDF', delayMin: 30,
    })
  })

  it('commuter with nothing logged: "Leaves In", flagged for the "Trip departs" subtitle', () => {
    expect(leaveTarget([flight('SDF', 'ANC', 10, 15)], commuter, 0)).toMatchObject({ label: 'leaves', commuterUnlogged: true, airport: 'SDF' })
  })

  it('training at the base before the trip comes first (C10)', () => {
    const legs = sorted([duty('training', 'CQ Training', 'SDF', 2, 8), flight('SDF', 'ANC', 10, 15)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leaves', time: 2 * H, viaDrive: false })
  })

  it('ignores training or an event that is not at the base (C10)', () => {
    const legs = sorted([duty('training', 'CQ Training', 'MIA', 2, 8), duty('event', 'Dentist', null, 3, 4), flight('SDF', 'ANC', 10, 15)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leavesHome', time: 10 * H })
    // A pilot with no base has nowhere for an event with no location to be.
    const noBase = pilot('LEX', null)
    expect(leaveTarget(sorted([duty('event', 'Dentist', null, 2, 3), flight('SDF', 'ANC', 10, 15)]), noBase, 0)).toMatchObject({ label: 'leaves', time: 10 * H })
  })

  it('ignores training at the base that starts after the first flight leaves (C10)', () => {
    const legs = sorted([flight('SDF', 'ANC', 10, 15), duty('training', 'CQ Training', 'SDF', 20, 26)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leavesHome', time: 10 * H })
  })

  it('does not count a reserve as a departure, even one at the base (§6.6 step 6)', () => {
    const legs = sorted([duty('reserve', 'RSVA', 'SDF', 2, 8), flight('SDF', 'ANC', 10, 15)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leavesHome', time: 10 * H })
  })

  it('does not count a drive home as a departure', () => {
    const legs = sorted([drive('ANC', 'SDF', true, 2, 3), flight('SDF', 'MIA', 10, 12)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leavesHome', time: 10 * H, viaDrive: false })
  })

  it('does not count a jumpseat that leaves from somewhere other than home', () => {
    const legs = sorted([flight('ANC', 'MIA', 4, 6, null), flight('SDF', 'ONT', 10, 15)])
    expect(leaveTarget(legs, local, 0)).toMatchObject({ label: 'leavesHome', time: 10 * H })
  })

  it('only counts a candidate that starts after t (C3)', () => {
    const legs = sorted([duty('training', 'CQ Training', 'SDF', 2, 8), flight('SDF', 'ANC', 10, 15)])
    expect(leaveTarget(legs, local, 2 * H)).toMatchObject({ label: 'leavesHome', time: 10 * H })
  })

  it('is null with nothing ahead', () => {
    expect(leaveTarget([], local, 0)).toBeNull()
  })
})

describe('nextTripFlight', () => {
  const legs = sorted([flight('LEX', 'SDF', 5, 7, null), flight('SDF', 'ANC', 10, 15)])

  it('is the first trip flight after t, not a standalone jumpseat', () => {
    expect(nextTripFlight(legs, 0)).toMatchObject({ dep: 'SDF', arr: 'ANC' })
  })

  it('must depart after t', () => {
    expect(nextTripFlight(legs, 10 * H)).toBeNull()
  })
})

describe('nextTripHomecoming', () => {
  it('finds when the next trip brings the pilot home', () => {
    const e = engineFor(demoRaw('driver', A))
    expect(nextTripHomecoming(e.legs, e.schedule.pilot, at(-1440))).toMatchObject({ label: 'home', time: at(2000) })
  })

  it('is null when that trip has no homecoming logged', () => {
    expect(nextTripHomecoming(sorted([flight('SDF', 'ANC', 10, 15), flight('ANC', 'SDF', 30, 35)]), commuter, 0)).toBeNull()
  })

  it('follows the trip’s first flight, not a jumpseat to work that comes days earlier', () => {
    const e = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .jumpseat('commute', 'LEX', 'SDF', 0, 120)
        .trip('t1', {
          dutyPeriods: [
            { start: 1700, end: 2200, flights: [{ dep: 'SDF', arr: 'ANC', out: 1800, in: 2100 }] },
            { start: 6500, end: 7000, flights: [{ dep: 'ANC', arr: 'SDF', out: 6600, in: 6900 }] },
          ],
        })
        .commute('home', 'SDF', 'LEX', 'toHome', 6950, 7020, 't1')
        .build(),
    )
    expect(nextTripHomecoming(e.legs, e.schedule.pilot, at(-60))).toMatchObject({ label: 'home', time: at(7020) })
  })
})

describe('lastHomeArrival', () => {
  it('is the last real arrival home — the drive, not the landing at base (C25)', () => {
    const e = engineFor(demoRaw('driver', A))
    expect(lastHomeArrival(e.legs, e.schedule.pilot, at(-1440))).toBe(at(-6950))
  })

  it('skips a pass through home in the middle of a trip', () => {
    const legs = sorted([flight('SDF', 'RFD', 0, 1), flight('RFD', 'SDF', 2, 3), flight('SDF', 'ANC', 20, 25)])
    expect(lastHomeArrival(legs, local, 10 * H)).toBeNull()
  })

  describe('with several arrivals home', () => {
    const legs = sorted([flight('ANC', 'SDF', 0, 5, 'T1'), flight('SDF', 'ANC', 20, 25, 'T2'), flight('ANC', 'SDF', 40, 45, 'T2')])

    it('is the latest one', () => {
      expect(lastHomeArrival(legs, local, 50 * H)).toBe(45 * H)
    })

    it('counts an arrival only once it has ended', () => {
      expect(lastHomeArrival(legs, local, 44 * H)).toBe(5 * H)
      expect(lastHomeArrival(legs, local, 45 * H)).toBe(45 * H)
    })
  })
})
