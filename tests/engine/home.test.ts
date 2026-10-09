import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { lastHomeArrival, leaveTarget, nextTripHomecoming } from '../../src/engine/home'
import { A, at, engineFor } from '../fixtures/engine'
import { H, duty, flight, pilot, sorted } from '../fixtures/legs'

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

  it('is null with nothing ahead', () => {
    expect(leaveTarget([], local, 0)).toBeNull()
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
})
