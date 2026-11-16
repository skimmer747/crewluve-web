import { describe, expect, it } from 'vitest'
import { makeFlightPath, pointAtDistance, type FlightPath } from '../../src/map/flightPath'
import { pathFramingPoints, pathHeadingAt, pathPoints, pathPointsBetween, pathRuns } from '../../src/map/flightPathDrawing'
import { pointAlong, pointsAlong, type GeoPoint } from '../../src/map/greatCircle'
import { flatMapAngle } from '../../src/map/planeHeading'
import { airport } from './liveCases'
import { liveFlight, point } from './madeUpFlights'

const LOUISVILLE = airport('SDF')
const PHILADELPHIA = airport('PHL')

/** Seen near Louisville, then north of the line, then nobody saw it for 20 minutes, then seen again: still in the air. */
const TRAIL = [point(16, 38.3, -85.4), point(22, 38.9, -84.3), point(28, 39.6, -83.1), point(48, 40.4, -79.6), point(52, 40.3, -78.9)]
const REAL = makeFlightPath(LOUISVILLE, PHILADELPHIA, liveFlight(TRAIL))
const GREAT_CIRCLE = makeFlightPath(LOUISVILLE, PHILADELPHIA)

const close = (a: GeoPoint, b: GeoPoint) => {
  expect(a.lat).toBeCloseTo(b.lat, 9)
  expect(a.lng).toBeCloseTo(b.lng, 9)
}
const closeAll = (actual: GeoPoint[], expected: GeoPoint[]) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((p, i) => close(p, expected[i]))
}

describe("a path's places (Stage 3 spec §6.2)", () => {
  it('of a great circle are its two airports', () => {
    expect(pathPoints(GREAT_CIRCLE)).toEqual([LOUISVILLE, PHILADELPHIA])
  })

  it('of a real path pass every place the plane was seen, in order', () => {
    expect(pathPoints(REAL)).toEqual([LOUISVILLE, ...TRAIL.map((p) => p.place), PHILADELPHIA])
  })
})

describe("a path's runs", () => {
  it('of the whole path are its kinds in order, each beginning where the last ended', () => {
    const runs = pathRuns(REAL, 0, REAL.length)
    expect(runs.map((r) => r.kind)).toEqual(['seen', 'unseen', 'seen', 'planned'])
    expect(runs[0].points).toEqual([LOUISVILLE, ...TRAIL.slice(0, 3).map((p) => p.place)])
    for (let i = 1; i < runs.length; i++) expect(runs[i].points[0]).toEqual(runs[i - 1].points[runs[i - 1].points.length - 1])
    expect(runs[runs.length - 1].points).toEqual([TRAIL[4].place, PHILADELPHIA])
  })

  it('cut inside a stretch end at the place that far along', () => {
    const halfway = REAL.stretches[1].startDistance + REAL.stretches[1].length / 2
    const runs = pathRuns(REAL, 0, halfway)
    expect(runs.map((r) => r.kind)).toEqual(['seen'])
    close(runs[0].points[runs[0].points.length - 1], pointAtDistance(REAL, halfway))
    const ahead = pathRuns(REAL, halfway, REAL.length)
    close(ahead[0].points[0], pointAtDistance(REAL, halfway))
  })

  it('up to where the plane was last seen leave out the way ahead', () => {
    const runs = pathRuns(REAL, 0, REAL.flownLength)
    expect(runs.map((r) => r.kind)).toEqual(['seen', 'unseen', 'seen'])
    expect(runs[runs.length - 1].points[runs[runs.length - 1].points.length - 1]).toEqual(TRAIL[4].place)
  })

  it('of a cut with no length, or backwards, are empty', () => {
    expect(pathRuns(REAL, 1000, 1000)).toEqual([])
    expect(pathRuns(REAL, 2000, 1000)).toEqual([])
    expect(pathRuns(REAL, REAL.length, REAL.length + 5000)).toEqual([])
    expect(pathRuns(REAL, -5000, 0)).toEqual([])
  })

  it('of a path that goes nowhere are empty', () => {
    expect(pathRuns(makeFlightPath(LOUISVILLE, LOUISVILLE), 0, 1000)).toEqual([])
  })

  it('of a long real path keep every place in order', () => {
    const trail = Array.from({ length: 600 }, (_, i) => point(16 + i * 0.1, 38.2 + (i * 1.6) / 600, -85.6 + (i * 10.2) / 600))
    const path = makeFlightPath(LOUISVILLE, PHILADELPHIA, liveFlight(trail))
    const runs = pathRuns(path, 0, path.flownLength)
    expect(runs).toHaveLength(1)
    expect(runs[0].points).toEqual([LOUISVILLE, ...trail.map((p) => p.place)])
  })
})

describe("a path's places between two distances", () => {
  it('are the runs joined, without their shared places twice', () => {
    const points = pathPointsBetween(REAL, 0, REAL.length)
    expect(points).toEqual(pathPoints(REAL))
    expect(pathPointsBetween(REAL, 5000, 5000)).toEqual([])
    const from = REAL.stretches[2].startDistance + 1000
    const between = pathPointsBetween(REAL, from, REAL.flownLength)
    close(between[0], pointAtDistance(REAL, from))
    expect(between.slice(1)).toEqual(TRAIL.slice(2).map((p) => p.place))
  })
})

describe("the places a path's camera frames", () => {
  it('of a great circle are the 33 places of before', () => {
    closeAll(pathFramingPoints(GREAT_CIRCLE), pointsAlong(LOUISVILLE, PHILADELPHIA, 33))
  })

  it('of a real path hold every place the plane was seen, and the airports', () => {
    const framing = pathFramingPoints(REAL)
    // Each stretch's places are worked out along its great circle, so its last can be a rounding error off the place seen.
    for (const place of pathPoints(REAL)) {
      expect(framing.some((f) => Math.abs(f.lat - place.lat) < 1e-9 && Math.abs(f.lng - place.lng) < 1e-9), JSON.stringify(place)).toBe(true)
    }
    expect(framing[0]).toEqual(LOUISVILLE)
    expect(framing[framing.length - 1]).toEqual(PHILADELPHIA)
    expect(framing.length).toBeGreaterThanOrEqual(33)
  })

  it('of a path that goes nowhere are its airport', () => {
    expect(pathFramingPoints(makeFlightPath(LOUISVILLE, LOUISVILLE))).toEqual([LOUISVILLE, LOUISVILLE])
  })
})

describe('the way a plane points on its path', () => {
  const along = (path: FlightPath, fraction: number) =>
    flatMapAngle(pointAlong(path.origin, path.destination, fraction), pointAlong(path.origin, path.destination, fraction + 0.005))

  it('along a great circle is the way ahead', () => {
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length * 0.3)).toBeCloseTo(along(GREAT_CIRCLE, 0.3)!, 9)
  })

  it('at the end is along the last of the path', () => {
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length)).toBeCloseTo(along(GREAT_CIRCLE, 0.995)!, 9)
    expect(pathHeadingAt(GREAT_CIRCLE, GREAT_CIRCLE.length * 2)).toBeCloseTo(along(GREAT_CIRCLE, 0.995)!, 9)
  })

  it("before the path's start is the way at its start", () => {
    expect(pathHeadingAt(GREAT_CIRCLE, -10_000)).toBeCloseTo(pathHeadingAt(GREAT_CIRCLE, 0)!, 12)
  })

  it('on a real path is along the path flown, not towards the airport', () => {
    // Between the second and third places seen the plane flew west-north-west of the line to Philadelphia.
    const middle = REAL.stretches[2].startDistance + REAL.stretches[2].length / 2
    const flown = flatMapAngle(TRAIL[1].place, TRAIL[2].place)!
    const straight = flatMapAngle(pointAtDistance(REAL, middle), PHILADELPHIA)!
    const heading = pathHeadingAt(REAL, middle)!
    expect(Math.abs(heading - flown)).toBeLessThan(0.01)
    expect(Math.abs(heading - straight)).toBeGreaterThan(0.05)
  })

  it('is null on a path that goes nowhere', () => {
    expect(pathHeadingAt(makeFlightPath(LOUISVILLE, LOUISVILLE), 0)).toBeNull()
  })
})
