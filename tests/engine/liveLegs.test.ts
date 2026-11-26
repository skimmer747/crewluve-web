import { describe, expect, it } from 'vitest'
import { buildLegs, type Leg } from '../../src/engine/legs'
import {
  atGateFlight, estimatedArrival, isEstimatedArrival, landedFlight, liveMapFlights, returnedFlight, scheduleOnlyFlight,
  stillOnGroundFlight, watchedFlights, withLiveTimes,
} from '../../src/engine/liveLegs'
import { resolveStatus } from '../../src/engine/status'
import type { Schedule } from '../../src/engine/types'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { mapFlightProgress } from '../../src/map/mapFlight'
import { toSchedule } from '../../src/partner/convert'
import type { PartnerSummary, SummaryLeg } from '../../src/partner/summary'
import { airport, at, LIVE_CASES, made } from '../map/liveCases'
import { atTheGate, backAtTheGate, FLYING, placeOf as tripPlaceOf, SCHEDULE as TRIP } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, point, START } from '../map/madeUpFlights'

/** Where an airport is: the shared cases' airports, and no others. */
const placeOf = (code: string): GeoPoint | null => (code in LIVE_CASES.airports ? airport(code) : null)

const leg = (id: string, type: SummaryLeg['type'], startMinutes: number, endMinutes: number, more: Partial<SummaryLeg> = {}): SummaryLeg => ({
  id, tripId: 'T1', type, start: START + startMinutes * MINUTE, end: START + endMinutes * MINUTE, airportCode: null, flightNumber: null,
  departureAirport: null, arrivalAirport: null, tripTotalDays: 1, delayMinutes: null, airlineCode: null, label: null, ...more,
})

const flightLeg = (id: string, dep: string, arr: string, startMinutes: number, endMinutes: number, more: Partial<SummaryLeg> = {}) =>
  leg(id, 'flight', startMinutes, endMinutes, { flightNumber: `UPS${1200 + Number(id.replace(/\D/g, ''))}`, departureAirport: dep, arrivalAirport: arr, ...more })

const scheduleOf = (legs: SummaryLeg[]): Schedule => {
  const summary: PartnerSummary = { pilotId: 'pilot', name: 'Alex', home: 'MIA', base: 'SDF', lastUpdated: START, legs, quickStatuses: [] }
  return toSchedule(summary, START)
}

/** SDF → PHL, written from noon to 2 PM, a turn in Philadelphia, then PHL → SDF from 2:45 to 4:45. */
const TURN_TRIP = [flightLeg('f1', 'SDF', 'PHL', 0, 120), leg('t1', 'turn', 120, 165, { airportCode: 'PHL' }), flightLeg('f2', 'PHL', 'SDF', 165, 285)]

/** Off 7 minutes early: first seen near Louisville 8 minutes after the gate time, and landed at 1:40, 20 minutes early. */
const OFF_EARLY_LANDED = liveFlight([point(8, 38.25, -85.55), point(40, 38.9, -81.5), point(90, 39.8, -75.8)],
  { legId: 'f1', state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, 39.87, -75.24, { onGround: true }) })

/** Seen only far from Louisville, still in the air: its start stays the schedule's, and its end is an estimate. */
const IN_THE_AIR = liveFlight([point(30, 38.6, -83.6), point(50, 39.1, -80.6)], { legId: 'f1', fix: fix(51, 39.15, -80.4) })

const answered = (...flights: LiveFlight[]) => new Map(flights.map((f) => [f.legId, f]))
const flightsFor = (schedule: Schedule, ...live: LiveFlight[]) => liveMapFlights(schedule, answered(...live), 0, placeOf)
const legsAt = (schedule: Schedule, live: LiveFlight[], now: number) => buildLegs(withLiveTimes(schedule, flightsFor(schedule, ...live), now))
const byId = (legs: Leg[], id: string) => legs.find((l) => l.id === id)!

describe('the flights the live source watches (Stage 3 spec §10.2, §11)', () => {
  it('are the flights, at their gate times moved by their delay, earliest first', () => {
    const schedule = scheduleOf([
      flightLeg('f2', 'PHL', 'SDF', 165, 285, { delayMinutes: 20 }),
      flightLeg('f1', 'SDF', 'PHL', 0, 120),
      leg('j1', 'flight', 400, 480, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'ATL' }),
      leg('g1', 'flight', 300, 360, { flightNumber: 'GND', departureAirport: 'SDF', arrivalAirport: 'LEX' }),
    ])
    expect(watchedFlights(schedule)).toEqual([
      { id: 'f1', departure: START, arrival: START + 120 * MINUTE },
      { id: 'f2', departure: START + 185 * MINUTE, arrival: START + 305 * MINUTE },
      { id: 'j1', departure: START + 400 * MINUTE, arrival: START + 480 * MINUTE },
    ])
  })

  it("watch two airlines' flights of one number, from one airport at one time, as two flights", () => {
    const schedule = scheduleOf([
      flightLeg('f1', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1234' }),
      leg('j1', 'flight', 0, 120, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'PHL' }),
    ])
    expect(watchedFlights(schedule).map((l) => l.id)).toEqual(['f1', 'j1'])
  })

  it('watch legs that are one flight once, under the first of their ids in text order', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    expect(watchedFlights(schedule).map((l) => l.id)).toEqual(['f1'])
  })
})

describe("the map's flights for the answers", () => {
  it('are only the flights Crewlu Cloud answered', () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect([...flightsFor(schedule, IN_THE_AIR).keys()]).toEqual(['f1'])
    expect(flightsFor(schedule).size).toBe(0)
  })

  it('give legs that are one flight its answer, which comes under the first of their ids', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const flights = flightsFor(schedule, IN_THE_AIR)
    expect([...flights.keys()].sort()).toEqual(['f1', 'f9'])
    expect(flights.get('f9')?.live).toBe(IN_THE_AIR)
    expect(liveMapFlights(schedule, new Map([['f9', { ...IN_THE_AIR, legId: 'f9' }]]), 0, placeOf).size).toBe(0)
  })

  it("hand Crewlu Cloud's clock on", () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect(liveMapFlights(schedule, answered(IN_THE_AIR), 42_000, placeOf).get('f1')?.clockOffset).toBe(42_000)
  })

  it("plan from the schedule moved by the leg's own delay", () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 0, 120, { delayMinutes: 20 })])
    const plan = flightsFor(schedule, IN_THE_AIR).get('f1')!.plan
    expect([plan.departure, plan.arrival]).toEqual([START + 20 * MINUTE, START + 140 * MINUTE])
  })

  it("leave out a flight to or from an airport this site doesn't know", () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'XYZ', 0, 120)])
    expect(flightsFor(schedule, IN_THE_AIR).size).toBe(0)
  })
})

describe('one landing time (Stage 3 spec §7.1)', () => {
  it('changes nothing with no live data', () => {
    const schedule = scheduleOf(TURN_TRIP)
    expect(withLiveTimes(schedule, new Map(), START)).toBe(schedule)
    expect(withLiveTimes(schedule, flightsFor(schedule), START)).toBe(schedule)
  })

  it("gives the flight every shared moment's times, on time, 20 minutes late and 10 minutes early, keeping its delay", () => {
    for (const delay of [0, 20, -10]) {
      for (const flightCase of LIVE_CASES.flights) {
        const shift = delay * MINUTE
        const summaryLeg: SummaryLeg = {
          ...flightLeg('f1', flightCase.from, flightCase.to, 0, 0, { delayMinutes: delay === 0 ? null : delay }),
          start: at(flightCase.departure) - shift, end: at(flightCase.arrival) - shift,
        }
        const schedule = scheduleOf([summaryLeg])
        const { flight } = made(flightCase)
        const flights = flight ? liveMapFlights(schedule, new Map([['f1', flight]]), 0, placeOf) : new Map()
        for (const moment of flightCase.moments) {
          const what = `${flightCase.name} at ${moment.at}, ${delay} min late`
          const move = withLiveTimes(schedule, flights, at(moment.at)).trips[0].dutyPeriods[0].flights[0]
          expect(move.start, what).toBeCloseTo(at(moment.start), -2)
          expect(move.end, what).toBeCloseTo(at(moment.end), -2)
          expect(move.start - move.schedStart, `${what}: the delay at the start`).toBeCloseTo(shift, -2)
          expect(move.end - move.schedEnd, `${what}: the delay at the end`).toBeCloseTo(shift, -2)
        }
      }
    }
  })

  it('keeps a flight with nothing real as it was', () => {
    const schedule = scheduleOf(TURN_TRIP)
    // On the ground at the gate, before the plan's takeoff: the schedule stands.
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(5, 38.1744, -85.736, { onGround: true }) })
    expect(withLiveTimes(schedule, flightsFor(schedule, atTheGate), START + 6 * MINUTE)).toBe(schedule)
  })

  it('ends the wait before, and starts the wait after, where the flight does: here one wait between two live flights', () => {
    const schedule = scheduleOf(TURN_TRIP)
    // The second flight is first seen near Philadelphia at 2:40, five minutes before its gate time: off 20 minutes early.
    const offEarly = liveFlight([point(160, 39.95, -75.5), point(190, 39.5, -80)], { legId: 'f2', fix: fix(191, 39.48, -80.1) })
    const legs = legsAt(schedule, [OFF_EARLY_LANDED, offEarly], START + 192 * MINUTE)
    expect([byId(legs, 'f1').start, byId(legs, 'f1').end]).toEqual([START - 7 * MINUTE, START + 107 * MINUTE])
    expect(byId(legs, 'f2').start).toBe(START + 145 * MINUTE)
    const turn = legs.find((l) => l.kind === 'turn')!
    expect([turn.start, turn.end]).toEqual([START + 107 * MINUTE, START + 145 * MINUTE])
  })

  it('starts the wait after a late arrival later, and leaves the wait before alone', () => {
    // Seen far from Louisville, an hour along, and still well short of halfway: it lands late.
    const late = liveFlight([point(40, 38.4, -84.6), point(60, 38.6, -83.6)], { legId: 'f1', fix: fix(61, 38.62, -83.5) })
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, late)
    const now = START + 62 * MINUTE
    const real = mapFlightProgress(flights.get('f1')!, now)
    expect(real.end).toBeGreaterThan(START + 120 * MINUTE)
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(byId(legs, 'f1').start).toBe(START)
    const turn = legs.find((l) => l.kind === 'turn')!
    expect([turn.start, turn.end]).toEqual([real.end, START + 165 * MINUTE])
  })

  it('moves a duty period or a trip only where it began or ended with the flight', () => {
    const base = scheduleOf(TURN_TRIP)
    const trip = base.trips[0]
    // A report 45 minutes before the first flight, and a trip that ends after the last, as the demo's rows have them.
    const reported: Schedule = { ...base, trips: [{ ...trip, start: START - 45 * MINUTE, dutyPeriods: [{ ...trip.dutyPeriods[0], start: START - 45 * MINUTE }] }] }
    const moved = withLiveTimes(reported, flightsFor(reported, OFF_EARLY_LANDED), START + 130 * MINUTE)
    expect(moved.trips[0].start).toBe(START - 45 * MINUTE)
    expect(moved.trips[0].dutyPeriods[0].start).toBe(START - 45 * MINUTE)
    // With the flight first, the period and the trip begin where it does.
    const plain = withLiveTimes(base, flightsFor(base, OFF_EARLY_LANDED), START + 130 * MINUTE)
    expect(plain.trips[0].start).toBe(START - 7 * MINUTE)
    expect(plain.trips[0].dutyPeriods[0].start).toBe(START - 7 * MINUTE)
    expect(plain.trips[0].end).toBe(base.trips[0].end)
  })

  it('ends a period and a trip where their last flight now lands', () => {
    const schedule = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const moved = withLiveTimes(schedule, flightsFor(schedule, OFF_EARLY_LANDED), START + 110 * MINUTE)
    expect(moved.trips[0].end).toBe(START + 107 * MINUTE)
    expect(moved.trips[0].dutyPeriods[0].end).toBe(START + 107 * MINUTE)
  })

  it('meets a delayed flight at its scheduled time or its delayed one', () => {
    const late = scheduleOf([flightLeg('f1', 'SDF', 'PHL', -20, 100, { delayMinutes: 20 })])
    // The trip's end is the written end (1:40) or the delayed one (2:00), whichever is later: here the delayed.
    expect(late.trips[0].end).toBe(START + 120 * MINUTE)
    const moved = withLiveTimes(late, flightsFor(late, OFF_EARLY_LANDED), START + 110 * MINUTE)
    expect(moved.trips[0].end).toBe(START + 107 * MINUTE)
    const early = scheduleOf([flightLeg('f1', 'SDF', 'PHL', 10, 130, { delayMinutes: -10 })])
    // Early, the trip ends at the written end (2:10), the flight's scheduled one.
    expect(early.trips[0].end).toBe(START + 130 * MINUTE)
    expect(withLiveTimes(early, flightsFor(early, OFF_EARLY_LANDED), START + 110 * MINUTE).trips[0].end).toBe(START + 107 * MINUTE)
  })

  it('keeps the status in flight until the real plane arrives, and no longer', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const statusAt = (minutes: number) => {
      const now = START + minutes * MINUTE
      return resolveStatus(legsAt(schedule, [OFF_EARLY_LANDED], now), schedule.pilot, now).kind
    }
    expect(statusAt(106)).toBe('inFlight')
    expect(statusAt(108)).toBe('turn')
    // Without the real plane, the schedule has it in the air until 2 PM.
    expect(resolveStatus(buildLegs(schedule), schedule.pilot, START + 108 * MINUTE).kind).toBe('inFlight')
  })

  it('gives legs that are one flight the real times, so none is left on the schedule', () => {
    const schedule = scheduleOf([flightLeg('f9', 'SDF', 'PHL', 0, 120, { flightNumber: 'UPS1201' }), flightLeg('f1', 'SDF', 'PHL', 0, 120)])
    const legs = legsAt(schedule, [OFF_EARLY_LANDED], START + 110 * MINUTE)
    expect(byId(legs, 'f1').end).toBe(START + 107 * MINUTE)
    expect(byId(legs, 'f9').end).toBe(START + 107 * MINUTE)
  })

  it("moves a jumpseat's times too", () => {
    const schedule = scheduleOf([
      leg('j1', 'flight', 0, 120, { tripId: null, flightNumber: 'DL1234', airlineCode: 'DL', departureAirport: 'SDF', arrivalAirport: 'PHL' }),
    ])
    const moved = withLiveTimes(schedule, flightsFor(schedule, { ...OFF_EARLY_LANDED, legId: 'j1' }), START + 110 * MINUTE)
    expect(moved.jumpseats[0].end).toBe(START + 107 * MINUTE)
  })
})

describe('"about" a landing time (Stage 3 spec §9)', () => {
  it("is said of a leg whose end is the real plane's estimate", () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, IN_THE_AIR)
    const now = START + 52 * MINUTE
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(isEstimatedArrival(byId(legs, 'f1'), flights)).toBe(true)
    expect(isEstimatedArrival(byId(legs, 'f2'), flights)).toBe(false)
    // The schedule's own end isn't an estimate.
    expect(isEstimatedArrival({ id: 'f1', end: START + 120 * MINUTE }, flights)).toBe(false)
  })

  it('is no longer said once the plane has landed', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, OFF_EARLY_LANDED)
    const legs = buildLegs(withLiveTimes(schedule, flights, START + 105 * MINUTE))
    expect(isEstimatedArrival(byId(legs, 'f1'), flights)).toBe(false)
  })

  it("is the flight under way's arrival while that's the real plane's estimate", () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flights = flightsFor(schedule, IN_THE_AIR)
    const now = START + 52 * MINUTE
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    expect(estimatedArrival(legs, flights, now)).toBe(byId(legs, 'f1').end)
  })

  it('is nothing before the flight leaves its gate, once it reaches it, and once the plane is down', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const flying = flightsFor(schedule, IN_THE_AIR)
    const legs = buildLegs(withLiveTimes(schedule, flying, START + 52 * MINUTE))
    expect(estimatedArrival(legs, flying, START - MINUTE)).toBeNull()
    expect(estimatedArrival(legs, flying, byId(legs, 'f1').end)).toBeNull()
    const landed = flightsFor(schedule, OFF_EARLY_LANDED)
    const down = buildLegs(withLiveTimes(schedule, landed, START + 103 * MINUTE))
    expect(estimatedArrival(down, landed, START + 103 * MINUTE)).toBeNull()
    expect(estimatedArrival(legs, new Map(), START + 52 * MINUTE)).toBeNull()
  })
})

describe('a real plane still on the ground at its departure airport (the website’s own, Todd, 16 Nov 2026)', () => {
  /** Seen at its gate in Louisville 20 seconds before `minutes` after the gate time, never yet in the air. */
  const atTheGate = (minutes: number) =>
    liveFlight([], { legId: 'f1', state: 'ground', fix: fix(minutes - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) })

  it('is the flight between its gates whose plane hasn’t left by the plan’s takeoff time, by its id: the narrative says so', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + 25 * MINUTE
    const flights = flightsFor(schedule, atTheGate(25))
    expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBe('f1')
  })

  it('is nothing while an on-time plane is still before the plan’s takeoff time: the narrative says flying, as before', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + MINUTE
    const flights = flightsFor(schedule, atTheGate(1))
    expect(stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)).toBeNull()
  })

  it('is nothing before its leg begins, in the air, landed, and with no live data', () => {
    const schedule = scheduleOf(TURN_TRIP)
    const onGroundAt = (live: LiveFlight | null, minutes: number) => {
      const now = START + minutes * MINUTE
      const flights = live ? flightsFor(schedule, live) : new Map()
      return stillOnGroundFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)
    }
    expect(onGroundAt(atTheGate(-10), -10)).toBeNull()
    expect(onGroundAt(IN_THE_AIR, 52)).toBeNull()
    expect(onGroundAt(OFF_EARLY_LANDED, 103)).toBeNull()
    expect(onGroundAt(null, 25)).toBeNull()
  })
})

describe('a real plane back at its departure airport after an air return (air return design §3)', () => {
  const at = (live: LiveFlight | null, minutes: number) => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + minutes * MINUTE
    const flights = live ? flightsFor(schedule, live) : new Map()
    const legs = buildLegs(withLiveTimes(schedule, flights, now))
    return { returned: returnedFlight(legs, flights, now), stillOnGround: stillOnGroundFlight(legs, flights, now) }
  }

  it('is the flight between its gates whose plane is back, by its id, which is still on the ground there too', () => {
    expect(at(backAtTheGate(45), 45)).toEqual({ returned: 'f1', stillOnGround: 'f1' })
  })

  it('is nothing for a plane that never left, in the air, and with no live data', () => {
    expect(at(liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) }), 25))
      .toEqual({ returned: null, stillOnGround: 'f1' })
    expect(at(IN_THE_AIR, 52).returned).toBeNull()
    expect(at(null, 45).returned).toBeNull()
  })
})

describe('a real plane down, not yet at the gate (the landed, not yet at the gate design §2, Todd, 17 Nov 2026)', () => {
  const landedAt = (live: LiveFlight | null, minutes: number) => {
    const schedule = scheduleOf(TURN_TRIP)
    const now = START + minutes * MINUTE
    const flights = live ? flightsFor(schedule, live) : new Map()
    return landedFlight(buildLegs(withLiveTimes(schedule, flights, now)), flights, now)
  }

  it('is the flight between its gates whose plane has landed, by its id: the narrative says so', () => {
    // Down at 1:40, 20 minutes early, and at the gate at 1:47.
    expect(landedAt(OFF_EARLY_LANDED, 100)).toBe('f1')
    expect(landedAt(OFF_EARLY_LANDED, 106)).toBe('f1')
  })

  it('is nothing at the gate, in the air, still at its departure airport, and with no live data', () => {
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(25 - 1 / 3, airport('SDF').lat, airport('SDF').lng, { onGround: true }) })
    expect(landedAt(OFF_EARLY_LANDED, 107)).toBeNull()
    expect(landedAt(IN_THE_AIR, 52)).toBeNull()
    expect(landedAt(atTheGate, 25)).toBeNull()
    expect(landedAt(null, 103)).toBeNull()
  })
})

describe('the flight by the schedule alone, and the one at its gate, for the status sentence (live or scheduled design §4)', () => {
  const legs = buildLegs(TRIP)
  const flightsWith = (live: LiveFlight | null) =>
    liveMapFlights(TRIP, new Map(live ? [['f1', live]] : []), 0, tripPlaceOf)
  const when = (minutes: number) => START + minutes * MINUTE

  it('names a flight with no live data, due before the schedule’s takeoff and not after', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(5))).toEqual({ id: 'f1', isDue: true })
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(30))).toEqual({ id: 'f1', isDue: false })
  })

  it('names one whose fix on the ground is over 3 minutes old, and none Crewlu Cloud sees or has a best guess of', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(atTheGate(5)), when(9))).toEqual({ id: 'f1', isDue: true })
    expect(scheduleOnlyFlight(legs, flightsWith(atTheGate(5)), when(5))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(FLYING), when(59))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(FLYING), when(62))).toBeNull()
  })

  it('names none outside the gate times', () => {
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(-5))).toBeNull()
    expect(scheduleOnlyFlight(legs, flightsWith(null), when(120))).toBeNull()
  })

  it('names the flight whose real plane is at its gate before the plan’s takeoff, and not after it', () => {
    expect(atGateFlight(legs, flightsWith(atTheGate(5)), when(5))).toBe('f1')
    expect(atGateFlight(legs, flightsWith(atTheGate(25)), when(25))).toBeNull()
    expect(atGateFlight(legs, flightsWith(null), when(5))).toBeNull()
    expect(atGateFlight(legs, flightsWith(FLYING), when(59))).toBeNull()
  })
})
