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

function homeSentence(raw: RawSchedule, minutes = 0, h24 = false): Span[] {
  const e = engineFor(raw)
  return narrative(makeSnapshot(e.schedule, e.legs, at(minutes), NY), { now: at(minutes), viewerTz: NY, h24, airports: testAirports })
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

  it('a commuter with no jumpseat to base logged gets the plain "Heading to …" wording, and no homecoming until a ride home is logged', () => {
    expect(plain(homeSentence(nextTrip(lastTrip(pat()).jumpseat('j0', 'SDF', 'MCO', -3000, -2880)).build()))).toBe(
      'Pat is home after being gone for 3 days! Heading to Anchorage tomorrow at 6:30am — gone for 2 days.',
    )
    expect(plain(homeSentence(nextTrip(pat()).build()))).toBe(
      'Pat is home — heads to Anchorage tomorrow at 6:30am and will be gone for 2 days.',
    )
  })

  describe('a commuter with the jumpseat to base logged', () => {
    /** Orlando to Louisville tonight at 8:30pm EDT, ahead of the trip that leaves Louisville tomorrow at 6:30am. */
    const commuter = () => pat().jumpseat('j1', 'MCO', 'SDF', 900, 1020)
    /** The same, after a trip that ended at Louisville, with a jumpseat home to Orlando. */
    const afterATrip = () => lastTrip(commuter()).jumpseat('j0', 'SDF', 'MCO', -3000, -2880)

    it('says "Commuting to …", timed by the jumpseat rather than by the flight', () => {
      expect(plain(homeSentence(nextTrip(afterATrip()).build()))).toBe(
        'Pat is home after being gone for 3 days! Commuting to Louisville then heading to Anchorage today at 8:30pm — gone for 2 days.',
      )
      expect(plain(homeSentence(nextTrip(commuter()).build()))).toBe(
        'Pat is home — commutes to Louisville then heads to Anchorage today at 8:30pm and will be gone for 2 days.',
      )
    })

    it('bolds the commute city along with the rest', () => {
      const spans = homeSentence(nextTrip(afterATrip()).build())
      expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['3 days', 'Louisville', 'Anchorage', '2 days'])
    })

    it('keeps the homecoming once a ride home is logged', () => {
      const rideHome = afterATrip().jumpseat('j2', 'SDF', 'MCO', 3100, 3200)
      expect(plain(homeSentence(nextTrip(rideHome).build()))).toBe(
        'Pat is home after being gone for 3 days! Commuting to Louisville then heading to Anchorage today at 8:30pm. Back home in 2d 5h 20m on Sunday October 11th at 10:50am EDT.',
      )
    })

    it('goes back to "Heading to …" when the jumpseat goes somewhere else', () => {
      expect(plain(homeSentence(nextTrip(pat().jumpseat('j1', 'MCO', 'ATL', 900, 1020)).build()))).toBe(
        'Pat is home — heads to Anchorage tomorrow at 6:30am and will be gone for 2 days.',
      )
    })
  })

  it('adds the first flight’s delay', () => {
    expect(plain(homeSentence(nextTrip(sam(), { actualOut: 1650, actualIn: 1950 }).build()))).toBe(
      'Sam is home — heads to Anchorage tomorrow at 9:00am. Back home in 2d 2h 30m on Sunday October 11th at 8:00am EDT. The flight to Anchorage is delayed 2 hours 30 minutes.',
    )
  })

  it('adds no delay note for an early first flight', () => {
    expect(plain(homeSentence(nextTrip(sam(), { actualOut: 1480, actualIn: 1780 }).build()))).toBe(
      'Sam is home — heads to Anchorage tomorrow at 6:10am. Back home in 2d 2h 30m on Sunday October 11th at 8:00am EDT.',
    )
  })

  it('commuter who drives: tells the work story', () => {
    expect(plain(homeSentence(demoRaw('driver', A), -1440))).toBe(
      'Alex is home — heads to base, then on to Rockford, departing in 1d 1h 0m at 6:30am EDT.',
    )
  })

  it('commuter who drives: bolds the details and keeps the countdown in the status color', () => {
    const spans = homeSentence(demoRaw('driver', A), -1440)
    expect(spans.filter((s) => s.bold).map((s) => s.text)).toEqual(['Rockford', '1d 1h 0m', '6:30am EDT'])
    expect(spans.filter((s) => s.color).map((s) => `${s.text}:${s.color}`)).toEqual(['1d 1h 0m:status'])
  })

  it('writes the times on the 24-hour clock when asked', () => {
    expect(plain(homeSentence(nextTrip(sam()).build(), 0, true))).toBe(
      'Sam is home — heads to Anchorage tomorrow at 06:30. Back home in 2d 2h 30m on Sunday October 11th at 08:00 EDT.',
    )
    expect(plain(homeSentence(demoRaw('driver', A), -1440, true))).toBe(
      'Alex is home — heads to base, then on to Rockford, departing in 1d 1h 0m at 06:30 EDT.',
    )
  })
})

describe('the home sentence names the right departure (audit C7)', () => {
  it('tells an air commuter about the trip, not about tomorrow’s training-day jumpseat', () => {
    const raw = new RawBuilder(A)
      .pilot('Pat', 'SDF', 'MCO')
      .jumpseat('js-train', 'MCO', 'SDF', 1300, 1420)
      .training('tr', 'RECURRENT', 1500, 1900, 'SDF')
      .jumpseat('js-home', 'SDF', 'MCO', 2000, 2120)
      .trip('t1', { dutyPeriods: [{ start: 5700, end: 6100, flights: [{ dep: 'SDF', arr: 'ANC', out: 5760, in: 6000 }] }] })
      .build()
    const e = engineFor(raw)
    const s = makeSnapshot(e.schedule, e.legs, at(0), NY)
    const text = narrative(s, { now: at(0), viewerTz: NY, h24: false, airports: testAirports }).map((p) => p.text).join('')
    expect(text).toBe('Pat is home — heads to Anchorage Tuesday the 13th at 5:30am and will be gone for 1 day.')
  })
})
