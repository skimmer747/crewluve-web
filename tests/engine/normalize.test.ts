import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import {
  buildSchedule, classifyManualEvent, effectiveTimes, normalizeFlightNumber, parseInstant, pickPilot,
  resolveAirline, toIata, trainingTitle,
} from '../../src/engine/normalize'

const A = Date.UTC(2026, 9, 9, 9, 30)
const M = 60_000
const H = 60 * M

describe('toIata', () => {
  it.each([
    ['sdf', 'SDF'], [' anc ', 'ANC'], ['', null], ['AB', null], [null, null], ['K SDF', null],
    // A UPS base with a trailing Z: "SDFZ" is the one in live data, and the other UPS bases are accepted too.
    ['SDFZ', 'SDF'], [' sdfz ', 'SDF'], ['ANCZ', 'ANC'], ['ONTZ', 'ONT'], ['MIAZ', 'MIA'],
    // Any other 4-letter value is a word or an ICAO code, not an airport. Location words such as DIAZ and CRUZ end in Z too.
    ['ABCD', null], ['KSDF', null], ['Home', null], ['DIAZ', null], ['CRUZ', null], ['SDFZZ', null], ['XSDFZ', null],
  ])(
    '%s → %s', (input, out) => expect(toIata(input)).toBe(out),
  )
})

describe('parseInstant', () => {
  it('parses ISO instants and rejects garbage', () => {
    expect(parseInstant('2026-10-09T09:30:00Z', A)).toBe(A)
    expect(parseInstant('not a date', A)).toBeNull()
    expect(parseInstant('4026-10-09T09:30:00Z', A)).toBeNull() // the live database has one of these
    expect(parseInstant('1999-12-31T23:59:59Z', A)).toBeNull()
    expect(parseInstant(null, A)).toBeNull()
  })
})

describe('flight numbers and airlines', () => {
  it.each([['0081', '81'], ['2961', '2961'], ['0', '0'], [' 12 ', '12'], ['XXXX', null], ['CML', null], ['HOT-A', null], [null, null]])(
    'normalizeFlightNumber(%s) → %s', (raw, out) => expect(normalizeFlightNumber(raw)).toBe(out),
  )

  it('treats an all-digit flight with no airline as a UPS company flight', () => {
    expect(resolveAirline(' dl ', '1234', false)).toBe('DL')
    expect(resolveAirline(null, '2961', false)).toBe('5X')
    expect(resolveAirline(null, '2961', true)).toBeNull()
    expect(resolveAirline(null, 'XXXX', false)).toBeNull()
    expect(resolveAirline(null, null, false)).toBeNull()
  })
})

describe('effectiveTimes', () => {
  const s0 = A
  const s1 = A + 2 * H

  it('prefers believable actual times', () => {
    expect(effectiveTimes(s0, s1, s0 + 40 * M, s1 + 40 * M)).toEqual({ start: s0 + 40 * M, end: s1 + 40 * M, schedStart: s0, schedEnd: s1 })
  })

  it('ignores actuals more than 6 hours off', () => {
    expect(effectiveTimes(s0, s1, s0 + 7 * H, s1)).toEqual({ start: s0, end: s1, schedStart: s0, schedEnd: s1 })
  })

  // The three guards below each have a case that only that guard can catch.
  it('ignores actuals more than 6 hours off even when the actual block looks fine', () => {
    expect(effectiveTimes(s0, s1, s0 + 7 * H, s1 + 7 * H)).toEqual({ start: s0, end: s1, schedStart: s0, schedEnd: s1 })
  })

  it('falls back to the schedule when the actual block is longer than 26 hours', () => {
    // Each actual is within 6 hours of its scheduled time, but together they make a 27 hour block.
    expect(effectiveTimes(s0, s0 + 24 * H, s0 - H, s0 + 26 * H))
      .toEqual({ start: s0, end: s0 + 24 * H, schedStart: s0, schedEnd: s0 + 24 * H })
  })

  it('falls back to the schedule when the actual block has no length', () => {
    expect(effectiveTimes(s0, s1, s0 + 30 * M, s0 + 30 * M)).toEqual({ start: s0, end: s1, schedStart: s0, schedEnd: s1 })
  })

  it('rejects a scheduled block longer than 26 hours', () => {
    expect(effectiveTimes(s0, s0 + 27 * H, null, null)).toBeNull()
  })

  it('falls back to the schedule when the actual block is impossible', () => {
    expect(effectiveTimes(s0, s1, s0 + 30 * M, s0 + 10 * M)).toEqual({ start: s0, end: s1, schedStart: s0, schedEnd: s1 })
  })

  it('uses the actuals as the schedule when the schedule is missing', () => {
    expect(effectiveTimes(null, null, s0, s1)).toEqual({ start: s0, end: s1, schedStart: s0, schedEnd: s1 })
  })

  it('returns null without a usable pair', () => {
    expect(effectiveTimes(null, s1, null, null)).toBeNull()
    expect(effectiveTimes(s1, s0, null, null)).toBeNull()
  })
})

describe('pickPilot', () => {
  it('takes the most recently updated active profile', () => {
    expect(pickPilot([
      { first_name: 'Old', base_raw_value: 'MIA', home_airport_code: null, is_active: true, updated_at: '2026-01-01T00:00:00Z' },
      { first_name: ' Alex ', base_raw_value: 'SDFZ', home_airport_code: ' lex ', is_active: null, updated_at: '2026-09-01T00:00:00Z' },
      { first_name: 'Gone', base_raw_value: 'ONT', home_airport_code: null, is_active: false, updated_at: '2026-10-01T00:00:00Z' },
    ])).toEqual({ firstName: 'Alex', base: 'SDF', home: 'LEX', effHome: 'LEX' })
  })

  it('uses the base as home when no home airport is set', () => {
    expect(pickPilot([{ first_name: 'Sam', base_raw_value: 'SDF', home_airport_code: '  ', is_active: true, updated_at: '2026-09-01T00:00:00Z' }]))
      .toEqual({ firstName: 'Sam', base: 'SDF', home: null, effHome: 'SDF' })
  })

  it('copes with no profile', () => {
    expect(pickPilot([])).toEqual({ firstName: null, base: null, home: null, effHome: null })
  })
})

describe('event titles', () => {
  it('classifies manual events like Duty does (PartnerStatusGenerator.swift:894-929)', () => {
    expect(classifyManualEvent('HOT STANDBY 0600', null)).toEqual({ kind: 'hotStandby', title: 'Hot Standby' })
    expect(classifyManualEvent('RSVA', null)).toEqual({ kind: 'reserve', title: 'RSV-A' })
    expect(classifyManualEvent('LCO', null)).toEqual({ kind: 'reserve', title: 'LCO' })
    expect(classifyManualEvent('Sim prep', 'Reserve days')).toEqual({ kind: 'reserve', title: 'Sim prep' })
    expect(classifyManualEvent('Recurrent CQ', 'Training')).toEqual({ kind: 'event', title: 'Recurrent CQ' })
    expect(classifyManualEvent('  ', null)).toEqual({ kind: 'event', title: 'Manual Event' })
  })

  it('matches reserve codes as whole codes, not inside other words', () => {
    expect(classifyManualEvent('RSVA 0800', null)).toEqual({ kind: 'reserve', title: 'RSV-A' })
    expect(classifyManualEvent('lco', null)).toEqual({ kind: 'reserve', title: 'LCO' })
    expect(classifyManualEvent('Day 2 - RSCP', null)).toEqual({ kind: 'reserve', title: 'RSC-P' })
    expect(classifyManualEvent('0600RSSD', null)).toEqual({ kind: 'reserve', title: 'RSS-D' })
    for (const title of ['Welcome dinner', 'Falcons game', 'Alcohol CBT', 'Daycare pickup', 'Card night', 'RSVAB', 'XRSVA']) {
      expect(classifyManualEvent(title, null)).toEqual({ kind: 'event', title })
    }
  })

  it('titles training like TrainingEvent.displayTitle', () => {
    expect(trainingTitle('CQ')).toBe('CQ Training')
    expect(trainingTitle(null)).toBe('Training')
  })
})

describe('buildSchedule', () => {
  const raw = new RawBuilder(A)
    .pilot('Alex', 'SDF', 'LEX')
    .trip('t1', {
      days: 2,
      dutyPeriods: [{
        start: 0,
        end: 300,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 60, in: 150, number: '0081' },
          { dep: 'RFD', arr: 'SDF', out: 200, in: 290, actualOut: 240, actualIn: 330, number: 'CML' },
          { dep: 'SDF', arr: 'LEX', out: 310, in: 320, number: 'GND', ground: true, hidden: true },
        ],
      }],
    })
    .commute('c-home', 'SDF', 'LEX', 'toHome', 340, 410, 't1')
    .commute('c-orphan', 'SDF', 'LEX', 'toHome', 900, 970, 'gone')
    .jumpseat('j-dup', 'SDF', 'MCO', 500, 600, { sourceTripId: 't1' })
    .jumpseat('j1', 'MCO', 'SDF', 700, 800, { airline: null, number: '0451' })
    .manualEvent('m-sub', 'TEC part 2', 1000, 1100, 'SDF', { parentId: 'm-parent' })
    .manualEvent('m-hidden', 'Secret', 1000, 1100, 'SDF', { hidden: true })
    .manualEvent('m1', 'RSVB 0600', 1200, 1900, ' sdf ')
    .training('te1', 'PC', 2000, 2480, 'SDF')
    .build()
  const s = buildSchedule(raw, A)

  it('keeps visible flights with effective times, the company airline, and clean numbers', () => {
    const flights = s.trips[0].dutyPeriods[0].flights
    expect(flights.map((f) => f.number)).toEqual(['81', null])
    expect(flights[0]).toMatchObject({ airline: '5X', deadhead: false, ground: false, start: A + 60 * M })
    expect(flights[1]).toMatchObject({ airline: null, deadhead: true, start: A + 240 * M, schedStart: A + 200 * M })
  })

  it('shifts the drive home by the trip’s last-flight delay and drops commutes whose trip is gone', () => {
    expect(s.commutes).toEqual([
      { id: 'c-home', from: 'SDF', to: 'LEX', toHome: true, start: A + 380 * M, end: A + 450 * M, schedEnd: A + 410 * M, sourceTripId: 't1' },
    ])
  })

  it('drops jumpseats that duplicate a trip deadhead', () => {
    expect(s.jumpseats.map((j) => j.id)).toEqual(['j1'])
    expect(s.jumpseats[0]).toMatchObject({ airline: '5X', number: '451', deadhead: true, tripId: null })
  })

  it('drops sub-events and hidden events, and classifies the rest', () => {
    expect(s.events.map((e) => [e.id, e.kind, e.title, e.airport])).toEqual([
      ['m1', 'reserve', 'RSV-B', 'SDF'],
      ['te1', 'training', 'PC Training', 'SDF'],
    ])
  })

  it('drops trips without live duty periods, and flags accounts with no data', () => {
    const bare = new RawBuilder(A).build()
    bare.trips.push({ id: 'bare', start_date: new Date(A).toISOString(), end_date: new Date(A + H).toISOString(), days: 1, base: 'SDF', updated_at: '2026-10-01T00:00:00Z' })
    const s2 = buildSchedule(bare, A)
    expect(s2.trips).toEqual([])
    expect(s2.empty).toBe(false)
    expect(buildSchedule(new RawBuilder(A).build(), A).empty).toBe(true)
  })

  it('drops everything the pilot hid in Crewlu, in every table (spec §9)', () => {
    const hid = buildSchedule(
      new RawBuilder(A)
        .pilot('Alex', 'SDF', 'LEX')
        .trip('t1', {
          dutyPeriods: [{
            start: 0,
            end: 300,
            flights: [
              { dep: 'SDF', arr: 'RFD', out: 60, in: 150 },
              { dep: 'RFD', arr: 'SDF', out: 200, in: 290, hidden: true },
            ],
          }],
        })
        .commute('c-shown', 'SDF', 'LEX', 'toHome', 340, 410)
        .commute('c-hidden', 'SDF', 'LEX', 'toHome', 500, 570, null, true)
        .jumpseat('j-shown', 'MCO', 'SDF', 700, 800)
        .jumpseat('j-hidden', 'MCO', 'SDF', 900, 1000, { hidden: true })
        .manualEvent('m-shown', 'Dentist', 1100, 1200, 'LEX')
        .manualEvent('m-hidden', 'Secret', 1300, 1400, 'LEX', { hidden: true })
        .training('te-shown', 'PC', 1500, 1600, 'SDF')
        .training('te-hidden', 'CQ', 1700, 1800, 'SDF', true)
        .build(),
      A,
    )
    expect(hid.trips[0].dutyPeriods[0].flights.map((f) => f.arr)).toEqual(['RFD'])
    expect(hid.commutes.map((c) => c.id)).toEqual(['c-shown'])
    expect(hid.jumpseats.map((j) => j.id)).toEqual(['j-shown'])
    expect(hid.events.map((e) => e.id)).toEqual(['m-shown', 'te-shown'])
  })

  it('treats a visible flight numbered GND as ground transport', () => {
    const g = buildSchedule(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t1', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'LEX', out: 60, in: 150, number: 'GND' }] }] })
        .build(),
      A,
    )
    expect(g.trips[0].dutyPeriods[0].flights[0]).toMatchObject({ ground: true, number: null })
  })

  it('drops trips that end before they start, or at the moment they start', () => {
    const raw2 = new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
      .trip('ok', { dutyPeriods: [{ start: 0, end: 300, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150 }] }] })
      .trip('backwards', { dutyPeriods: [{ start: 1000, end: 1300, flights: [{ dep: 'SDF', arr: 'RFD', out: 1060, in: 1150 }] }] })
      .trip('instant', { dutyPeriods: [{ start: 2000, end: 2300, flights: [{ dep: 'SDF', arr: 'RFD', out: 2060, in: 2150 }] }] })
      .build()
    raw2.trips[1].end_date = new Date(A + 900 * M).toISOString() // before its 1000-minute start
    raw2.trips[2].end_date = raw2.trips[2].start_date
    expect(buildSchedule(raw2, A).trips.map((t) => t.id)).toEqual(['ok'])
  })

  it('never takes a commercial ticket for a UPS jumpseat', () => {
    const raw3 = new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
      .jumpseat('ticket', 'MCO', 'SDF', 700, 800, { airline: null, number: '1234' })
      .jumpseat('ups', 'MCO', 'SDF', 900, 1000, { airline: null, number: '1234' })
      .build()
    raw3.jumpseats[0].is_commercial_deadhead = true // RawBuilder has no option for this flag
    expect(buildSchedule(raw3, A).jumpseats.map((j) => [j.id, j.airline, j.number])).toEqual([
      ['ticket', null, '1234'],
      ['ups', '5X', '1234'],
    ])
  })

  it('never takes ground transport with a flight number for a UPS flight', () => {
    const flights = buildSchedule(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t1', {
          dutyPeriods: [{
            start: 0,
            end: 300,
            flights: [
              { dep: 'SDF', arr: 'LEX', out: 60, in: 150, number: '1234', airline: null, ground: true },
              { dep: 'LEX', arr: 'SDF', out: 200, in: 290, number: '1235', airline: null }, // a company flight is still UPS
            ],
          }],
        })
        .build(),
      A,
    ).trips[0].dutyPeriods[0].flights
    expect(flights[0]).toMatchObject({ airline: null, ground: true, number: '1234' })
    expect(flights[1]).toMatchObject({ airline: '5X', ground: false, number: '1235' })
  })

  it('never takes a commercial deadhead flight in a trip for a UPS flight', () => {
    const flights = buildSchedule(
      new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')
        .trip('t1', {
          dutyPeriods: [{
            start: 0,
            end: 300,
            flights: [
              { dep: 'MCO', arr: 'SDF', out: 60, in: 150, number: '1234', airline: null, commercialDh: true },
              { dep: 'SDF', arr: 'RFD', out: 200, in: 290, number: '1235', airline: null }, // a company flight is still UPS
            ],
          }],
        })
        .build(),
      A,
    ).trips[0].dutyPeriods[0].flights
    expect(flights[0]).toMatchObject({ airline: null, deadhead: true, number: '1234' })
    expect(flights[1]).toMatchObject({ airline: '5X', deadhead: false, number: '1235' })
  })
})
