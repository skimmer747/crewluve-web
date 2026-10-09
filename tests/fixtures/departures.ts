import { RawBuilder, type FlightSpec } from '../../src/data/rowBuilder'
import { A, engineFor } from './engine'

/** Scenes where a departure moves. Alex's base is SDF and home is LEX; `shift` is minutes off schedule (negative is early). */
export const alex = () => new RawBuilder(A).pilot('Alex', 'SDF', 'LEX')

/** SDF→RFD, then RFD→ANC, which leaves `shift` minutes off its 300-minute schedule. */
export const twoFlights = (shift: number) =>
  engineFor(
    alex().trip('t1', {
      dutyPeriods: [{
        start: 0,
        end: 900,
        flights: [
          { dep: 'SDF', arr: 'RFD', out: 60, in: 150 },
          { dep: 'RFD', arr: 'ANC', out: 300, in: 600, actualOut: 300 + shift, actualIn: 600 + shift },
        ],
      }],
    }).build(),
  )

/** SDF→ANC, a night in Anchorage, then ANC→SDF, which leaves `shift` minutes off its 1400-minute schedule. */
export const overnight = (shift: number) =>
  engineFor(
    alex().trip('t1', {
      dutyPeriods: [
        { start: 0, end: 200, flights: [{ dep: 'SDF', arr: 'ANC', out: 30, in: 180 }] },
        { start: 1300, end: 1700, flights: [{ dep: 'ANC', arr: 'SDF', out: 1400, in: 1600, actualOut: 1400 + shift, actualIn: 1600 + shift }] },
      ],
    }).build(),
  )

/** A first flight, SDF→RFD, that leaves `shift` minutes off its 60-minute schedule. `extra` overrides any flight field. */
export const firstFlight = (shift: number, extra: Partial<FlightSpec> = {}) =>
  engineFor(
    alex().trip('t1', {
      dutyPeriods: [{ start: 0, end: 400, flights: [{ dep: 'SDF', arr: 'RFD', out: 60, in: 150, actualOut: 60 + shift, actualIn: 150 + shift, ...extra }] }],
    }).build(),
  )
