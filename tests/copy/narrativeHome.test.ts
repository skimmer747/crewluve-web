import { describe, expect, it } from 'vitest'
import { narrative, type Span } from '../../src/copy/narrative'
import { demoRaw } from '../../src/data/demo'
import { RawBuilder, type FlightSpec } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import { makeSnapshot } from '../../src/engine/snapshot'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor } from '../fixtures/engine'

const NY = 'America/New_York'
const plain = (spans: Span[]) => spans.map((s) => s.text).join('')

function homeSentence(raw: RawSchedule, minutes = 0): Span[] {
  const e = engineFor(raw)
  return narrative(makeSnapshot(e.schedule, e.legs, at(minutes), NY), { now: at(minutes), viewerTz: NY, h24: false, airports: testAirports })
}

/** The last trip ended at SDF two days before A. */
const lastTrip = (b: RawBuilder) =>
  b.trip('t0', {
    days: 3,
    dutyPeriods: [
      { start: -7000, end: -6700, flights: [{ dep: 'SDF', arr: 'ANC', out: -6940, in: -6740 }] },
      { start: -3360, end: -3000, flights: [{ dep: 'ANC', arr: 'SDF', out: -3300, in: -3060 }] },
    ],
  })

/** The next trip: SDF→ANC tomorrow 6:30am EDT, back to SDF Sunday 8:00am EDT. */
const nextTrip = (b: RawBuilder, first: Partial<FlightSpec> = {}) =>
  b.trip('t1', {
    days: 2,
    dutyPeriods: [
      { start: 1440, end: 1830, flights: [{ dep: 'SDF', arr: 'ANC', out: 1500, in: 1800, ...first }] },
      { start: 2790, end: 3060, flights: [{ dep: 'ANC', arr: 'SDF', out: 2850, in: 3030 }] },
    ],
  })

const sam = () => new RawBuilder(A).pilot('Sam', 'SDF', null)
const pat = () => new RawBuilder(A).pilot('Pat', 'SDF', 'MCO')

describe('home narrative', () => {
  it('last trip and next trip, with the homecoming', () => {
    expect(plain(homeSentence(nextTrip(lastTrip(sam())).build()))).toBe(
      'Sam is home after being gone for 3 days! Heading to Anchorage tomorrow at 6:30am. Back home in 2d 2h 30m on Sunday October 11th at 8:00am EDT.',
    )
  })

  it('bolds the details and colors the homecoming countdown green', () => {
    const spans = homeSentence(nextTrip(lastTrip(sam())).build())
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['3 days', 'Anchorage', '2d 2h 30m', 'Sunday October 11th at 8:00am EDT'])
    expect(spans.filter((s) => s.color).map((s) => `${s.text}:${s.color}`)).toEqual(['2d 2h 30m:green'])
  })

  it('last trip only', () => {
    expect(plain(homeSentence(lastTrip(sam()).build()))).toBe('Sam is home after being gone for 3 days and is relaxing.')
  })

  it('next trip only', () => {
    expect(plain(homeSentence(nextTrip(sam()).build()))).toBe(
      'Sam is home — heads to Anchorage tomorrow at 6:30am. Back home in 2d 2h 30m on Sunday October 11th at 8:00am EDT.',
    )
  })

  it('neither', () => {
    expect(plain(homeSentence(sam().build()))).toBe('Sam is home and relaxing.')
  })

  it('jumpseat commuter: "Commuting to …", and no homecoming until a ride home is logged', () => {
    expect(plain(homeSentence(nextTrip(lastTrip(pat()).jumpseat('j0', 'SDF', 'MCO', -3000, -2880)).build()))).toBe(
      'Pat is home after being gone for 3 days! Commuting to Louisville then heading to Anchorage tomorrow at 6:30am — gone for 2 days.',
    )
    expect(plain(homeSentence(nextTrip(pat()).build()))).toBe(
      'Pat is home — commutes to Louisville then heads to Anchorage tomorrow at 6:30am and will be gone for 2 days.',
    )
  })

  it('adds the first flight’s delay', () => {
    expect(plain(homeSentence(nextTrip(sam(), { actualOut: 1650, actualIn: 1950 }).build()))).toBe(
      'Sam is home — heads to Anchorage tomorrow at 9:00am. Back home in 2d 2h 30m on Sunday October 11th at 8:00am EDT. The flight to Anchorage is delayed 2 hours 30 minutes.',
    )
  })

  it('commuter who drives: tells the work story', () => {
    expect(plain(homeSentence(demoRaw('driver', A), -1440))).toBe(
      'Alex is home — heads to base, then on to Rockford, departing in 1d 1h 0m at 6:30am EDT.',
    )
  })
})
