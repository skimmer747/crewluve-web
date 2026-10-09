import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { arrivalOf, departureOf, isHomecomingMove, type Leg } from '../../src/engine/legs'
import { A, M, engineFor } from '../fixtures/engine'

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
})
