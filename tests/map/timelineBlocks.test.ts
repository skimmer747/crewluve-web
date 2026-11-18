import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { liveClock } from '../../src/map/replayClock'
import { timelineBlocks, waitLabel } from '../../src/map/timelineBlocks'
import { tripWaits } from '../../src/map/tripActivity'
import { makeTripMap, type TripMap } from '../../src/map/tripMap'
import { AIRPORTS, at, drive, EUROPE, flight, HOUR } from './tripMapLegs'

/** The app's shared cases (Crewluv's CrewluvTests/Fixtures/TripMap): change both copies together. */
const cases = JSON.parse(readFileSync(new URL('../fixtures/trip-map/replay-cases.json', import.meta.url), 'utf8')) as {
  waitLabels: { hours: number; label: string | null; note: string }[]
}

const clockFor = (map: TripMap, quickLayovers: boolean) => liveClock(map.span, map.legs, tripWaits(map), quickLayovers)
const europe = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!

describe("the timeline's blocks (activity markers design §4.1)", () => {
  it('are the flights and two small layovers with Quick layovers on', () => {
    expect(timelineBlocks(europe, clockFor(europe, true))).toEqual([
      { kind: 'flying', start: 0, end: 32 / 118, label: null },
      { kind: 'layover', start: 32 / 118, end: 35 / 118, label: '24h' },
      { kind: 'flying', start: 35 / 118, end: 59 / 118, label: null },
      { kind: 'layover', start: 59 / 118, end: 62 / 118, label: '20h' },
      { kind: 'flying', start: 62 / 118, end: 1, label: null },
    ])
  })

  it('give the layovers their full share with Quick layovers off', () => {
    // 288 s in all: each edge is its replay seconds over 288.
    expect(timelineBlocks(europe, clockFor(europe, false)).map((b) => [b.kind, b.start, b.end])).toEqual([
      ['flying', 0, 32 / 288], ['layover', 32 / 288, 128 / 288], ['flying', 128 / 288, 152 / 288], ['layover', 152 / 288, 232 / 288], ['flying', 232 / 288, 1],
    ])
  })

  it('are flying where a flight overlaps a drive', () => {
    const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 2), flight('f1', 'LEX', 'CGN', 1, 8)], { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
    expect(timelineBlocks(map, clockFor(map, true)).map((b) => [b.kind, b.end])).toEqual([['driving', 1 / 9], ['flying', 1]])
  })

  it('are none for a trip with no length', () => {
    const map = makeTripMap([flight('f1', 'SDF', 'CGN', 0, 0)], { isNextTrip: false, home: 'SDF', now: at(0), airports: AIRPORTS })!
    expect(timelineBlocks(map, clockFor(map, true))).toEqual([])
  })
})

describe("a wait's length on its block: the shared cases", () => {
  it.each(cases.waitLabels)('$hours h is $label ($note)', ({ hours, label }) => {
    expect(waitLabel(hours * HOUR)).toBe(label)
  })
})
