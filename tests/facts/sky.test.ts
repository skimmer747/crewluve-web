import { describe, expect, it } from 'vitest'
import { chase, COCKPIT_HORIZON, horizonDip, moonSight, nextGroundSunEvent, sunEvents } from '../../src/facts/sky'
import { airportMark, makeTripMap, type MapLeg } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, HOUR } from '../map/tripMapLegs'

/** A flight between two of the test airports, `hours` long. */
function flight(from: string, to: string, departing: string, hours: number): MapLeg {
  const start = Date.parse(departing)
  return { id: `${from}${to}`, kind: 'flight', origin: airportMark(from, AIRPORTS)!, destination: airportMark(to, AIRPORTS)!, start, end: start + hours * HOUR, flightNumber: null }
}
const near = (time: number, iso: string) => expect(Math.abs(time - Date.parse(iso))).toBeLessThanOrEqual(60_000)
const CGN = { lat: 50.8659, lng: 7.1427 }

describe('the sky from the cockpit (Stage 2 spec §4.5)', () => {
  it('puts the horizon about 3.86° down at 35,000 ft', () => {
    expect(horizonDip(35_000)).toBeCloseTo(3.03, 2)
    expect(COCKPIT_HORIZON).toBeCloseTo(-3.863, 3)
  })

  it('sees one sunset on an evening flight to Europe, about 21 minutes after the people below', () => {
    const events = sunEvents(flight('SDF', 'CGN', '2026-11-13T18:00:00Z', 8))
    expect(events.map((e) => e.kind)).toEqual(['sunset'])
    near(events[0].time, '2026-11-13T20:46:17Z')
    expect(events[0].peopleBelowGap! / 60_000).toBeCloseTo(21.4, 0)
  })

  it('sees one sunrise on an overnight flight to Europe, about 22 minutes before the people below', () => {
    const events = sunEvents(flight('SDF', 'CGN', '2026-11-13T23:00:00Z', 8))
    expect(events.map((e) => e.kind)).toEqual(['sunrise'])
    near(events[0].time, '2026-11-14T06:38:13Z')
    expect(events[0].peopleBelowGap! / 60_000).toBeCloseTo(22.0, 0)
  })

  it('sees none on a daylight flight west', () => {
    expect(sunEvents(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9))).toEqual([])
  })

  it('sees none on a drive', () => {
    const leg = makeTripMap([drive('d', 'LEX', 'SDF', 9, 2)], { isNextTrip: false, home: 'SDF', now: at(9), airports: AIRPORTS })!.legs[0]
    expect(sunEvents(leg)).toEqual([])
  })

  it('chases the sun west over the Atlantic in the afternoon', () => {
    expect(chase(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9), Date.parse('2026-11-14T15:00:00Z'))).toBe('afternoon')
  })

  it('doesn’t chase it east', () => {
    expect(chase(flight('SDF', 'CGN', '2026-11-13T12:00:00Z', 8), Date.parse('2026-11-13T15:00:00Z'))).toBeNull()
  })

  it('leaves out the moon in daylight', () => {
    expect(moonSight(flight('CGN', 'SDF', '2026-11-14T13:00:00Z', 9), Date.parse('2026-11-14T15:00:00Z'))).toBeNull()
  })

  it('sees a waxing gibbous moon up on a night leaving Cologne', () => {
    expect(moonSight(flight('CGN', 'DXB', '2026-11-20T20:00:00Z', 6), Date.parse('2026-11-20T20:30:00Z'))).toEqual({ phase: 'waxingGibbous', isUp: true })
  })
})

describe('the sun on the ground (Stage 2 spec §5.3)', () => {
  it('in Cologne at night, is tomorrow’s sunrise', () => {
    const event = nextGroundSunEvent(CGN, Date.parse('2026-11-13T20:14:00Z'))!
    expect(event.kind).toBe('sunrise')
    near(event.time, '2026-11-14T06:45:24Z')
  })

  it('in Cologne at noon, is that evening’s sunset', () => {
    const event = nextGroundSunEvent(CGN, Date.parse('2026-11-14T12:00:00Z'))!
    expect(event.kind).toBe('sunset')
    near(event.time, '2026-11-14T15:45:47Z')
  })
})
