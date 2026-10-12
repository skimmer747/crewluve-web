import { describe, expect, it } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import { makeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { flightProgress, inFlightFacts } from '../../src/ui/inFlightFacts'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor, M } from '../fixtures/engine'
import { flight, H } from '../fixtures/legs'

const NY = 'America/New_York'
const driver = engineFor(demoRaw('driver', A))
const jumpseater = engineFor(demoRaw('jumpseater', A))
const snapAt = (minutes: number, e = driver) => makeSnapshot(e.schedule, e.legs, at(minutes), NY)

describe('inFlightFacts', () => {
  it('describes the flight under way: Louisville to Rockford, UPS 2961', () => {
    const facts = inFlightFacts(snapAt(100), testAirports)!
    expect(facts.dep).toEqual({ code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' })
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

  it('takes the delay from the departure, not from the landing', () => {
    const air = snapAt(100)
    const leg = flight('SDF', 'RFD', 1, 3, 'T1', { schedStart: 1 * H - 40 * M, schedEnd: 3 * H - 10 * M })
    expect(inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!.delayMinutes).toBe(40)
  })

  it('notes a delay of 15 minutes or more, late or early, and none at 14', () => {
    const air = snapAt(100)
    const delay = (minutes: number) => {
      const leg = flight('SDF', 'RFD', 1, 3, 'T1', { schedStart: 1 * H - minutes * M, schedEnd: 3 * H - minutes * M })
      return inFlightFacts({ ...air, status: { ...air.status, current: leg } }, testAirports)!.delayMinutes
    }
    expect([delay(15), delay(14), delay(-14), delay(-15)]).toEqual([15, null, null, -15])
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
