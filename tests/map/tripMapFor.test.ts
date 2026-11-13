import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import type { Snapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { tripLegs, tripMapFor } from '../../src/map/tripMapFor'
import { AIRPORTS, at, drive, EUROPE, flight } from './tripMapLegs'

/** Just the snapshot fields tripMapFor reads. */
function snap(kind: StatusKind, t: number, extra: Partial<Snapshot> = {}): Snapshot {
  return {
    t,
    pilot: { firstName: 'Alex', base: 'SDF', home: 'SDF', effHome: 'SDF' },
    status: { kind, airport: null, current: null, previous: null, next: null },
    upcomingTrip: null,
    tripProgress: null,
    ...extra,
  } as unknown as Snapshot
}

const LEGS: Leg[] = [drive('d0', 'LEX', 'SDF', -3, 1.5), ...EUROPE, flight('g1', 'SDF', 'ANC', 200, 6, 'T2')]

describe('which legs the trip map shows (moving map spec §5.1, §12)', () => {
  it("takes a trip's own flights and the commutes within 12 hours of them", () => {
    expect(tripLegs(LEGS, 'T1').map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
    expect(tripLegs(LEGS, 'nope')).toEqual([])
  })

  it('shows the next trip from home', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    const map = tripMapFor(snap('home', at(150), { upcomingTrip }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'nextTrip' })
    expect(map.legs.map((l) => l.id)).toEqual(['g1'])
  })

  it('shows nothing at home with no trip ahead', () => {
    expect(tripMapFor(snap('home', at(150)), LEGS, AIRPORTS)).toBeNull()
  })

  it('shows the trip under way', () => {
    const tripProgress = { tripId: 'T1', day: 1, days: 4, upcoming: ['DXB', 'SDF'] }
    const map = tripMapFor(snap('layover', at(12), { tripProgress }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'onTrip' })
    expect(map.legs.map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
  })

  it('falls back to the leg in motion when no trip covers now, such as a commute home', () => {
    const jumpseat = { ...flight('j1', 'CGN', 'SDF', 80, 9, null), kind: 'jumpseat' as const }
    const s = snap('commutingHome', at(84))
    s.status.current = jumpseat
    const map = tripMapFor(s, [...LEGS, jumpseat], AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'inFlight', legId: 'j1' })
  })

  it('shows a night at home in the middle of a trip as that trip, under way', () => {
    const throughHome = [flight('h1', 'SDF', 'CGN', 0, 8), flight('h2', 'CGN', 'SDF', 20, 9), flight('h3', 'SDF', 'DXB', 48, 13)]
    const upcomingTrip = { tripId: 'T1', departs: at(48), days: 1, route: ['SDF', 'DXB'], delayMinutes: null }
    const map = tripMapFor(snap('home', at(36), { upcomingTrip, midTripAtHome: true }), throughHome, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'onTrip' })
    expect(map.legs.map((l) => l.id)).toEqual(['h1', 'h2', 'h3'])
  })
})
