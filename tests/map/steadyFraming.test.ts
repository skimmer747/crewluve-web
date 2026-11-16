import { describe, expect, it } from 'vitest'
import { framesAll } from '../../src/map/mapFit'
import { framingSubject } from '../../src/map/tripMap'
import { liveTripMap } from './liveTrip'
import { MINUTE, START } from './madeUpFlights'

const p = (lat: number, lng: number) => ({ lat, lng })

describe('whether a frame still shows a path that grew (Stage 3 spec §6.2)', () => {
  const kept = [p(38, -86), p(40, -75)]

  it('holds places inside the rectangle the kept places frame, with its room around them', () => {
    expect(framesAll(kept, [p(39, -80), p(38, -86)])).toBe(true)
    // The frame has a fifth of its size spare on each side.
    expect(framesAll(kept, [p(40.3, -74.5)])).toBe(true)
  })

  it('lets go once a place lies outside it', () => {
    expect(framesAll(kept, [p(39, -80), p(46, -80)])).toBe(false)
    expect(framesAll(kept, [p(39, -60)])).toBe(false)
  })

  it('counts a place across the date line on the copy of the world nearest the frame', () => {
    const pacific = [p(61, 150), p(61, -150)]
    expect(framesAll(pacific, [p(61, 179.5), p(61, -179.5)])).toBe(true)
  })

  it('frames nothing from no places, but no places', () => {
    expect(framesAll([], [])).toBe(true)
    expect(framesAll([], [p(0, 0)])).toBe(false)
  })
})

describe('what the camera frames, as a key', () => {
  const map = liveTripMap(START + 30 * MINUTE)

  it('is the leg in focus, or the whole trip by its legs, so another trip is framed afresh', () => {
    expect(framingSubject(map, map.legs[0])).toBe('f1')
    expect(framingSubject(map, null)).toBe('f1')
    const other = { ...map, legs: [{ ...map.legs[0], id: 'f7' }, { ...map.legs[0], id: 'f8' }] }
    expect(framingSubject(other, null)).toBe('f7,f8')
  })
})
