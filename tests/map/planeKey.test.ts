import { describe, expect, it } from 'vitest'
import { showsPlaneKey, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { liveTripMap, PHL, SDF, TRAIL } from './liveTrip'
import { fix, liveFlight, MINUTE, START } from './madeUpFlights'

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

/** The map's drawing at `t`, with `live` as the flight's answer. */
const drawingAt = (t: number, live: Parameters<typeof liveTripMap>[1], isReplay = false) => {
  const map = liveTripMap(t, live)
  return { map, drawing: tripMapDrawing(map, t, isReplay) }
}

describe('the key to the two planes (which plane design §2)', () => {
  it('shows while the real plane flies beside its ghost, and the drawing names their flight', () => {
    const { map, drawing } = drawingAt(IN_THE_AIR, undefined)
    expect(showsPlaneKey(drawing)).toBe(true)
    expect(drawing.liveLeg).toBe(map.legs[0])
  })

  it('shows while the real plane is an estimate', () => {
    expect(showsPlaneKey(drawingAt(ESTIMATED, undefined).drawing)).toBe(true)
  })

  it('shows while the real plane is still at the gate after its takeoff time', () => {
    const atTheGate = liveFlight([], { legId: 'f1', state: 'ground', fix: fix(24, SDF.lat, SDF.lng, { onGround: true, trackDeg: null }) })
    const { drawing } = drawingAt(START + 25 * MINUTE, atTheGate)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(true)
  })

  it("doesn't show in a replay, which draws the real plane alone", () => {
    const { map, drawing } = drawingAt(START + 30 * MINUTE, undefined, true)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(false)
    expect(drawing.liveLeg).toBe(map.legs[0])
  })

  it("doesn't show once the plane has landed and its ghost has gone", () => {
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    const { drawing } = drawingAt(START + 112 * MINUTE, landed)
    expect(drawing.realPlane).not.toBeNull()
    expect(showsPlaneKey(drawing)).toBe(false)
  })

  it("doesn't show for a flight with no live data, and the drawing names no flight", () => {
    const { drawing } = drawingAt(IN_THE_AIR, null)
    expect(showsPlaneKey(drawing)).toBe(false)
    expect(drawing.liveLeg).toBeNull()
  })
})
