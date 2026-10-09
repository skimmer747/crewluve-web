import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { resolveStatus } from '../../src/engine/status'
import { A, at, engineFor } from '../fixtures/engine'
import { H, drive, duty, flight, pilot, place, sorted } from '../fixtures/legs'

const commuter = pilot('LEX', 'SDF')
const local = pilot(null, 'SDF') // home = base

describe('resolveStatus: a leg covers now', () => {
  it('is in flight while a flight or jumpseat covers now', () => {
    expect(resolveStatus([flight('SDF', 'ANC', 1, 6)], commuter, 2 * H)).toMatchObject({ kind: 'inFlight', airport: 'SDF' })
    expect(resolveStatus([flight('SDF', 'LEX', 1, 2, null)], commuter, 1.5 * H).kind).toBe('inFlight')
  })

  it('gives ground transport its own status', () => {
    expect(resolveStatus([flight('SDF', 'LOU', 1, 2, 'T1', { ground: true })], commuter, 1.5 * H).kind).toBe('ground')
  })

  it('drives home or to work', () => {
    expect(resolveStatus([drive('SDF', 'LEX', true, 1, 2)], commuter, 1.5 * H).kind).toBe('drivingHome')
    expect(resolveStatus([drive('LEX', 'SDF', false, 1, 2)], commuter, 1.5 * H).kind).toBe('drivingToWork')
  })

  it('reports at base, or is off when the trip starts elsewhere', () => {
    expect(resolveStatus([place('report', 'SDF', 0, 1)], commuter, 0.5 * H)).toMatchObject({ kind: 'base', airport: 'SDF' })
    expect(resolveStatus([place('report', 'MIA', 0, 1)], commuter, 0.5 * H)).toMatchObject({ kind: 'off', airport: 'MIA' })
  })

  it.each(['turn', 'layover', 'base', 'home'] as const)('uses the %s leg', (kind) => {
    expect(resolveStatus([place(kind, 'ANC', 0, 5)], commuter, 1 * H)).toMatchObject({ kind, airport: 'ANC' })
  })

  it('is on duty at the event airport, or at base when the event has none', () => {
    expect(resolveStatus([duty('reserve', 'RSV-A', 'MIA', 0, 12)], commuter, 1 * H)).toMatchObject({ kind: 'reserve', airport: 'MIA' })
    expect(resolveStatus([duty('event', 'Meeting', null, 0, 2)], commuter, 1 * H)).toMatchObject({ kind: 'event', airport: 'SDF' })
  })

  it('prefers a flight over an overlapping layover, and a drive over an overlapping event', () => {
    expect(resolveStatus(sorted([place('layover', 'ANC', 0, 10), flight('ANC', 'FAI', 2, 3, null)]), commuter, 2.5 * H).kind).toBe('inFlight')
    expect(resolveStatus(sorted([duty('event', 'Errands', 'LEX', 0, 5), drive('LEX', 'SDF', false, 1, 2)]), commuter, 1.5 * H).kind).toBe('drivingToWork')
  })
})

describe('resolveStatus: between legs (ported from TripStateResolverGapTests.swift)', () => {
  it('is home with no legs at all', () => {
    expect(resolveStatus([], commuter, 0)).toMatchObject({ kind: 'home', airport: 'LEX' })
  })

  it('end of trip at home → home', () => {
    expect(resolveStatus(sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'LEX', 20, 25)]), commuter, 30 * H)).toMatchObject({ kind: 'home', airport: 'LEX' })
  })

  it('end of trip at base, commuter → base', () => {
    expect(resolveStatus([flight('ANC', 'SDF', 0, 5)], commuter, 8 * H)).toMatchObject({ kind: 'base', airport: 'SDF' })
  })

  it('end of trip elsewhere → off in that city, never layover or base', () => {
    expect(resolveStatus([flight('SDF', 'MIA', 0, 3)], commuter, 8 * H)).toMatchObject({ kind: 'off', airport: 'MIA' })
    expect(resolveStatus([flight('SDF', 'MIA', 0, 3)], pilot('LEX', null), 8 * H)).toMatchObject({ kind: 'off', airport: 'MIA' })
  })

  it('end of trip at base when home equals base → home', () => {
    expect(resolveStatus([flight('ANC', 'SDF', 0, 5)], local, 8 * H)).toMatchObject({ kind: 'home', airport: 'SDF' })
  })

  it('compares codes after normalizing them (Crewluve compares case-insensitively)', () => {
    const e = engineFor(
      new RawBuilder(A).pilot('Alex', 'sdf', 'lex').trip('t1', {
        dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'anc', arr: 'sdf', out: 30, in: 270 }] }],
      }).build(),
    )
    expect(resolveStatus(e.legs, e.schedule.pilot, at(400)).kind).toBe('base')
  })

  it('a gap inside one trip with no place leg is a turn', () => {
    expect(resolveStatus(sorted([flight('SDF', 'RFD', 0, 1), flight('RFD', 'ANC', 3, 8)]), commuter, 2 * H)).toMatchObject({ kind: 'turn', airport: 'RFD' })
  })

  it('jumpseated home before the next trip → home', () => {
    expect(resolveStatus(sorted([flight('SDF', 'LEX', 0, 1, null), flight('LEX', 'ANC', 7, 12, 'T2')]), commuter, 3 * H).kind).toBe('home')
  })

  it('jumpseated to base before the next trip → base', () => {
    expect(resolveStatus(sorted([flight('LEX', 'SDF', 0, 1, null), flight('SDF', 'ANC', 7, 12, 'T2')]), commuter, 3 * H).kind).toBe('base')
  })

  it('a same-trip turn through home stays a turn', () => {
    expect(resolveStatus(sorted([flight('SDF', 'LEX', 0, 1), flight('LEX', 'ANC', 3, 8)]), commuter, 2 * H).kind).toBe('turn')
  })

  it('a same-trip turn through base stays a turn', () => {
    expect(resolveStatus(sorted([flight('MIA', 'SDF', 0, 2), flight('SDF', 'ANC', 4, 9)]), commuter, 3 * H).kind).toBe('turn')
  })

  it('waiting at base for a jumpseat home → commuting home', () => {
    expect(resolveStatus(sorted([flight('ANC', 'SDF', 0, 5), flight('SDF', 'LEX', 7, 8, null)]), commuter, 6 * H)).toMatchObject({ kind: 'commutingHome', airport: 'SDF' })
  })

  it('between two standalone legs elsewhere → off, not a turn (fixes TripStateResolver.swift:469)', () => {
    expect(resolveStatus(sorted([flight('LEX', 'ATL', 0, 1, null), flight('ATL', 'MIA', 3, 4, null)]), commuter, 2 * H)).toMatchObject({ kind: 'off', airport: 'ATL' })
  })

  it('remembers the previous and next legs', () => {
    const legs = sorted([flight('SDF', 'ANC', 0, 5), flight('ANC', 'SDF', 20, 25)])
    const status = resolveStatus(legs, commuter, 10 * H)
    expect(status.previous?.id).toBe(legs[0].id)
    expect(status.next?.id).toBe(legs[1].id)
  })

  it('an event with no airport does not move the pilot to the base afterwards', () => {
    const e = engineFor(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t1', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'LEX', out: 60, in: 120 }] }] })
        .manualEvent('vac', 'Vacation', 1440, 7200, null)
        .build(),
    )
    expect(resolveStatus(e.legs, e.schedule.pilot, at(720))).toMatchObject({ kind: 'home', airport: 'LEX' })
    expect(resolveStatus(e.legs, e.schedule.pilot, at(3000))).toMatchObject({ kind: 'event', airport: 'SDF' }) // during it: "at its location or the base"
    expect(resolveStatus(e.legs, e.schedule.pilot, at(8640))).toMatchObject({ kind: 'home', airport: 'LEX' })
  })

  it('is home when the only leg that ever ended has no airport', () => {
    expect(resolveStatus([duty('event', 'Vacation', null, 0, 5)], commuter, 10 * H)).toMatchObject({ kind: 'home', airport: 'LEX' })
    expect(resolveStatus([duty('event', 'Vacation', null, 0, 5)], local, 10 * H)).toMatchObject({ kind: 'home', airport: 'SDF' })
  })
})

describe('resolveStatus: delays move the status (spec §6.11: C1, C16, C24)', () => {
  const e = engineFor(
    new RawBuilder(A).pilot('Alex', 'SDF', 'LEX').trip('t1', {
      dutyPeriods: [{
        start: 0,
        end: 600,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 60, in: 150 },
          { dep: 'RFD', arr: 'ANC', out: 225, in: 555, actualOut: 265, actualIn: 595 }, // 40 minutes late both ways
        ],
      }],
    }).build(),
  )

  it('is still on the ground past the scheduled departure of a delayed flight', () => {
    expect(resolveStatus(e.legs, e.schedule.pilot, at(240)).kind).toBe('turn')
  })

  it('is still flying past the scheduled arrival of a delayed flight', () => {
    expect(resolveStatus(e.legs, e.schedule.pilot, at(570)).kind).toBe('inFlight')
  })
})
