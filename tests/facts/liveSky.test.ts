import { describe, expect, it } from 'vitest'
import { legAirborne } from '../../src/facts/legCourse'
import { chase, COCKPIT_HORIZON, cockpitHorizonOnLeg, GROUND_HORIZON, horizonDip, moonSight, sunAltitudeOnLeg, sunEvents } from '../../src/facts/sky'
import { recordPositionAt } from '../../src/map/flightRecord'
import type { LiveState, TrailPoint } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress } from '../../src/map/mapFlight'
import { airportMark, positionAtTime, type MapLeg } from '../../src/map/tripMap'
import { sunAltitude } from '../../src/time/sun'
import { AIRPORTS, HOUR } from '../map/tripMapLegs'

/**
 * The sky from the cockpit of a real plane (Stage 3 spec §8), as the app's LiveSkyFactsTests: its sunrises and sunsets
 * along the path it really flew, at the times it was really there, seen from the height it's really at.
 */

const MINUTE = 60_000

/** Where a test flight goes, and how long it takes from gate to gate. */
interface Route {
  from?: string
  to?: string
  hours?: number
}

/** The flight from Louisville to Cologne, 8 hours from gate to gate, unless the test says. */
function flight(departing: string, { from = 'SDF', to = 'CGN', hours = 8 }: Route = {}): MapLeg {
  const start = Date.parse(departing)
  return { id: `${from}${to}`, kind: 'flight', origin: airportMark(from, AIRPORTS)!, destination: airportMark(to, AIRPORTS)!, start, end: start + hours * HOUR, flightNumber: null }
}

/** The same leg, `ms` later. */
const delayed = (leg: MapLeg, ms: number): MapLeg => ({ ...leg, start: leg.start + ms, end: leg.end + ms })

interface LiveOptions extends Route {
  altitudeFt?: number
  state?: LiveState
  departing?: string
  /** Whether its last fix says it's on the ground. */
  onGround?: boolean
}

/**
 * The flight to Cologne, scheduled out at 18:00 UTC unless the test says, with a real plane that flies as the schedule
 * has it but `late` ms behind: seen every 2 minutes for its first five hours in the air.
 */
function liveFlight(
  late: number,
  { altitudeFt = 35_000, state = 'airborne', departing = '2026-11-13T18:00:00Z', onGround = false, ...route }: LiveOptions = {},
): MapLeg {
  const scheduled = flight(departing, route)
  const asFlown = delayed(scheduled, late)
  const takeoff = legAirborne(asFlown)!.start
  const seenUntil = takeoff + 5 * HOUR
  const trail: TrailPoint[] = []
  for (let time = takeoff + 2 * MINUTE; time <= seenUntil; time += 2 * MINUTE) {
    trail.push({ time, place: positionAtTime(asFlown, time), altitudeFt })
  }
  const last = trail[trail.length - 1]
  const fix = { place: last.place, altitudeFt, groundSpeedKt: 480, trackDeg: 60, onGround, registration: 'N370UP', typeCode: 'B763', seenAt: last.time }
  const live = { legId: scheduled.id, callsign: 'UPS207', state, fix, landedAt: null, trail }
  const mapFlight = makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place, live)!
  const progress = mapFlightProgress(mapFlight, last.time)
  return { ...scheduled, start: progress.start, end: progress.end, flight: mapFlight }
}

describe('the height the sky is seen from (Stage 3 spec §8)', () => {
  it('is the real plane’s while it’s at its cruise', () => {
    const high = liveFlight(0, { altitudeFt: 38_000 })
    expect(Math.abs(cockpitHorizonOnLeg(high) - (GROUND_HORIZON - horizonDip(38_000)))).toBeLessThanOrEqual(1e-9)
    // Higher up, the horizon is lower.
    expect(cockpitHorizonOnLeg(high)).toBeLessThan(COCKPIT_HORIZON)
  })

  it('is 35,000 ft while it climbs or comes down', () => {
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 8_000 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 24_999 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 25_000 }))).not.toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 60_000 }))).not.toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 60_001 }))).toBe(COCKPIT_HORIZON)
  })

  it('is 35,000 ft with no plane in the air, or a height that can’t be right', () => {
    expect(cockpitHorizonOnLeg(flight('2026-11-13T18:00:00Z')), 'no live data').toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 38_000, state: 'landed' })), 'it’s down').toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 1e12 }))).toBe(COCKPIT_HORIZON)
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: NaN }))).toBe(COCKPIT_HORIZON)
  })

  // Not in the app's tests, which have no fix on the ground: its height isn't a cruise, whatever it says.
  it('is 35,000 ft from a fix that says it’s on the ground', () => {
    expect(cockpitHorizonOnLeg(liveFlight(0, { altitudeFt: 38_000, onGround: true }))).toBe(COCKPIT_HORIZON)
  })
})

describe('sunrise and sunset along the record (Stage 3 spec §8)', () => {
  it('are where and when the real plane was', () => {
    // The real plane is 40 minutes behind the schedule. Its sunset is the one a flight scheduled 40 minutes later
    // would see, not the schedule's.
    const scheduled = sunEvents(flight('2026-11-13T18:00:00Z'))[0]
    const later = sunEvents(flight('2026-11-13T18:40:00Z'))[0]
    const events = sunEvents(liveFlight(40 * MINUTE))
    const real = events[0]

    expect(events).toHaveLength(1)
    expect(real.kind).toBe('sunset')
    expect(Math.abs(real.time - later.time)).toBeLessThanOrEqual(MINUTE)
    // The schedule's sunset is minutes off.
    expect(Math.abs(real.time - scheduled.time)).toBeGreaterThan(5 * MINUTE)
    expect(real.peopleBelowGap).not.toBeNull()
    expect(later.peopleBelowGap).not.toBeNull()
    expect(Math.abs(real.peopleBelowGap! - later.peopleBelowGap!)).toBeLessThanOrEqual(MINUTE)
  })

  it('has a plane that left late in the air from when it really left', () => {
    // The schedule has it off the ground at 18:15. It left 40 minutes after that.
    const airborne = legAirborne(liveFlight(40 * MINUTE))!
    expect(Math.abs(airborne.start - Date.parse('2026-11-13T18:55:00Z'))).toBeLessThanOrEqual(2 * MINUTE)
  })

  it('has no sunset for a plane that left after dark, though the schedule had it off before', () => {
    // The schedule has it off at 22:35 UTC, minutes after sunset in Louisville, with the sun still above the cockpit's
    // horizon at cruise: its plane sees a sunset. The real plane left 40 minutes later, in the dark.
    const scheduled = sunEvents(flight('2026-11-13T22:20:00Z'))
    expect(scheduled[0]?.kind).toBe('sunset')
    const real = sunEvents(liveFlight(40 * MINUTE, { departing: '2026-11-13T22:20:00Z' }))
    expect(real.some((e) => e.kind === 'sunset'), JSON.stringify(real)).toBe(false)
  })

  it('sets later seen from higher up, by a minute or two', () => {
    const lower = sunEvents(liveFlight(0, { altitudeFt: 30_000 }))[0]
    const higher = sunEvents(liveFlight(0, { altitudeFt: 41_000 }))[0]
    expect(higher.time).toBeGreaterThan(lower.time)
    expect(higher.time - lower.time).toBeLessThan(5 * MINUTE)
  })

  it('are the schedule’s, as before, with no live data', () => {
    const scheduled = flight('2026-11-13T18:00:00Z')
    const withNoAnswer: MapLeg = {
      ...scheduled,
      flight: makeMapFlight(scheduled.start, scheduled.end, scheduled.origin.place, scheduled.destination.place)!,
    }
    expect(sunEvents(withNoAnswer)).toEqual(sunEvents(scheduled))
  })

  it('has the sun’s altitude at the record’s place', () => {
    const leg = liveFlight(40 * MINUTE)
    const t = Date.parse('2026-11-13T21:00:00Z')
    const here = recordPositionAt(leg.flight!.record!, t)
    expect(sunAltitudeOnLeg(leg, t)).toBe(sunAltitude(t, here.lat, here.lng))
  })
})

// Not in the app's tests: chasing the sun and the moon follow the record too, and these hold them to it.
describe('chasing the sun, and the moon, along the record (Stage 3 spec §8)', () => {
  const west: Route = { from: 'CGN', to: 'SDF', hours: 9 }

  it('stretches the real plane’s morning or afternoon, from where it really is', () => {
    // Out of Cologne at 10:00 UTC on the schedule, 40 minutes late for real. At 13:30 the plane on time is west of the
    // sun's meridian, still in its morning; the real plane, further back, is past its noon.
    const t = Date.parse('2026-11-14T13:30:00Z')
    const onTime = flight('2026-11-14T10:00:00Z', west)
    expect(chase(onTime, t)).toBe('morning')
    expect(chase(delayed(onTime, 40 * MINUTE), t)).toBe('afternoon')
    expect(chase(liveFlight(40 * MINUTE, { ...west, departing: '2026-11-14T10:00:00Z' }), t)).toBe('afternoon')
  })

  it('doesn’t chase the sun until the real plane leaves the ground', () => {
    // The schedule has it in the air from 10:15. The real plane, 40 minutes late, is still on the ground seconds before
    // it leaves, and chases the sun once it's away.
    const leg = liveFlight(40 * MINUTE, { ...west, departing: '2026-11-14T10:00:00Z' })
    const takeoff = legAirborne(leg)!.start
    expect(chase(leg, takeoff - 5_000)).toBeNull()
    expect(chase(leg, takeoff + 10 * MINUTE)).toBe('morning')
  })

  it('chases the sun from when it rises at the real plane’s height', () => {
    // Flying west before dawn, at 41,000 ft the sun rises a few minutes before it would at 35,000.
    const higher = liveFlight(0, { ...west, departing: '2026-11-14T05:00:00Z', altitudeFt: 41_000 })
    const cruise = liveFlight(0, { ...west, departing: '2026-11-14T05:00:00Z' })
    const [risesHigher] = sunEvents(higher)
    const [risesAtCruise] = sunEvents(cruise)
    expect([risesHigher.kind, risesAtCruise.kind]).toEqual(['sunrise', 'sunrise'])
    const between = (risesHigher.time + risesAtCruise.time) / 2
    expect(chase(higher, between)).toBe('morning')
    expect(chase(cruise, between)).toBeNull()
  })

  it('shows no moon while the sun is still up from the real plane’s height', () => {
    const higher = liveFlight(0, { altitudeFt: 41_000 })
    const cruise = liveFlight(0)
    const between = (sunEvents(higher)[0].time + sunEvents(cruise)[0].time) / 2
    expect(moonSight(higher, between)).toBeNull()
    expect(moonSight(cruise, between)).toEqual({ phase: 'waxingCrescent', isUp: true })
  })

  it('has the moon up or down where the real plane is', () => {
    // 40 minutes behind the schedule, the real plane is far enough west that the moon hasn't set there yet.
    const t = Date.parse('2026-11-13T22:08:00Z')
    const onTime = flight('2026-11-13T18:00:00Z')
    expect(moonSight(onTime, t)?.isUp).toBe(false)
    expect(moonSight(delayed(onTime, 40 * MINUTE), t)?.isUp).toBe(true)
    expect(moonSight(liveFlight(40 * MINUTE), t)?.isUp).toBe(true)
  })
})
