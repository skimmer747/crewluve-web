import { describe, expect, it } from 'vitest'
import { liveLabelText } from '../../src/copy/tripMap'
import { makeFlightPlan } from '../../src/map/flightPlan'
import { distanceMeters } from '../../src/map/greatCircle'
import { isEstimate, makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airport, at, expectNearOrNull, expectPlace, LIVE_CASES, made, NEAR } from './liveCases'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')
const DEPARTURE = START
const ARRIVAL = START + 120 * MINUTE

describe('a flight as the map measures and draws it (Stage 3 spec §11)', () => {
  it("with no live data has the schedule's plan, the great circle, and no record", () => {
    const flight = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA)
    expect(flight?.plan).toEqual(makeFlightPlan(DEPARTURE, ARRIVAL, distanceMeters(LOUISVILLE, PHILADELPHIA)))
    expect(flight?.path.isReal).toBe(false)
    expect(flight?.path.stretches.map((s) => s.kind)).toEqual(['planned'])
    expect(flight?.record).toBeNull()
    expect(flight?.live).toBeNull()
    expect(flight?.clockOffset).toBe(0)
  })

  it('is null for a leg that arrives no later than it leaves', () => {
    expect(makeMapFlight(DEPARTURE, DEPARTURE, LOUISVILLE, PHILADELPHIA)).toBeNull()
    expect(makeMapFlight(DEPARTURE, DEPARTURE - MINUTE, LOUISVILLE, PHILADELPHIA)).toBeNull()
  })

  it('makes the plan, the path and the record of every shared case together, as the cases have them', () => {
    for (const flightCase of LIVE_CASES.flights) {
      const { plan, flight, path, record } = made(flightCase)
      const mapFlight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), flight, 0)
      expect(mapFlight, flightCase.name).toEqual({ plan, path, record, live: flight, clockOffset: 0 })
    }
  })

  it("puts the real plane where every shared moment has it, with the moment's phase, touchdown and label", () => {
    for (const flightCase of LIVE_CASES.flights) {
      const { flight } = made(flightCase)
      const mapFlight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), flight)!
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const progress = mapFlightProgress(mapFlight, at(moment.at))
        expect(progress.phase, what).toBe(moment.phase)
        expectNearOrNull(progress.touchdown, moment.touchdown == null ? null : at(moment.touchdown), NEAR.ms, `${what}, touchdown`)
        expect(progress.label == null ? null : liveLabelText(progress.label), what).toBe(moment.label)
        expectPlace(progress.plane, moment.plane, `${what}, plane`)
      }
    }
  })

  it("measures a fix's age by Crewlu Cloud's clock, so a wrong clock here doesn't age it", () => {
    // Seen 2 minutes ago by Crewlu Cloud's clock, on a browser whose clock runs 4 minutes fast.
    const live = liveFlight([point(30, 39.5, -80)], { fix: fix(40, 39.6, -79.5) })
    const browserNow = START + 46 * MINUTE
    const right = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, live, -4 * MINUTE)!
    const wrong = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, live, 0)!
    expect(mapFlightProgress(right, browserNow).phase).toBe('inAir')
    expect(mapFlightProgress(wrong, browserNow).phase).toBe('estimated')
  })

  it("calls a time that isn't the plan's an estimate, by a second or more, until the plane has landed", () => {
    const flying = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA, liveFlight([point(30, 39.5, -80)]))!
    expect(isEstimate(flying, ARRIVAL)).toBe(false)
    expect(isEstimate(flying, ARRIVAL + 999)).toBe(false)
    expect(isEstimate(flying, ARRIVAL + 1000)).toBe(true)
    expect(isEstimate(flying, ARRIVAL - 12 * MINUTE)).toBe(true)
    const landed = makeMapFlight(DEPARTURE, ARRIVAL, LOUISVILLE, PHILADELPHIA,
      liveFlight([point(30, 39.5, -80)], { state: 'landed', landedAt: START + 100 * MINUTE }))!
    expect(isEstimate(landed, ARRIVAL - 12 * MINUTE)).toBe(false)
  })
})
