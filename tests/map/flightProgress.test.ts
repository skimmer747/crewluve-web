import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { airborneWindow, scheduledFraction, SHORTEST_CRUISE_MS, TAXI_IN_MS, TAXI_OUT_MS } from '../../src/map/flightProgress'

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
