import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { DRIVE_TITLE, arrivalOf, departureOf, isHomecomingMove, type Leg } from '../../src/engine/legs'
import { resolveStatus } from '../../src/engine/status'
import { A, M, at, engineFor } from '../fixtures/engine'

const brief = (legs: Leg[]) => legs.map((l) => `${l.kind}@${(l.start - A) / M}-${(l.end - A) / M}`)

describe('buildLegs', () => {
  const { legs } = engineFor(
    new RawBuilder(A)
      .pilot('Sam', 'SDF', null) // lives at base, so home = SDF
      .trip('t1', {
        dutyPeriods: [
          { start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150 }, { dep: 'RFD', arr: 'ANC', out: 225, in: 555 }] },
          { start: 1500, end: 1900, flights: [{ dep: 'ANC', arr: 'SDF', out: 1560, in: 1860 }] },
          { start: 2400, end: 2700, flights: [{ dep: 'SDF', arr: 'MIA', out: 2460, in: 2610 }] },
        ],
      })
      .jumpseat('j1', 'MIA', 'ATL', 2700, 2800)
      .commute('c1', 'SDF', 'LEX', 'toHome', 3000, 3070)
      .manualEvent('m1', 'Driving the truck home', 3100, 3200, 'LEX')
      .manualEvent('m2', 'HOT STANDBY', 3300, 3400, 'SDF')
      .build(),
  )

  it('builds the report window, flights, turn, and duty-period gaps, then standalone legs, in time order', () => {
    expect(brief(legs)).toEqual([
      'report@0-60', 'flight@60-150', 'turn@150-225', 'flight@225-555', 'layover@555-1560', 'flight@1560-1860',
      'home@1860-2460', 'flight@2460-2610', 'jumpseat@2700-2800', 'drive@3000-3070', 'event@3100-3200',
      'hotStandby@3300-3400',
    ])
  })

  it('marks drive-titled events', () => {
    const event = legs.find((l) => l.kind === 'event')
    expect(event && 'driveLike' in event && event.driveLike).toBe(true)
  })

  it('calls a mid-trip night at the base "base" for a commuter', () => {
    const { legs: commuter } = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [
          { start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'RFD', out: 30, in: 100 }, { dep: 'RFD', arr: 'SDF', out: 120, in: 190 }] },
          { start: 900, end: 1100, flights: [{ dep: 'SDF', arr: 'ANC', out: 960, in: 1060 }] },
        ],
      }).build(),
    )
    expect(brief(commuter)).toContain('base@190-960')
  })

  it('cuts a layover short at a jumpseat that departs during it', () => {
    const { legs: cut } = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
        dutyPeriods: [
          { start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 150 }] },
          { start: 1400, end: 1700, flights: [{ dep: 'ANC', arr: 'SDF', out: 1460, in: 1660 }] },
        ],
      }).jumpseat('j1', 'ANC', 'FAI', 800, 900).build(),
    )
    expect(brief(cut)).toContain('layover@150-800')
  })

  it('classifies duty-period gaps against the pilot base, not the trip base column', () => {
    const { schedule, legs: based } = engineFor(
      new RawBuilder(A).pilot('Alex', 'ANC', 'MCO').trip('t1', {
        base: 'SDF', // the trips table says SDF, but this pilot is based at ANC
        dutyPeriods: [
          { start: 0, end: 400, flights: [{ dep: 'ANC', arr: 'SDF', out: 60, in: 360 }] },
          { start: 1300, end: 1700, flights: [{ dep: 'SDF', arr: 'ANC', out: 1360, in: 1660 }] },
          { start: 2500, end: 2900, flights: [{ dep: 'ANC', arr: 'HKG', out: 2560, in: 2860 }] },
        ],
      }).build(),
    )
    expect(brief(based)).toContain('layover@360-1360') // a night at SDF
    expect(brief(based)).toContain('base@1660-2560') // a night at ANC
    expect(resolveStatus(based, schedule.pilot, at(30)).kind).toBe('base') // reporting at ANC
    expect(resolveStatus(based, schedule.pilot, at(800)).kind).toBe('layover')
    expect(resolveStatus(based, schedule.pilot, at(2000)).kind).toBe('base')
  })
})

describe('leg helpers', () => {
  const { legs } = engineFor(
    new RawBuilder(A)
      .pilot('Alex', 'SDF', 'LEX')
      .commute('c1', 'SDF', 'LEX', 'toHome', 0, 60)
      .manualEvent('e1', 'Vacation', 100, 200, 'LEX')
      .manualEvent('e2', 'Driving the car home', 300, 360, 'LEX')
      .build(),
  )
  const byId = (id: string) => legs.find((l) => l.id === id)!

  it('knows where each leg starts and ends', () => {
    expect(departureOf(byId('c1'))).toBe('SDF')
    expect(arrivalOf(byId('c1'))).toBe('LEX')
    expect(arrivalOf(byId('e1'))).toBe('LEX')
  })

  it('counts drives and drive-titled events as homecomings, never other events at home', () => {
    expect(isHomecomingMove(byId('c1'), 'LEX')).toBe(true)
    expect(isHomecomingMove(byId('e2'), 'LEX')).toBe(true)
    expect(isHomecomingMove(byId('e1'), 'LEX')).toBe(false)
    expect(isHomecomingMove(byId('c1'), null)).toBe(false)
  })

  it('treats a drive that arrives at home as a drive home and a homecoming, whatever its direction label says', () => {
    const { schedule, legs: labelled } = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').commute('c-work', 'SDF', 'LEX', 'toWork', 0, 60).build(),
    )
    expect(schedule.commutes[0].toHome).toBe(true)
    expect(resolveStatus(labelled, schedule.pilot, at(30)).kind).toBe('drivingHome')
    expect(isHomecomingMove(labelled[0], 'LEX')).toBe(true)
  })

  it('uses one rule for the status and for homecomings when a drive labelled toHome ends elsewhere (spec §6.3: arrives home OR is labelled toHome)', () => {
    const { schedule, legs: odd } = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').commute('c-odd', 'SDF', 'MIA', 'toHome', 0, 60).build(),
    )
    expect(resolveStatus(odd, schedule.pilot, at(30)).kind).toBe('drivingHome')
    expect(isHomecomingMove(odd[0], 'LEX')).toBe(true)
  })
})

describe('drive-titled events', () => {
  const titles: Array<[string, boolean]> = [
    ['Drive home', true], ['Truck to SDF', true], ['Driving the car home', true],
    ['Daycare pickup', false], ['Card night', false], ['Oscar party', false], ['Medicare appointment', false],
  ]

  it.each(titles)('%s → drive-like: %s', (title, expected) => {
    expect(DRIVE_TITLE.test(title)).toBe(expected)
    const { legs } = engineFor(new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').manualEvent('e', title, 100, 200, 'LEX').build())
    const event = legs.find((l) => l.id === 'e')
    expect(event && 'driveLike' in event && event.driveLike).toBe(expected)
    expect(isHomecomingMove(event!, 'LEX')).toBe(expected)
  })
})
