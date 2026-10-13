import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { MoveLeg } from '../../src/engine/legs'
import { makeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { flightProgress, inFlightFacts } from '../../src/ui/inFlightFacts'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor, M } from '../fixtures/engine'
import { flight } from '../fixtures/legs'

const NY = 'America/New_York'
const driver = engineFor(demoRaw('driver', A))
const jumpseater = engineFor(demoRaw('jumpseater', A))
const snapAt = (minutes: number, e = driver) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('inFlightFacts', () => {
  it('describes the flight under way: Louisville to Rockford, UPS 2961', () => {
    const facts = inFlightFacts(snapAt(100), testAirports)!
    expect(facts.dep).toEqual({ code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lng: -85.7382 }, timeZone: 'America/Kentucky/Louisville' })
    expect(facts.arr.city).toBe('Rockford')
    expect([facts.start, facts.end]).toEqual([at(60), at(150)])
    expect(facts.blockMs).toBe(90 * M)
    expect(facts.delayMinutes).toBeNull()
    expect(facts.flightNumber).toBe('UPS2961')
    expect(facts.trackingNumber).toBe('UPS2961')
    expect(facts.links?.flightAware).toBe('https://www.flightaware.com/live/flight/UPS2961')
  })

  it('moves the flight to its estimated times, keeps the scheduled block time, and notes a 40-minute delay', () => {
    const facts = inFlightFacts(snapAt(1700), testAirports)!
    expect([facts.dep.code, facts.arr.code]).toEqual(['ANC', 'SDF'])
    expect([facts.start, facts.end]).toEqual([at(1600), at(1900)])
    expect(facts.blockMs).toBe(300 * M)
    expect(facts.delayMinutes).toBe(40)
  })

  it('gives the snapshot’s delay, the one the sentence reads', () => {
    const air = snapAt(100)
    const late: Snapshot = { ...air, delay: { flight: air.status.current as MoveLeg, minutes: 25 } }
    expect(inFlightFacts(late, testAirports)!.delayMinutes).toBe(25)
  })

  it('takes the delay from the departure, not from the landing', () => {
    const late = engineFor(new RawBuilder(A).pilot('Sam', 'SDF', null).trip('t1', {
      dutyPeriods: [{
        start: 0, end: 600, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150, actualOut: 100, actualIn: 160 }],
      }],
    }).build())
    expect(inFlightFacts(snapAt(120, late), testAirports)!.delayMinutes).toBe(40)
  })

  it('covers a jumpseat too, with its airline’s number and ICAO code', () => {
    const facts = inFlightFacts(snapAt(-240, jumpseater), testAirports)!
    expect([facts.dep.code, facts.arr.code]).toEqual(['MCO', 'SDF'])
    expect(facts.flightNumber).toBe('DL1234')
    expect(facts.trackingNumber).toBe('DAL1234')
  })

  it('is null on the ground and during ground transport', () => {
    expect(inFlightFacts(snapAt(180), testAirports)).toBeNull() // the turn in Rockford
    const air = snapAt(100)
    const ground: Snapshot = { ...air, status: { ...air.status, kind: 'ground', current: flight('SDF', 'LEX', 0, 1, 'T1', { ground: true }) } }
    expect(inFlightFacts(ground, testAirports)).toBeNull()
  })

  // The next three swap another leg into the snapshot's status and leave its delay behind. That's fine for what they
  // check, but the engine never makes such a snapshot, so they shouldn't check the delay.
  it('keeps the code as the city, and no place or zone, for an airport the list doesn’t have', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'ZZZ', 0, 2)
    const facts = inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!
    expect(facts.arr).toEqual({ code: 'ZZZ', city: 'ZZZ', place: null, timeZone: null })
  })

  it('has no flight number or links without digits', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'RFD', 0, 2, 'T1', { number: null })
    const facts = inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!
    expect([facts.flightNumber, facts.trackingNumber, facts.links]).toEqual([null, null, null])
  })

  it('keeps the digits as the popup’s number without an airline, so the flight number still opens it, with no links', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'RFD', 0, 2, 'T1', { airline: null })
    const facts = inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!
    expect([facts.flightNumber, facts.trackingNumber, facts.links]).toEqual(['100', '100', null])
    // An airline code with more than letters and digits gets no tracking links, but the popup still opens.
    const odd = inFlightFacts({ ...air, status: { ...air.status, current: { ...leg, airline: 'U/S' } } }, testAirports)!
    expect([odd.flightNumber, odd.trackingNumber, odd.links]).toEqual(['U/S100', 'U/S100', null])
  })
})

describe('flightProgress', () => {
  const facts = inFlightFacts(snapAt(100), testAirports)!

  it('runs from 0 at the estimated departure to 1 at landing', () => {
    expect(flightProgress(facts, at(60))).toBe(0)
    expect(flightProgress(facts, at(105))).toBeCloseTo(0.5, 9)
    expect(flightProgress(facts, at(150))).toBe(1)
  })

  it('is null before departure and after landing', () => {
    expect(flightProgress(facts, at(59))).toBeNull()
    expect(flightProgress(facts, at(151))).toBeNull()
  })
})
