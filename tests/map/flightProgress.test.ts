import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { airborneWindow, scheduledFraction, scheduledTime, SHORTEST_CRUISE_MS, TAXI_IN_MS, TAXI_OUT_MS } from '../../src/map/flightProgress'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
interface Cases {
  constants: { taxiOutMinutes: number; taxiInMinutes: number; shortestCruiseMinutes: number }
  scheduleCases: { name: string; departure: string; arrival: string; at: string; fraction: number }[]
}
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/progress-cases.json', import.meta.url), 'utf8')) as Cases
const MINUTE = 60_000

describe("the schedule's plane (moving map spec §7.3, §15.1)", () => {
  it("uses the shared cases' allowances", () => {
    expect(TAXI_OUT_MS).toBe(cases.constants.taxiOutMinutes * MINUTE)
    expect(TAXI_IN_MS).toBe(cases.constants.taxiInMinutes * MINUTE)
    expect(SHORTEST_CRUISE_MS).toBe(cases.constants.shortestCruiseMinutes * MINUTE)
  })

  it.each(cases.scheduleCases)('$name', (c) => {
    expect(scheduledFraction(Date.parse(c.departure), Date.parse(c.arrival), Date.parse(c.at))).toBeCloseTo(c.fraction, 9)
  })

  it('has no airborne window when the arrival is no later than the departure', () => {
    expect(airborneWindow(1000, 1000)).toBeNull()
    expect(airborneWindow(2000, 1000)).toBeNull()
  })
})

describe('from a fraction to a time (Stage 2 spec §4.2)', () => {
  const departure = Date.UTC(2026, 2, 20, 10)

  it('is steady along the airborne window', () => {
    const arrival = departure + 202 * MINUTE
    expect(scheduledTime(departure, arrival, 0)).toBe(departure + 15 * MINUTE)
    expect(scheduledTime(departure, arrival, 0.5)).toBe(departure + 105 * MINUTE)
    expect(scheduledTime(departure, arrival, 1)).toBe(departure + 195 * MINUTE)
  })

  it('is the inverse of scheduledFraction', () => {
    const arrival = departure + 8 * 60 * MINUTE
    expect(scheduledFraction(departure, arrival, scheduledTime(departure, arrival, 0.37)!)).toBeCloseTo(0.37, 9)
  })

  it('uses the whole block for a short one', () => {
    expect(scheduledTime(departure, departure + 20 * MINUTE, 0.5)).toBe(departure + 10 * MINUTE)
  })

  it('is null with no block', () => {
    expect(scheduledTime(departure, departure, 0.5)).toBeNull()
  })
})
