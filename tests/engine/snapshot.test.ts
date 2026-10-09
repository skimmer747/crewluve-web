import { describe, expect, it, vi } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot, safeSnapshot } from '../../src/engine/snapshot'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const e = engineFor(demoRaw('driver', A))
const snap = (minutes: number) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('makeSnapshot on the demo timeline', () => {
  it('rings the current flight, report window, layover, or duty — never a turn', () => {
    expect(snap(100).ring).toBeCloseTo(40 / 90)
    expect(snap(30).ring).toBeCloseTo(0.5)
    expect(snap(180).ring).toBeNull()
    expect(snap(4500).ring).toBeCloseTo(0.25)
  })

  it('flags a 15+ minute delay on the flight that matters now', () => {
    expect(snap(1700).delay?.minutes).toBe(40) // in the air on the late leg
    expect(snap(1300).delay?.minutes).toBe(40) // on the layover before it
    expect(snap(100).delay).toBeNull()
  })

  it('celebrates inside the last 24 hours away', () => {
    expect(snap(1700).celebrate).toBe(true)
    expect(snap(100).celebrate).toBe(false)
    expect(snap(30).celebrate).toBe(false) // at base
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
      new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
        days: 2,
        dutyPeriods: [
          { start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150 }, { dep: 'RFD', arr: 'SDF', out: 200, in: 290 }] },
          { start: 1300, end: 1700, flights: [{ dep: 'SDF', arr: 'ANC', out: 1360, in: 1660 }] },
        ],
      }).build(),
      A,
    )
    const sn = makeSnapshot(s, buildLegs(s), at(600), NY)
    expect(sn.status.kind).toBe('home')
    expect(sn.midTripAtHome).toBe(true)
    expect(sn.daysHome).toBeNull()
    expect(sn.lastTripDays).toBeNull()
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

  it('safeSnapshot turns an engine crash into the "On duty" status', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sn = safeSnapshot(e.schedule, null as unknown as Leg[], A, NY)
    expect(sn.status.kind).toBe('unknown')
    expect(sn.arrival).toBeNull()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
