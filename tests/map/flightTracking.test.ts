import { describe, expect, it } from 'vitest'
import { buildLegs } from '../../src/engine/legs'
import { scheduledTakeoff } from '../../src/map/flightProgress'
import { hasReturned, isAtDeparture, isAtGate } from '../../src/map/mapFlight'
import { isBySchedule, isSeenAtDeparture, legAtDeparture, legTracking } from '../../src/map/flightTracking'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeTripMap, type MapLeg, type TripMap } from '../../src/map/tripMap'
import { atTheGate, backAtTheGate, FLYING, LANDED_EARLY, LIVE_AIRPORTS, liveTripMap, SCHEDULE } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

/**
 * The made-up flight, Louisville to Philadelphia from noon to 2 PM (liveTrip.ts): the schedule's plane takes off 15
 * minutes after the gate, and so does the plan's.
 */
const when = (minutes: number) => START + minutes * MINUTE
const flightOf = (map: TripMap): MapLeg => map.legs.find((l) => l.kind === 'flight')!
/** The flight at `minutes`, with `live` as Crewlu Cloud's answer for it, or none. */
const legAt = (minutes: number, live: LiveFlight | null) => flightOf(liveTripMap(when(minutes), live))
/** The flight at `minutes` while Crewlu Cloud's first answer is on its way. */
const awaiting = (minutes: number) =>
  flightOf(makeTripMap(buildLegs(SCHEDULE), { isNextTrip: false, home: 'SDF', now: when(minutes), airports: LIVE_AIRPORTS, isAwaitingLive: true })!)

describe('how a flight is known now (live or scheduled design §2)', () => {
  it('is live while Crewlu Cloud saw the plane in the last 3 minutes: at its gate, in the air or landed', () => {
    expect(legTracking(legAt(5, atTheGate(5)), when(5))).toBe('live')
    expect(legTracking(legAt(59, FLYING), when(59))).toBe('live')
    expect(legTracking(legAt(103, LANDED_EARLY), when(103))).toBe('live')
  })

  it('is a best guess once a plane last seen in the air hasn’t been for over 3 minutes', () => {
    // FLYING's last fix is 58 minutes in.
    expect(legTracking(legAt(62, FLYING), when(62))).toBe('bestGuess')
  })

  it('isn’t tracked with no live data, or with a fix on the ground over 3 minutes old', () => {
    expect(legTracking(legAt(30, null), when(30))).toBe('notTracked')
    // Seen at its gate at 4 min 40 s: 4 min 20 s before.
    expect(legTracking(legAt(9, atTheGate(5)), when(9))).toBe('notTracked')
  })

  it('is waiting while Crewlu Cloud hasn’t answered since the page opened', () => {
    expect(legTracking(awaiting(30), when(30))).toBe('waiting')
    const answered = makeTripMap(buildLegs(SCHEDULE), { isNextTrip: false, home: 'SDF', now: when(30), airports: LIVE_AIRPORTS })!
    expect('isAwaitingLive' in flightOf(answered)).toBe(false)
  })

  it('is by the schedule alone when not tracked or waiting', () => {
    expect(isBySchedule('notTracked')).toBe(true)
    expect(isBySchedule('waiting')).toBe(true)
    expect(isBySchedule('live')).toBe(false)
    expect(isBySchedule('bestGuess')).toBe(false)
  })
})

describe('on the ground at departure (live or scheduled design §3)', () => {
  it('is due, by the schedule alone, until the schedule’s takeoff 15 minutes after the gate', () => {
    expect(scheduledTakeoff(SCHEDULE.trips[0].start, SCHEDULE.trips[0].end)).toBe(when(15))
    expect(legAtDeparture(legAt(5, null), when(5))).toBe('due')
    expect(legAtDeparture(awaiting(14), when(14))).toBe('due')
    expect(legAtDeparture(legAt(15, null), when(15))).toBeNull()
    // A fix on the ground gone stale is the schedule's again.
    expect(legAtDeparture(legAt(9, atTheGate(5)), when(9))).toBe('due')
  })

  it('is the real plane at its gate before the plan’s takeoff, still there after it, or back after an air return', () => {
    expect(legAtDeparture(legAt(5, atTheGate(5)), when(5))).toBe('atGate')
    expect(legAtDeparture(legAt(25, atTheGate(25)), when(25))).toBe('stillAtGate')
    expect(legAtDeparture(legAt(45, backAtTheGate(45)), when(45))).toBe('returned')
  })

  it('is none in the air, out of sight, landed, before the gate time, or by the schedule after its takeoff', () => {
    expect(legAtDeparture(legAt(59, FLYING), when(59))).toBeNull()
    expect(legAtDeparture(legAt(62, FLYING), when(62))).toBeNull()
    expect(legAtDeparture(legAt(103, LANDED_EARLY), when(103))).toBeNull()
    expect(legAtDeparture(legAt(-10, null), when(-10))).toBeNull()
    expect(legAtDeparture(legAt(30, null), when(30))).toBeNull()
  })

  it('gives a block too short for the taxi allowances its takeoff at the gate', () => {
    expect(scheduledTakeoff(START, START + 20 * MINUTE)).toBe(START)
    const short: MapLeg = { ...legAt(5, null), end: START + 20 * MINUTE }
    expect(legAtDeparture(short, when(5))).toBeNull()
  })

  it('is seen at departure for the real plane, never for the schedule’s', () => {
    expect(isSeenAtDeparture('atGate')).toBe(true)
    expect(isSeenAtDeparture('stillAtGate')).toBe(true)
    expect(isSeenAtDeparture('returned')).toBe(true)
    expect(isSeenAtDeparture('due')).toBe(false)
    expect(isSeenAtDeparture(null)).toBe(false)
  })
})

describe('the live plane at departure, asked three ways (live or scheduled design §3)', () => {
  it.each([
    ['atGate', 5, atTheGate(5)],
    ['stillAtGate', 25, atTheGate(25)],
    ['returned', 45, backAtTheGate(45)],
    [null, 59, FLYING],
  ] as const)('agrees with legAtDeparture for %s at minute %i', (expected, minutes, live) => {
    const leg = legAt(minutes, live)
    const flight = leg.flight!
    expect(legAtDeparture(leg, when(minutes))).toBe(expected)
    expect(isAtGate(flight, when(minutes))).toBe(expected === 'atGate')
    expect(isAtDeparture(flight, when(minutes))).toBe(expected === 'stillAtGate' || expected === 'returned')
    expect(hasReturned(flight, when(minutes))).toBe(expected === 'returned')
  })
})
