import { describe, expect, it } from 'vitest'
import { arrivalCard, leaveCard, statusVisual } from '../../src/copy/visuals'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { makeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const driver = engineFor(demoRaw('driver', A))
const snapAt = (minutes: number, e = driver): Snapshot => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('statusVisual', () => {
  it.each([
    [-1440, 'House', 'green'],
    [-60, 'Car', 'blue'],
    [30, 'Buildings', 'purple'],
    [100, 'Package', 'ups'],
    [180, 'ArrowsClockwise', 'orange'],
    [-7800, 'Bed', 'purple'],
    [1300, 'Bed', 'orange'],
    [1700, 'Package', 'orange'],
    [1950, 'Car', 'green'],
    [4500, 'ClockCountdown', 'red'],
    [5900, 'BookOpen', 'purple'],
  ] as const)('at %i min: %s in %s', (minutes, icon, color) => {
    expect(statusVisual(snapAt(minutes))).toEqual({ icon, color })
  })

  it('uses the airline’s icon and color on a jumpseat, and a blue airplane while commuting home', () => {
    const js = engineFor(demoRaw('jumpseater', A))
    expect(statusVisual(snapAt(-240, js))).toEqual({ icon: 'Triangle', color: '#002666' })
    expect(statusVisual(snapAt(1960, js))).toEqual({ icon: 'Airplane', color: 'blue' })
  })

  it('uses a gray pin off-trip and a gray dot when unknown', () => {
    const off = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [{ start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'MIA', out: 30, in: 180 }] }],
      }).build(),
    )
    expect(statusVisual(snapAt(600, off))).toEqual({ icon: 'MapPin', color: 'secondary' })
    const unknown: Snapshot = { ...snapAt(0), status: { kind: 'unknown', airport: null, current: null, previous: null, next: null } }
    expect(statusVisual(unknown)).toEqual({ icon: 'Circle', color: 'gray' })
  })
})

describe('arrivalCard', () => {
  it('turns red when the homecoming is 15+ minutes late', () => {
    const s = snapAt(1700)
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Back Home In', icon: 'House', color: 'red' })
  })

  it('stays green when on time', () => {
    const s = snapAt(1960, engineFor(demoRaw('jumpseater', A)))
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Back Home In', icon: 'House', color: 'green' })
  })

  it('borrows the status icon and color for Released In', () => {
    const s = snapAt(4500)
    expect(arrivalCard(s, s.arrival!, testAirports)).toEqual({ title: 'Released In', icon: 'ClockCountdown', color: 'red' })
  })

  it('names the base or the city when no homecoming is known', () => {
    const s = snapAt(0)
    expect(arrivalCard(s, { label: 'base', time: 0, schedTime: 0, airport: 'SDF', delayMin: 0 }, testAirports))
      .toEqual({ title: 'Back at Base In', icon: 'AirplaneLanding', color: 'green' })
    expect(arrivalCard(s, { label: 'city', time: 0, schedTime: 0, airport: 'ONT', delayMin: 0 }, testAirports).title).toBe('Ontario In')
  })
})

describe('leaveCard', () => {
  it('a drive is a blue "Leaves Home In" with a car', () => {
    expect(leaveCard(snapAt(-1440).leave!)).toEqual({ title: 'Leaves Home In', icon: 'Car', color: 'blue' })
  })

  it('a late first flight turns orange, an early one green; an unlogged commute says "Leaves In"', () => {
    const base = { time: 0, schedTime: 0, viaDrive: false, commuterUnlogged: false, airport: 'SDF', delayMin: 0 }
    expect(leaveCard({ ...base, label: 'leavesHome', delayMin: 30 })).toEqual({ title: 'Leaves Home In', icon: 'AirplaneTakeoff', color: 'orange' })
    expect(leaveCard({ ...base, label: 'leavesHome', delayMin: -20 }).color).toBe('green')
    expect(leaveCard({ ...base, label: 'leaves', commuterUnlogged: true })).toEqual({ title: 'Leaves In', icon: 'AirplaneTakeoff', color: 'blue' })
  })
})
