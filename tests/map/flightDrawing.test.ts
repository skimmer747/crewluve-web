import { describe, expect, it } from 'vitest'
import { flightDrawing, type FlightDrawing, type RouteSegment } from '../../src/map/flightDrawing'
import { pointAtDistance } from '../../src/map/flightPath'
import { pathHeadingAt, pathPoints } from '../../src/map/flightPathDrawing'
import { recordPositionAt } from '../../src/map/flightRecord'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { LiveFlight } from '../../src/map/liveFlight'
import { makeMapFlight, mapFlightProgress, type MapFlight } from '../../src/map/mapFlight'
import { isMoving, type MapLeg } from '../../src/map/tripMap'
import { airport, at, caseFlight, expectPlace, LIVE_CASES, type CaseFlight } from './liveCases'
import { FLYING, PHL, SDF, TRAIL } from './liveTrip'
import { fix, liveFlight, MINUTE, point, START } from './madeUpFlights'

const mark = (code: string, place: GeoPoint) => ({ code, city: code, place, timeZone: null })

/** A flight leg of the map, at `start` and `end`, with `flight` when it has one. */
function legOf(from: string, to: string, start: number, end: number, flight: MapFlight | null): MapLeg {
  return {
    id: 'f1', kind: 'flight', origin: mark(from, airport(from)), destination: mark(to, airport(to)), start, end, flightNumber: 'UPS1234',
    ...(flight && { flight }),
  }
}

/** SDF → PHL from noon to 2 PM, with `live`. */
function sdfPhl(live: LiveFlight | null, end = START + 120 * MINUTE): MapLeg {
  const flight = live ? makeMapFlight(START, START + 120 * MINUTE, SDF, PHL, live) : null
  return legOf('SDF', 'PHL', START, end, flight)
}

const styles = (d: FlightDrawing) => d.segments.map((s) => s.style)
const lastPoint = (s: RouteSegment) => s.points[s.points.length - 1]
const near = (a: GeoPoint, b: GeoPoint) => Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9

/** A line's places from the departure airport's side: the line ahead of a real plane is written from the arrival airport back. */
const forward = (s: RouteSegment, destination: GeoPoint) =>
  s.points.length > 1 && near(s.points[0], destination) && !near(lastPoint(s), destination) ? [...s.points].reverse() : s.points

/** The lines run on from one to the next, with no break, from the departure airport to the arrival airport. */
function expectUnbroken(d: FlightDrawing, origin: GeoPoint, destination: GeoPoint, what: string) {
  const lines = d.segments.map((s) => forward(s, destination))
  expect(near(lines[0][0], origin), `${what}: starts at the departure airport`).toBe(true)
  for (let i = 1; i < lines.length; i++) {
    expect(near(lines[i][0], lines[i - 1][lines[i - 1].length - 1]), `${what}: line ${i} starts where line ${i - 1} ends`).toBe(true)
  }
  const last = lines[lines.length - 1]
  expect(near(last[last.length - 1], destination), `${what}: ends at the arrival airport`).toBe(true)
}

const named = (name: string): CaseFlight => {
  const found = LIVE_CASES.flights.find((f) => f.name === name)
  if (!found) throw new Error(`No shared case named ${name}`)
  return found
}

describe("a flight's drawing now (Stage 3 spec §5.1, §5.4, §6.2)", () => {
  it('draws the planes every shared moment expects, with lines that never break', () => {
    for (const flightCase of LIVE_CASES.flights) {
      const live = caseFlight(flightCase.flight)
      const origin = airport(flightCase.from)
      const destination = airport(flightCase.to)
      const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), origin, destination, live)
      for (const moment of flightCase.moments) {
        const what = `${flightCase.name} at ${moment.at}`
        const t = at(moment.at)
        const leg = legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight)
        const d = flightDrawing(leg, t, false)
        expectUnbroken(d, origin, destination, what)
        if (!isMoving(leg, t)) {
          expect([d.plane, d.realPlane, d.ghost], what).toEqual([null, null, null])
        } else if (moment.plane == null) {
          expect(d.realPlane, what).toBeNull()
          expect(d.plane, what).not.toBeNull()
        } else {
          expect(d.plane, what).toBeNull()
          expectPlace(d.realPlane?.place ?? null, moment.plane, `${what}, the real plane`)
          expect(d.realPlane?.isEstimated, what).toBe(moment.phase === 'estimated')
          expectPlace(d.ghost?.place ?? null, moment.ghost, `${what}, the ghost`)
        }
      }
    }
  })

  it('in the air, draws the real path solid behind the plane, dotted where nobody saw it, and dashed ahead', () => {
    const d = flightDrawing(sdfPhl(FLYING), START + 59 * MINUTE, false)
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'upcoming'])
    expect(d.segments[0].points).toEqual([SDF, ...TRAIL.slice(0, 3).map((p) => p.place)])
    expect(d.segments[1].points).toEqual([TRAIL[2].place, TRAIL[3].place])
    // The line ahead is written from the airport back to the plane, so its dashes stay put as the plane moves.
    expect(d.segments[3].points[0]).toEqual(PHL)
    expect(near(lastPoint(d.segments[3]), d.realPlane!.place)).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(false)
    expect(d.ghost).not.toBeNull()
  })

  it('in the air, points the plane the way it is really going', () => {
    const angle = (trackDeg: number) => flightDrawing(sdfPhl({ ...FLYING, fix: fix(58, 39.66, -79.7, { trackDeg }) }), START + 59 * MINUTE, false).realPlane!.angle
    expect(angle(0)).toBeCloseTo(-Math.PI / 2, 12)
    expect(angle(90)).toBeCloseTo(0, 12)
    expect(angle(180)).toBeCloseTo(Math.PI / 2, 12)
    expect(angle(75)).toBeCloseTo((-15 * Math.PI) / 180, 12)
  })

  it('points a plane with no track along its path', () => {
    const leg = sdfPhl({ ...FLYING, fix: fix(58, 39.66, -79.7, { trackDeg: null }) })
    const t = START + 59 * MINUTE
    const along = pathHeadingAt(leg.flight!.path, mapFlightProgress(leg.flight!, t).planeDistance!)
    expect(flightDrawing(leg, t, false).realPlane!.angle).toBe(along)
  })

  it('while estimated, dots the plan behind the faded plane, from the last place it was seen', () => {
    const t = START + 75 * MINUTE
    const flight = sdfPhl(FLYING)
    const d = flightDrawing(flight, t, false)
    expect(mapFlightProgress(flight.flight!, t).phase).toBe('estimated')
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'unseen', 'upcoming'])
    const dotted = d.segments[3]
    expect(near(dotted.points[0], fix(58, 39.66, -79.7).place)).toBe(true)
    expect(near(lastPoint(dotted), d.realPlane!.place)).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(true)
    // An estimate points along its path, not the way it was going when last seen.
    expect(d.realPlane!.angle).toBe(pathHeadingAt(flight.flight!.path, mapFlightProgress(flight.flight!, t).planeDistance!))
  })

  it('draws a stretch nobody saw and the plan behind an estimated plane as one dotted line', () => {
    // Seen to 12:28, then once at 12:45, 17 minutes later, and not since.
    const gap = liveFlight(TRAIL.slice(0, 3), { fix: fix(45, 39.4, -81.8) })
    const d = flightDrawing(sdfPhl(gap), START + 60 * MINUTE, false)
    expect(styles(d)).toEqual(['seen', 'unseen', 'upcoming'])
    expect(d.segments[1].points[0]).toEqual(TRAIL[2].place)
    expect(near(lastPoint(d.segments[1]), d.realPlane!.place)).toBe(true)
  })

  it("writes the dotted line to an estimated plane from the place it was last seen, so its dots stay put as the plane flies on", () => {
    const flight = sdfPhl(FLYING)
    const first = flightDrawing(flight, START + 70 * MINUTE, false).segments
    const later = flightDrawing(flight, START + 80 * MINUTE, false).segments
    expect(first[3].style).toBe('unseen')
    expect(later[3].points[0]).toEqual(first[3].points[0])
    expect(near(lastPoint(later[3]), lastPoint(first[3]))).toBe(false)
    // And the dashed line ahead starts at the airport.
    expect(later[4].points[0]).toEqual(first[4].points[0])
  })

  it("on the ground after the plan's takeoff, draws the whole path ahead, with the ghost gone on", () => {
    const flightCase = named('still on the ground twenty minutes after')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))
    const d = flightDrawing(legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight), at(moment.at), false)
    expect(styles(d)).toEqual(['upcoming'])
    expect(d.ghost).not.toBeNull()
    expect(near(d.ghost!.place, d.realPlane!.place)).toBe(false)
  })

  it('landed and never seen in the air, dots the great circle, with the plane at the arrival airport', () => {
    const flightCase = named('landed, and never seen in the air')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const destination = airport(flightCase.to)
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), destination, caseFlight(flightCase.flight))
    const leg = legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight)
    const t = Math.min(at(moment.at), leg.end - 1)
    const d = flightDrawing(leg, t, false)
    expect(mapFlightProgress(flight!, t).phase).toBe('landed')
    expect(styles(d)).toEqual(['unseen'])
    expect(near(d.realPlane!.place, destination)).toBe(true)
    expect(d.ghost).toBeNull()
  })

  it('on the ground somewhere else, shows the real plane where it is, with no ghost', () => {
    const flightCase = named('on the ground somewhere else')
    const moment = flightCase.moments[flightCase.moments.length - 1]
    const flight = makeMapFlight(at(flightCase.departure), at(flightCase.arrival), airport(flightCase.from), airport(flightCase.to), caseFlight(flightCase.flight))
    const d = flightDrawing(legOf(flightCase.from, flightCase.to, at(moment.start), at(moment.end), flight), at(moment.at), false)
    expectPlace(d.realPlane?.place ?? null, moment.plane, 'the plane')
    expect(d.ghost).toBeNull()
  })

  it('draws a plane that came down somewhere else, after it was seen flying, where it is, with its lines as it was last seen flying them', () => {
    const diverted = liveFlight(TRAIL, { state: 'ground', fix: fix(75, 39.2, -78.4, { onGround: true }) })
    const leg = sdfPhl(diverted)
    const t = START + 76 * MINUTE
    expect(mapFlightProgress(leg.flight!, t).phase).toBe('elsewhere')
    const d = flightDrawing(leg, t, false)
    expect(near(d.realPlane!.place, { lat: 39.2, lng: -78.4 })).toBe(true)
    expect(d.ghost).toBeNull()
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'upcoming'])
    expect(near(lastPoint(d.segments[3]), pointAtDistance(leg.flight!.path, leg.flight!.path.flownLength))).toBe(true)
    expect(near(lastPoint(d.segments[3]), TRAIL[4].place)).toBe(true)
  })

  it("draws a flight that isn't live as before: the schedule's plane on the great circle", () => {
    const waiting = liveFlight([], { state: 'waiting' })
    const d = flightDrawing(sdfPhl(waiting), START + 60 * MINUTE, false)
    expect(d.realPlane).toBeNull()
    expect(d.plane).not.toBeNull()
    expect(d.segments.map((s) => [s.id, s.style, s.points.length])).toEqual([['f1-flying', 'flying', 2], ['f1-upcoming', 'upcoming', 2]])
    expect(flightDrawing(sdfPhl(null), START + 60 * MINUTE, false)).toEqual(d)
  })

  it('after it reaches its gate, is one grey line along its real path', () => {
    const landed = liveFlight(TRAIL, { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    const leg = sdfPhl(landed, START + 107 * MINUTE)
    const d = flightDrawing(leg, START + 108 * MINUTE, false)
    expect(d.segments).toEqual([{ id: 'f1-flown', points: pathPoints(leg.flight!.path), style: 'flown', geodesic: true }])
    expect([d.plane, d.realPlane, d.ghost]).toEqual([null, null, null])
  })

  it('before it leaves its gate, is dashed along its path, with no plane', () => {
    const d = flightDrawing(sdfPhl(FLYING), START - MINUTE, false)
    expect(d.segments.map((s) => s.style)).toEqual(['upcoming'])
    expect([d.plane, d.realPlane, d.ghost]).toEqual([null, null, null])
  })
})

describe("a flight's drawing in the replay (Stage 3 spec §7.3)", () => {
  it('flies a flight with a record on its record, alone', () => {
    const leg = sdfPhl(FLYING)
    const t = START + 25 * MINUTE
    const d = flightDrawing(leg, t, true)
    expect(near(d.realPlane!.place, recordPositionAt(leg.flight!.record!, t))).toBe(true)
    expect(d.realPlane?.isEstimated).toBe(false)
    expect(d.ghost).toBeNull()
    expect(d.plane).toBeNull()
  })

  it('before the plane was first seen, flies the stretch from the airport', () => {
    const late = liveFlight([point(30, 38.95, -83.6), point(40, 39.3, -82.0)], { fix: fix(41, 39.32, -81.9) })
    const d = flightDrawing(sdfPhl(late), START + 20 * MINUTE, true)
    expect(styles(d)).toEqual(['unseen', 'upcoming'])
    expect(d.segments[0].points[0]).toEqual(SDF)
  })

  it('ahead of where the plane was last seen, is an estimate', () => {
    const leg = sdfPhl(FLYING)
    const d = flightDrawing(leg, START + 80 * MINUTE, true)
    expect(d.realPlane?.isEstimated).toBe(true)
    expect(styles(d)).toEqual(['seen', 'unseen', 'seen', 'unseen', 'upcoming'])
  })

  it('of a landed flight is never an estimate', () => {
    const landed = liveFlight(TRAIL, { state: 'landed', landedAt: START + 100 * MINUTE, fix: fix(100, PHL.lat, PHL.lng, { onGround: true }) })
    const leg = sdfPhl(landed, START + 107 * MINUTE)
    for (const minutes of [20, 40, 80, 99]) expect(flightDrawing(leg, START + minutes * MINUTE, true).realPlane?.isEstimated).toBe(false)
  })

  it("draws the schedule's plane for a flight with no record", () => {
    const d = flightDrawing(sdfPhl(liveFlight([], { state: 'waiting' })), START + 60 * MINUTE, true)
    expect(d.realPlane).toBeNull()
    expect(d.plane).not.toBeNull()
  })
})

describe("a leg with no flight's live data", () => {
  it("draws the schedule's plane on the great circle, now and in the replay alike", () => {
    const leg = sdfPhl(null)
    const now = flightDrawing(leg, START + 60 * MINUTE, false)
    expect(flightDrawing(leg, START + 60 * MINUTE, true)).toEqual(now)
    expect(now.segments.map((s) => s.points)).toEqual([[SDF, now.plane!.place], [now.plane!.place, PHL]])
  })
})
