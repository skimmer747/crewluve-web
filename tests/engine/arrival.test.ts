import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import type { Leg } from '../../src/engine/legs'
import { resolveStatus } from '../../src/engine/status'
import { arrivalTarget, currentTripId } from '../../src/engine/targets'
import type { Pilot } from '../../src/engine/types'
import { A, M, at, engineFor } from '../fixtures/engine'
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
    const legs = sorted([flight('SDF', 'RFD', 0, 1), flight('RFD', 'SDF', 2, 3), flight('SDF', 'ANC', 20, 25), flight('ANC', 'SDF', 40, 45)])
    expect(targetAtHour(legs, local, 0.5)).toMatchObject({ label: 'home', time: 45 * H, airport: 'SDF' })
  })

  it('commuter with no ride logged: back at base, then no countdown at all (C26)', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25)])
    expect(targetAtHour(legs, commuter, 1)).toMatchObject({ label: 'base', time: 25 * H, airport: 'SDF' })
    expect(targetAtHour(legs, commuter, 26)).toBeNull()
  })

  it('never borrows the next trip’s homecoming (C14)', () => {
    const legs = sorted([
      flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25),
      flight('SDF', 'MIA', 45, 47, 'T2'), flight('MIA', 'SDF', 60, 62, 'T2'), drive('SDF', 'LEX', true, 63, 64),
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
})

describe('currentTripId', () => {
  it('is the trip being flown, then one that ended within a day, then one starting within a day', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5, 'T1'), flight('SDF', 'MIA', 60, 62, 'T2')])
    const p = pilot('LEX', 'SDF')
    const tripAt = (hours: number) => currentTripId(resolveStatus(legs, p, hours * H), hours * H)
    expect(tripAt(1)).toBe('T1')
    expect(tripAt(20)).toBe('T1')
    expect(tripAt(30)).toBeNull()
    expect(tripAt(40)).toBe('T2')
  })
})
