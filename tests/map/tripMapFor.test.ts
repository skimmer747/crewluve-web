import { describe, expect, it } from 'vitest'
import type { Leg } from '../../src/engine/legs'
import type { Snapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { tripLegs, tripMapFor } from '../../src/map/tripMapFor'
import { AIRPORTS, at, drive, EUROPE, flight, ground } from './tripMapLegs'

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

  it('shows the recap at home for a day after a trip, with its days (Stage 2 spec §8.1)', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    const map = tripMapFor(snap('home', at(75), { upcomingTrip, recap: { tripId: 'T1', days: 4 } }), LEGS, AIRPORTS)!
    expect(map.mode).toEqual({ kind: 'recap' })
    expect(map.legs.map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
    expect(map.days).toBe(4)
  })

  it('leaves out of the recap a drive after the trip that hasn’t happened yet, so the recap reads as over (Stage 2 spec §8.2)', () => {
    const later = [...LEGS, drive('d9', 'SDF', 'LEX', 80, 1)]
    const map = tripMapFor(snap('home', at(75), { recap: { tripId: 'T1', days: 4 } }), later, AIRPORTS)!
    expect(map.legs.map((l) => l.id)).toEqual(['d0', 'f1', 'f2', 'f3'])
    expect(map.span.end).toBeLessThanOrEqual(at(75))
  })

  it('carries the next trip’s and the trip under way’s days', () => {
    const upcomingTrip = { tripId: 'T2', departs: at(200), days: 1, route: ['SDF', 'ANC'], delayMinutes: null }
    expect(tripMapFor(snap('home', at(150), { upcomingTrip }), LEGS, AIRPORTS)!.days).toBe(1)
    const tripProgress = { tripId: 'T1', day: 1, days: 4, upcoming: ['DXB', 'SDF'] }
    expect(tripMapFor(snap('layover', at(12), { tripProgress }), LEGS, AIRPORTS)!.days).toBe(4)
  })
})

describe("a trip's ground legs (activity markers design §2.2)", () => {
  it("come with its moving legs to name its waits, and no other trip's do", () => {
    const legs = [flight('f1', 'SDF', 'CGN', 0, 8), ground('l1', 'layover', 'CGN', 8, 24), flight('f2', 'CGN', 'DXB', 32, 6), ground('l2', 'layover', 'DXB', 38, 20, 'T2')]
    expect(tripLegs(legs, 'T1').map((l) => l.id)).toEqual(['f1', 'l1', 'f2'])
  })
})
