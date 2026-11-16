import { describe, expect, it } from 'vitest'
import { readLiveAnswer, readLiveFlight } from '../../src/partner/liveAnswer'
import { LIVE_CASES } from '../map/liveCases'

const FIX = {
  lat: 39.64,
  lon: -80.38,
  altitude_ft: 35_000,
  ground_speed_kt: 430,
  track_deg: 80,
  on_ground: false,
  registration: 'N370UP',
  type_code: 'B763',
  seen_at: 1_794_573_700_000,
}

const FLIGHT = {
  leg_id: 'leg-phl',
  callsign: 'UPS1234',
  state: 'airborne',
  fix: FIX,
  landed_at: null,
  trail: [[1_794_571_500_000, 38.19, -85.67, 2000], [1_794_571_620_000, 38.28, -85.39, null]],
  trail_count: 2,
}

const answer = (flights: unknown[]) => ({ now: 1_794_573_710_000, cursor: 41, flights })

describe("reading partner_live's answer (partner-api.md, \"The live plane\")", () => {
  it('reads the clock, the cursor and each flight, with places as the map has them', () => {
    expect(readLiveAnswer(answer([FLIGHT]))).toEqual({
      now: 1_794_573_710_000,
      cursor: 41,
      flights: [
        {
          legId: 'leg-phl',
          callsign: 'UPS1234',
          state: 'airborne',
          fix: {
            place: { lat: 39.64, lng: -80.38 },
            altitudeFt: 35_000,
            groundSpeedKt: 430,
            trackDeg: 80,
            onGround: false,
            registration: 'N370UP',
            typeCode: 'B763',
            seenAt: 1_794_573_700_000,
          },
          landedAt: null,
          trail: [
            { time: 1_794_571_500_000, place: { lat: 38.19, lng: -85.67 }, altitudeFt: 2000 },
            { time: 1_794_571_620_000, place: { lat: 38.28, lng: -85.39 }, altitudeFt: null },
          ],
          trailCount: 2,
        },
      ],
    })
  })

  it('reads a landed flight, with its landing time and a fix on the ground', () => {
    const landed = { ...FLIGHT, state: 'landed', landed_at: 1_794_580_000_000, fix: { ...FIX, on_ground: true, altitude_ft: null, track_deg: null } }
    expect(readLiveFlight(landed)).toMatchObject({ state: 'landed', landedAt: 1_794_580_000_000, fix: { onGround: true, altitudeFt: null, trackDeg: null } })
  })

  it('reads a flight never seen, with no fix', () => {
    expect(readLiveFlight({ ...FLIGHT, state: 'waiting', fix: null, trail: [], trail_count: 0 })).toMatchObject({ state: 'waiting', fix: null, trail: [] })
  })

  it("reads a state this site doesn't know as waiting, so the schedule's plane shows", () => {
    expect(readLiveFlight({ ...FLIGHT, state: 'taxiing' })?.state).toBe('waiting')
  })

  it('takes the fields the door may leave out as null, and a point with no altitude', () => {
    const { altitude_ft: _a, ground_speed_kt: _g, track_deg: _t, registration: _r, type_code: _c, ...bare } = FIX
    const { landed_at: _l, ...noLanding } = FLIGHT
    expect(readLiveFlight({ ...noLanding, fix: bare, trail: [[1, 2, 3]] })).toMatchObject({
      landedAt: null,
      fix: { altitudeFt: null, groundSpeedKt: null, trackDeg: null, registration: null, typeCode: null },
      trail: [{ time: 1, place: { lat: 2, lng: 3 }, altitudeFt: null }],
    })
  })

  it('reads every flight of the shared cases', () => {
    const flights = [...LIVE_CASES.flights.map((c) => c.flight), ...LIVE_CASES.windows.map((w) => w.flight)].filter((f) => f != null)
    expect(flights.length).toBeGreaterThan(0)
    for (const flight of flights) expect(readLiveFlight(flight)).not.toBeNull()
  })

  it.each([
    ['no clock', { cursor: 1, flights: [] }],
    ['a cursor that is no whole number', { now: 1, cursor: 1.5, flights: [] }],
    ['flights that are no list', { now: 1, cursor: 1, flights: {} }],
    ['a flight with no leg id', answer([{ ...FLIGHT, leg_id: undefined }])],
    ['a state that is no text', answer([{ ...FLIGHT, state: 3 }])],
    ['a trail count that is no whole number', answer([{ ...FLIGHT, trail_count: '2' }])],
    ['a fix with no time', answer([{ ...FLIGHT, fix: { ...FIX, seen_at: null } }])],
    ['a fix with an altitude that is text', answer([{ ...FLIGHT, fix: { ...FIX, altitude_ft: '35000' } }])],
    ['a fix that does not say whether it is on the ground', answer([{ ...FLIGHT, fix: { ...FIX, on_ground: 'no' } }])],
    ['a fix that is a list', answer([{ ...FLIGHT, fix: [1, 2] }])],
    ['a landing time that is text', answer([{ ...FLIGHT, landed_at: 'soon' }])],
    ['a trail point with no longitude', answer([{ ...FLIGHT, trail: [[1, 2]] }])],
    ['a trail point that is no list', answer([{ ...FLIGHT, trail: [{ time: 1 }] }])],
    ['a flight that is no object', answer(['UPS1234'])],
  ])("can't be read with %s", (_name, body) => {
    expect(readLiveAnswer(body as Record<string, unknown>)).toBeNull()
  })
})
