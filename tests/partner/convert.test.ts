import { describe, expect, it } from 'vitest'
import { buildLegs, departureOf } from '../../src/engine/legs'
import { makeSnapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { tripDays } from '../../src/engine/trips'
import { scheduleFromStored, toSchedule, waitingSchedule } from '../../src/partner/convert'
import { readSummary, type PartnerSummary, type SummaryLeg } from '../../src/partner/summary'
import { example, EXAMPLES, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const BASE_TZ = 'America/Kentucky/Louisville'

/** An example's summary for partner A or B, its schedule and legs, and the snapshot at the example's own moment. */
function engineAt(name: string, who: 'A' | 'B' = 'A') {
  const summary = readSummary(example(name, who), who === 'A' ? PARTNER_A : PARTNER_B)!
  const schedule = toSchedule(summary, summary.lastUpdated)
  const legs = buildLegs(schedule)
  // makeSnapshot, not safeSnapshot: an engine error must fail the test, not fall back to "On duty".
  return { summary, schedule, legs, snap: makeSnapshot(schedule, legs, summary.lastUpdated, BASE_TZ) }
}

describe('toSchedule: the examples through the website engine (piece 5a §11)', () => {
  const KINDS: Array<[string, StatusKind, string]> = [
    ['home', 'home', 'ATL'],
    ['hidden-trip-left-out', 'home', 'ATL'],
    ['display-names', 'home', 'ATL'],
    ['turn', 'turn', 'RFD'],
    ['in-flight', 'inFlight', 'RFD'],
    ['layover', 'layover', 'ONT'],
    ['quick-status-everyone', 'layover', 'ONT'],
    ['quick-status-one-partner', 'layover', 'ONT'],
    ['commuting-home', 'commutingHome', 'SDF'],
  ]

  it('covers every example', () => {
    expect(KINDS.map(([name]) => name).sort()).toEqual([...EXAMPLES].sort())
  })

  it.each(KINDS)('reads %s as %s at %s, for both partners', (name, kind, airport) => {
    for (const who of ['A', 'B'] as const) {
      const { snap } = engineAt(name, who)
      expect(snap.status.kind).toBe(kind)
      expect(snap.status.airport).toBe(airport)
    }
  })

  it.each([...EXAMPLES])("makes CrewLu's own legs again for %s: the same kinds, times and airports", (name) => {
    const { summary, legs } = engineAt(name)
    const crewlu = summary.legs
      .map((l) => ({
        kind: l.type === 'flight' && !l.tripId ? 'jumpseat' : l.type,
        start: l.start,
        end: l.end,
        airport: l.type === 'flight' ? l.departureAirport : l.airportCode,
      }))
      .sort((a, b) => a.start - b.start)
    expect(legs.map((l) => ({ kind: l.kind, start: l.start, end: l.end, airport: departureOf(l) }))).toEqual(crewlu)
  })

  it('splits the trip into duty periods at the layover, and takes its length from CrewLu', () => {
    const [trip] = engineAt('layover').schedule.trips
    expect(trip.dutyPeriods.map((dp) => dp.flights.map((f) => `${f.dep}-${f.arr}`))).toEqual([['SDF-RFD', 'RFD-ONT'], ['ONT-SDF']])
    expect(trip).toMatchObject({ id: 'Z55120', start: 1792537200000, end: 1792652700000, days: 2 })
  })

  it('reads the company flights and the jumpseats as the rows did', () => {
    const { schedule } = engineAt('layover')
    expect(schedule.trips[0].dutyPeriods[0].flights[0]).toMatchObject({ airline: '5X', enteredAirline: null, number: '2961', deadhead: false, ground: false })
    expect(schedule.jumpseats.map((j) => [j.dep, j.arr, j.airline, j.enteredAirline, j.number, j.deadhead])).toEqual([
      ['ATL', 'SDF', 'DL', 'DL', '1180', true],
      ['SDF', 'ATL', 'DL', 'DL', '2215', true],
    ])
  })

  it('names the pilot as the partner sees them, and dates the schedule by the summary', () => {
    expect(engineAt('display-names', 'A').snap.name).toBe('Dad')
    expect(engineAt('display-names', 'B').snap.name).toBe('Alex')
    expect(engineAt('home').schedule).toMatchObject({
      pilot: { firstName: 'Alex', base: 'SDF', home: 'ATL', effHome: 'ATL' },
      newestUpdatedAt: 1792425600000,
      empty: false,
    })
  })
})

const SUMMARY: PartnerSummary = { pilotId: 'P', name: 'Alex', home: 'ATL', base: 'SDF', lastUpdated: 0, legs: [], quickStatuses: [] }
const leg = (fields: Partial<SummaryLeg>): SummaryLeg => ({
  id: 'leg', tripId: null, type: 'flight', start: 0, end: 3_600_000, airportCode: null, flightNumber: null, departureAirport: null,
  arrivalAirport: null, tripTotalDays: null, delayMinutes: null, airlineCode: null, label: null, ...fields,
})
const scheduleOf = (...legs: SummaryLeg[]) => toSchedule({ ...SUMMARY, legs }, 0)
const tripFlight = (fields: Partial<SummaryLeg>) =>
  scheduleOf(leg({ tripId: 'T1', departureAirport: 'SDF', arrivalAirport: 'RFD', ...fields })).trips[0].dutyPeriods[0].flights[0]

describe('toSchedule: one leg at a time (piece 5a §6)', () => {
  it("moves both ends of a delayed flight, and keeps CrewLu's times as the schedule", () => {
    expect(tripFlight({ flightNumber: 'UPS2961', delayMinutes: 45 })).toMatchObject({ schedStart: 0, schedEnd: 3_600_000, start: 2_700_000, end: 6_300_000 })
  })

  it('moves an early flight the other way', () => {
    expect(tripFlight({ flightNumber: 'UPS2961', delayMinutes: -20 })).toMatchObject({ schedStart: 0, start: -1_200_000 })
  })

  it.each<[string, string | null, Record<string, unknown>]>([
    ['UPS2961', null, { airline: '5X', enteredAirline: null, number: '2961', deadhead: false, ground: false }],
    ['UPS0081', null, { airline: '5X', number: '81' }],
    ['DL1180', 'DL', { airline: 'DL', enteredAirline: 'DL', number: '1180', deadhead: true }],
    ['5X2961', null, { airline: '5X', number: '2961', deadhead: false }],
    ['UPSCML', null, { airline: null, number: null, deadhead: true }],
    ['GND', null, { airline: null, number: null, ground: true }],
    ['UPSXXXX', null, { airline: null, number: null, deadhead: false }],
    ['UPSGND', null, { airline: null, number: null, ground: true }],
    ['UPS 2961', null, { airline: '5X', number: '2961' }],
  ])('reads the trip flight %s, airline code %s', (flightNumber, airlineCode, expected) => {
    expect(tripFlight({ flightNumber, airlineCode })).toMatchObject(expected)
  })

  it("reads a jumpseat with no airline code as a company flight: the summary can't say it was a ticket", () => {
    expect(scheduleOf(leg({ departureAirport: 'ATL', arrivalAirport: 'SDF', flightNumber: '1180' })).jumpseats[0]).toMatchObject({ airline: '5X', number: '1180', deadhead: true })
  })

  it('drops a flight whose airports are not airport codes', () => {
    expect(scheduleOf(leg({ departureAirport: 'Somewhere', arrivalAirport: 'SDF' })).jumpseats).toEqual([])
  })

  it('takes a drive home from where it ends, or from its label', () => {
    const s = scheduleOf(
      leg({ id: 'commute-1', type: 'drive', departureAirport: 'SDF', arrivalAirport: 'LEX', label: 'Driving home' }),
      leg({ id: 'commute-2', type: 'drive', departureAirport: 'SDF', arrivalAirport: 'ATL', label: 'Driving to work' }),
      leg({ id: 'commute-3', type: 'drive', departureAirport: 'ATL', arrivalAirport: 'SDF', label: 'Driving to work' }),
    )
    expect(s.commutes.map((c) => [c.id, c.from, c.to, c.toHome])).toEqual([
      ['commute-1', 'SDF', 'LEX', true],
      ['commute-2', 'SDF', 'ATL', true],
      ['commute-3', 'ATL', 'SDF', false],
    ])
  })

  it('reads reserve, hot standby, training and other events, keeping a free-text place as the location', () => {
    const s = scheduleOf(
      leg({ id: 'me-1', type: 'reserve', label: 'RSV-A', airportCode: 'SDF' }),
      leg({ id: 'me-2', type: 'hotStandby', label: 'Hot Standby', airportCode: 'SDF' }),
      leg({ id: 'te-3', type: 'event', label: 'PC Training', airportCode: 'SDF' }),
      leg({ id: 'me-4', type: 'event', label: 'Driving the truck home', airportCode: 'Training Center' }),
    )
    expect(s.events.map((e) => [e.id, e.kind, e.title, e.airport, e.location])).toEqual([
      ['me-1', 'reserve', 'RSV-A', 'SDF', 'SDF'],
      ['me-2', 'hotStandby', 'Hot Standby', 'SDF', 'SDF'],
      ['te-3', 'training', 'PC Training', 'SDF', 'SDF'],
      ['me-4', 'event', 'Driving the truck home', null, 'Training Center'],
    ])
    // The website's own rule makes an event titled like a drive count as one (legs.ts, DRIVE_TITLE).
    expect(buildLegs(s).find((l) => l.id === 'me-4')).toMatchObject({ kind: 'event', driveLike: true })
  })

  it('drops unknown legs, legs that end as they start, and trip places with no trip', () => {
    const s = scheduleOf(
      leg({ type: 'unknown' }),
      leg({ departureAirport: 'ATL', arrivalAirport: 'SDF', start: 10, end: 10 }),
      leg({ type: 'layover', airportCode: 'ONT' }),
    )
    expect([s.trips, s.jumpseats, s.commutes, s.events]).toEqual([[], [], [], []])
  })

  it('leaves a trip under a day at 0 days, which tripDays counts from the dates', () => {
    const trip = scheduleOf(leg({ tripId: 'T1', departureAirport: 'SDF', arrivalAirport: 'RFD', tripTotalDays: 0 })).trips[0]
    expect(trip.days).toBe(0)
    expect(tripDays(trip, BASE_TZ)).toBe(1)
  })
})

describe('toSchedule: through the engine (piece 5a §6)', () => {
  const T0 = Date.UTC(2026, 9, 21, 12)
  const H = 3_600_000
  const flight = (id: string, dep: string, arr: string, from: number, to: number, fields: Partial<SummaryLeg> = {}) =>
    leg({ id, tripId: 'T1', departureAirport: dep, arrivalAirport: arr, flightNumber: 'UPS2961', start: T0 + from * H, end: T0 + to * H, ...fields })
  const night = (id: string, type: SummaryLeg['type'], airport: string, from: number, to: number) =>
    leg({ id, tripId: 'T1', type, airportCode: airport, start: T0 + from * H, end: T0 + to * H })

  it('keeps a turn going until a late flight leaves, and says how late', () => {
    const s = scheduleOf(
      flight('f1', 'SDF', 'RFD', 0, 1),
      night('t1', 'turn', 'RFD', 1, 2),
      flight('f2', 'RFD', 'ONT', 2, 6, { delayMinutes: 45 }),
    )
    const legs = buildLegs(s)
    const at = (hours: number) => makeSnapshot(s, legs, T0 + hours * H, BASE_TZ)
    expect(at(2.5).status.kind).toBe('turn')
    expect(at(2.5).delay?.minutes).toBe(45)
    expect(at(2.8).status.kind).toBe('inFlight')
  })

  it('makes the nights at home and at base again, with the kinds CrewLu gave them', () => {
    const s = scheduleOf(
      flight('f1', 'SDF', 'ATL', 0, 1),
      night('n1', 'home', 'ATL', 1, 20),
      flight('f2', 'ATL', 'SDF', 20, 21),
      night('n2', 'base', 'SDF', 21, 40),
      flight('f3', 'SDF', 'RFD', 40, 41),
    )
    expect(buildLegs(s).map((l) => l.kind)).toEqual(['flight', 'home', 'flight', 'base', 'flight'])
  })

  it('merges two duty periods when CrewLu wrote no night between them, as spec §6 notes', () => {
    const s = scheduleOf(flight('f1', 'SDF', 'RFD', 0, 1), flight('f2', 'RFD', 'ONT', 30, 34))
    expect(buildLegs(s).map((l) => l.kind)).toEqual(['flight', 'turn', 'flight'])
  })

  it('drops a night with no flight after it, as spec §6 notes', () => {
    const s = scheduleOf(flight('f1', 'SDF', 'ONT', 0, 4), night('n1', 'layover', 'ONT', 4, 20))
    expect(buildLegs(s).map((l) => l.kind)).toEqual(['flight'])
  })

  it('reads odd summaries without throwing anywhere in the engine', () => {
    const odd: SummaryLeg[][] = [
      [],
      [flight('f1', 'SDF', 'RFD', 0, 1)],
      [night('n1', 'layover', 'ONT', 0, 10)],
      [flight('b', 'RFD', 'ONT', 0.5, 3), flight('a', 'SDF', 'RFD', 0, 1)],
    ]
    for (const legs of odd) {
      const s = scheduleOf(...legs)
      const built = buildLegs(s)
      for (let hours = -24; hours <= 24; hours++) expect(() => makeSnapshot(s, built, T0 + hours * H, BASE_TZ)).not.toThrow()
    }
  })
})

describe('waiting, and stored answers (piece 5a §5)', () => {
  it("waits before the pilot's first summary", () => {
    expect(waitingSchedule(5)).toMatchObject({ trips: [], empty: true, fetchedAt: 5, newestUpdatedAt: null })
  })

  it('shows a stored summary, dated when the door last answered', () => {
    const { schedule, summary } = scheduleFromStored({ partnerId: PARTNER_A, updatedAt: 'u1', status: example('layover'), checkedAt: 7 })
    expect(summary?.name).toBe('Alex')
    expect(schedule.fetchedAt).toBe(7)
    expect(schedule.trips).toHaveLength(1)
  })

  it('waits when the stored answer has no summary yet', () => {
    expect(scheduleFromStored({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 7 })).toEqual({ schedule: waitingSchedule(7), summary: null })
  })

  it('throws for a summary it cannot read', () => {
    expect(() => scheduleFromStored({ partnerId: PARTNER_A, updatedAt: 'u1', status: { schemaVersion: 2 }, checkedAt: 7 })).toThrow()
  })
})
