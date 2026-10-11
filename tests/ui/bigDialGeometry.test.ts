import { describe, expect, it } from 'vitest'
import { departureMarkerPath, departureSweep, DETAIL, homeArrow, planeSpot, turnPath, wedgePath } from '../../src/ui/bigDialGeometry'
import { DIAL } from '../../src/ui/sunDialGeometry'

describe('the big dial’s measurements', () => {
  it('scale every card measurement by 2.25 at the popup’s 360 px', () => {
    const scale = 360 / DIAL.size
    expect(scale).toBe(2.25)
    expect(DETAIL.homeIcon * scale).toBe(22.5)
    expect(DETAIL.arrowhead * scale).toBe(11.25)
  })

  it('put the home arrow at 0.70 of the radius, the sweep at 0.85, and the departure plane 2 points past the triangle', () => {
    expect(DETAIL.arrowRadius).toBeCloseTo(29.4, 9)
    expect(DETAIL.sweepRadius).toBeCloseTo(35.7, 9)
    expect(DETAIL.planeRadius).toBe(50)
    expect([DETAIL.plane, DETAIL.sweepPlane, DETAIL.arrowheadSpread]).toEqual([10, 8, 25])
  })
})

describe('turnPath', () => {
  it('turns clockwise for a positive sweep and counterclockwise for a negative one', () => {
    expect(turnPath(270, 90, 42)).toBe('M80 40A42 42 0 0 1 122 82')
    expect(turnPath(270, -90, 42)).toBe('M80 40A42 42 0 0 0 38 82')
  })

  it('goes round more than once in pieces of at most half a turn', () => {
    expect(turnPath(90, 450, 42)).toBe('M80 124A42 42 0 0 1 80 40A42 42 0 0 1 80 124A42 42 0 0 1 38 82')
  })

  it('is just a starting point when there’s nothing to turn', () => {
    expect(turnPath(270, 0, 42)).toBe('M80 40')
  })
})

describe('homeArrow', () => {
  it('runs clockwise from home’s time to the pilot’s when the pilot is ahead, with the arrowhead pointing on', () => {
    // Home at noon (270), pilot at 6 pm (360): the arrowhead's sides trail back up from the tip at 3 o'clock.
    expect(homeArrow(270, 360, true, 1)).toEqual({
      arc: turnPath(270, 90, DETAIL.arrowRadius),
      head: 'M109.4 82L111.51 77.47L107.29 77.47Z',
    })
  })

  it('runs counterclockwise when the pilot is behind', () => {
    // Home at noon, pilot at 8 am (210): the arrow turns back 60°.
    expect(homeArrow(270, 210, false, 1)).toEqual({
      arc: turnPath(270, -60, DETAIL.arrowRadius),
      head: 'M54.54 67.3L58.63 64.43L54.97 62.32Z',
    })
  })

  it('draws part of the way while it sweeps, and nothing before it starts', () => {
    expect(homeArrow(270, 360, true, 0.5)).toEqual({
      arc: turnPath(270, 45, DETAIL.arrowRadius),
      head: 'M100.79 61.21L99.08 56.51L96.09 59.5Z',
    })
    expect(homeArrow(270, 360, true, 0)).toBeNull()
  })

  it('takes the short way round past midnight', () => {
    // Home at 11 pm (435), pilot at 1 am the next day (465) and 2 hours ahead: 30° clockwise, not 330° back.
    expect(homeArrow(435, 465, true, 1)!.arc).toBe(turnPath(435, 30, DETAIL.arrowRadius))
  })
})

describe('departureSweep', () => {
  // Now is noon (270); 5 pm is 345.
  const base = { now: 270, scheduled: 345, actual: 345, hoursToScheduled: 5, hoursToActual: 5, progress: 1 }
  const r = DETAIL.sweepRadius

  it('sweeps clockwise from now to the departure within a day, solid', () => {
    expect(departureSweep(base)).toEqual({ laps: null, solid: turnPath(270, 75, r), delay: null, tip: 345 })
    expect(departureSweep({ ...base, progress: 0.5 })).toEqual({ laps: null, solid: turnPath(270, 37.5, r), delay: null, tip: 307.5 })
  })

  it('draws nothing before it starts', () => {
    expect(departureSweep({ ...base, progress: 0 })).toEqual({ laps: null, solid: null, delay: null, tip: 270 })
  })

  it('goes once round dashed for each full day ahead, then solid for the rest', () => {
    // Tomorrow at 3 pm, 27 hours ahead: one 360° lap, then 45° more.
    const far = { ...base, scheduled: 315, actual: 315, hoursToScheduled: 27, hoursToActual: 27 }
    expect(departureSweep(far)).toEqual({ laps: turnPath(270, 360, r), solid: turnPath(630, 45, r), delay: null, tip: 675 })
    // Halfway through, it's still on its first lap.
    expect(departureSweep({ ...far, progress: 0.5 })).toEqual({ laps: turnPath(270, 202.5, r), solid: null, delay: null, tip: 472.5 })
  })

  it('runs on in red from the scheduled time to the actual one when late', () => {
    // 40 minutes late: 5:40 pm is 355.
    const late = { ...base, actual: 355, hoursToActual: 5 + 40 / 60 }
    expect(departureSweep(late)).toEqual({ laps: null, solid: turnPath(270, 75, r), delay: turnPath(345, 10, r), tip: 355 })
  })

  it('stops at the actual time when early, short of the scheduled one', () => {
    // 20 minutes early: 4:40 pm is 340.
    const early = { ...base, actual: 340, hoursToActual: 4 + 40 / 60 }
    expect(departureSweep(early)).toEqual({ laps: null, solid: turnPath(270, 70, r), delay: null, tip: 340 })
  })

  it('draws no red for an early departure, even when its clock time matches the scheduled one a day on', () => {
    // Now is 12:00:30; the flight is due at 12:00 tomorrow, 30 seconds short of a day, and leaves 20 minutes early.
    // Both clocks read 12:00, so the scheduled time is 0° round from now and the actual time 355°: the app draws
    // neither cyan nor red.
    const early = { now: 270, scheduled: 270, actual: 265, hoursToScheduled: 24 - 0.5 / 60, hoursToActual: 24 - 20.5 / 60, progress: 1 }
    expect(departureSweep(early)).toEqual({ laps: null, solid: null, delay: null, tip: 625 })
  })

  it('counts full laps to the scheduled time, and goes past a day only by the actual time', () => {
    // Late across a day: due in 23 hours (11 am tomorrow, 255), leaving in 25 (1 pm, 285).
    expect(departureSweep({ ...base, scheduled: 255, actual: 285, hoursToScheduled: 23, hoursToActual: 25 })).toEqual({
      laps: null,
      solid: turnPath(270, 345, r),
      delay: turnPath(615, 30, r),
      tip: 645,
    })
    // Early across a day: due in 25 hours (1 pm, 285), leaving in 23.5 (11:30 am, 262.5).
    expect(departureSweep({ ...base, scheduled: 285, actual: 262.5, hoursToScheduled: 25, hoursToActual: 23.5 })).toEqual({
      laps: null,
      solid: turnPath(270, 352.5, r),
      delay: null,
      tip: 622.5,
    })
  })

  it('draws a departure exactly a day ahead as one solid lap', () => {
    expect(departureSweep({ ...base, scheduled: 270, actual: 270, hoursToScheduled: 24, hoursToActual: 24 })).toEqual({
      laps: null,
      solid: turnPath(270, 360, r),
      delay: null,
      tip: 630,
    })
  })

  it('sweeps cyan to the actual time when the scheduled time has already passed, as the app does', () => {
    // Due 20 minutes ago (11:40 am, 265), leaving in 20 minutes (12:20 pm, 275).
    expect(departureSweep({ ...base, scheduled: 265, actual: 275, hoursToScheduled: -1 / 3, hoursToActual: 1 / 3 })).toEqual({
      laps: null,
      solid: turnPath(270, 5, r),
      delay: null,
      tip: 275,
    })
  })
})

describe('the departure’s marks', () => {
  it('turns the triangle to point at the center wherever the departure falls', () => {
    // At noon it's the noon marker with its corners swapped; at 6 pm it points left, into the circle.
    expect(departureMarkerPath(270)).toBe('M80 40L83.5 34L76.5 34Z')
    expect(departureMarkerPath(0)).toBe('M122 82L128 85.5L128 78.5Z')
  })

  it('centers a plane on its spot and turns it to point clockwise along the circle', () => {
    // At 6 pm it points down; at noon, right.
    expect(planeSpot(0, DETAIL.planeRadius, DETAIL.plane)).toEqual({ corner: { x: 125, y: 77 }, rotate: 180 })
    expect(planeSpot(270, DETAIL.planeRadius, DETAIL.plane)).toEqual({ corner: { x: 75, y: 27 }, rotate: 90 })
    // A tip laps round: the angle wraps, the place doesn't change.
    expect(planeSpot(270 + 720, DETAIL.sweepRadius, DETAIL.sweepPlane)).toEqual(planeSpot(270, DETAIL.sweepRadius, DETAIL.sweepPlane))
  })
})

describe('wedgePath', () => {
  it('runs from the center out to the circle and clockwise round it', () => {
    // 8 am (210) to 2 pm (300).
    expect(wedgePath(210, 300)).toBe('M80 82L43.63 61A42 42 0 0 1 101 45.63Z')
  })

  it('takes the long way round for more than 12 hours', () => {
    expect(wedgePath(180, 405)).toBe('M80 82L38 82A42 42 0 1 1 109.7 111.7Z')
  })
})
