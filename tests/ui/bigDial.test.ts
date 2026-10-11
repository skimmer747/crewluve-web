import { describe, expect, it } from 'vitest'
import { bigDialLayers, bigDialTurns, type DialDetail } from '../../src/ui/bigDial'
import type { DialMoment } from '../../src/ui/dialTimeline'
import {
  arcPath,
  cornerFor,
  departureMarkerPath,
  departureSweep,
  DETAIL,
  dialAngle,
  homeArrow,
  hourAngle,
  labelAt,
  planeSpot,
  pointAt,
  wedgePath,
} from '../../src/ui/sunDialGeometry'
import { DAY, HOUR, MINUTE } from '../../src/time/zoned'

const ANC = 'America/Anchorage'
const NY = 'America/New_York'
// Anchorage on 10 October 2026: sunrise 8:30 AM, sunset 7:03 PM; 10:05 PM now. New York: 7:13 AM to 6:28 PM.
const sun = { sunrise: Date.UTC(2026, 9, 10, 16, 30), sunset: Date.UTC(2026, 9, 11, 3, 3) }
const homeSun = { sunrise: Date.UTC(2026, 9, 10, 11, 13), sunset: Date.UTC(2026, 9, 10, 22, 28) }
const now = Date.UTC(2026, 9, 11, 6, 5)
const scheduled = now + 5 * HOUR + 20 * MINUTE // 3:25 AM
const onTime = { scheduled, actual: scheduled }
const detail: DialDetail = { homeTz: NY, homeSun, departure: onTime, still: false }

const drawn: DialMoment = { home: { progress: 1, opacity: 1, middle: 1 }, departure: { progress: 1, opacity: 1, middle: 1 } }
const idle: DialMoment = { home: { progress: 0, opacity: 1, middle: 0 }, departure: { progress: 0, opacity: 1, middle: 0 } }
const layers = (d: DialDetail, moment = drawn, h24 = false) => bigDialLayers(sun, now, ANC, h24, d, moment)

describe('bigDialTurns', () => {
  it('has the home turn while the clocks differ, and the departure turn while the departure is ahead', () => {
    expect(bigDialTurns(now, ANC, detail)).toEqual({ home: true, departureDays: (5 * HOUR + 20 * MINUTE) / DAY, still: false })
    expect(bigDialTurns(now, ANC, { ...detail, homeTz: ANC, still: true })).toEqual({ home: false, departureDays: (5 * HOUR + 20 * MINUTE) / DAY, still: true })
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled: now - MINUTE, actual: now - MINUTE } }).departureDays).toBeNull()
    expect(bigDialTurns(now, ANC, { ...detail, departure: null }).departureDays).toBeNull()
  })

  it('counts to the actual time only when it’s 15 minutes or more off', () => {
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }).departureDays).toBe((6 * HOUR) / DAY)
    expect(bigDialTurns(now, ANC, { ...detail, departure: { scheduled, actual: scheduled + 10 * MINUTE } }).departureDays).toBe((5 * HOUR + 20 * MINUTE) / DAY)
  })
})

describe('bigDialLayers: home', () => {
  const homeAngle = dialAngle(now, NY)

  it('draws home’s hand and house at home’s time, and the shared daylight on home’s clock', () => {
    const home = layers(detail).home!
    expect(home.hand).toEqual(pointAt(homeAngle, 42))
    expect(home.house).toEqual(cornerFor(pointAt(homeAngle, 42), DETAIL.homeIcon))
    // Anchorage's day is 12:30 PM to 11:03 PM on New York's clock; New York's ends at 6:28 PM.
    const from = hourAngle(12.5)
    const to = hourAngle(18 + 28 / 60)
    expect(home.shared).toHaveLength(1)
    expect(home.shared[0].wedge).toBe(wedgePath(from, to))
    expect(home.shared[0].arc).toBe(arcPath(from, to, 42))
  })

  it('says how far behind, and draws the arrow back from home’s time to the pilot’s as the loop runs', () => {
    const home = layers(detail).home!
    expect([home.amount, home.ahead]).toEqual(['-4h', false])
    expect(home.arrow).toEqual(homeArrow(homeAngle, dialAngle(now, ANC), false, 1))
    expect(home.turn).toEqual(drawn.home)
    expect(layers(detail, idle).home!.arrow).toBeNull()
  })

  it('leaves out the shared daylight without home’s sun times, and everything of home’s on the same clock', () => {
    expect(layers({ ...detail, homeSun: null }).home!.shared).toEqual([])
    expect(layers({ ...detail, homeTz: ANC }).home).toBeNull()
  })
})

describe('bigDialLayers: the departure', () => {
  const at = (ms: number) => dialAngle(ms, ANC)

  it('marks the scheduled time with a hand, a turned triangle, a plane and its label', () => {
    const departure = layers(detail).departure!
    expect(departure.hand).toEqual(pointAt(at(scheduled), 42))
    expect(departure.marker).toBe(departureMarkerPath(at(scheduled)))
    expect(departure.plane).toEqual(planeSpot(at(scheduled), DETAIL.planeRadius, DETAIL.plane))
    expect(departure.label).toEqual({ at: labelAt(at(scheduled)), text: '3:25a' })
    expect(departure.delay).toBeNull()
    expect(layers(detail, drawn, true).departure!.label.text).toBe('03:25')
  })

  it('sweeps from now to the departure, with the plane riding its end and the countdown in the middle', () => {
    const departure = layers(detail).departure!
    expect(departure.sweep).toEqual(
      departureSweep({ now: at(now), scheduled: at(scheduled), actual: at(scheduled), hoursToScheduled: 5 + 1 / 3, hoursToActual: 5 + 1 / 3, progress: 1 }),
    )
    expect(departure.rider).toEqual(planeSpot(departure.sweep.tip, DETAIL.sweepRadius, DETAIL.sweepPlane))
    expect([departure.countdown, departure.tone]).toEqual(['5h20m', 'on-time'])
    expect(layers(detail, idle).departure!.sweep.solid).toBeNull()
  })

  it('adds red marks at the actual time and a red sweep past the scheduled one when late', () => {
    const late = layers({ ...detail, departure: { scheduled, actual: scheduled + 40 * MINUTE } }).departure!
    expect(late.delay).toEqual({
      hand: pointAt(at(scheduled + 40 * MINUTE), 42),
      plane: planeSpot(at(scheduled + 40 * MINUTE), DETAIL.planeRadius, DETAIL.plane),
      label: { at: labelAt(at(scheduled + 40 * MINUTE)), text: '4:05a' },
    })
    expect(late.sweep.delay).not.toBeNull()
    expect([late.countdown, late.tone]).toEqual(['6h', 'late'])
  })

  it('marks an early departure’s actual time too, with no red sweep and a green rider', () => {
    const early = layers({ ...detail, departure: { scheduled, actual: scheduled - 20 * MINUTE } }).departure!
    expect(early.delay!.label.text).toBe('3:05a')
    expect(early.sweep.delay).toBeNull()
    expect([early.countdown, early.tone]).toEqual(['5h', 'early'])
  })

  it('treats a departure under 15 minutes off as on time', () => {
    const slightly = layers({ ...detail, departure: { scheduled, actual: scheduled + 10 * MINUTE } }).departure!
    expect([slightly.delay, slightly.tone, slightly.countdown]).toEqual([null, 'on-time', '5h20m'])
  })

  it('shows nothing of a departure that’s gone or missing', () => {
    expect(layers({ ...detail, departure: { scheduled: now - MINUTE, actual: now - MINUTE } }).departure).toBeNull()
    expect(layers({ ...detail, departure: null }).departure).toBeNull()
  })
})
