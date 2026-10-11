import { describe, expect, it } from 'vitest'
import { arcPath, cornerFor, dialAngle, glowBands, hourAngle, labelAt, markerPath, pointAt, skyBackground, skyStops, tickAt } from '../../src/ui/sunDialGeometry'

const NY = 'America/New_York'
/** 10 October 2026 at `hour`:`minute` in New York (EDT, UTC-4). */
const ny = (hour: number, minute = 0) => Date.UTC(2026, 9, 10, hour + 4, minute)

describe('dialAngle', () => {
  it('puts midnight at the bottom, 6 am at the left, noon at the top and 6 pm at the right', () => {
    expect(dialAngle(ny(0), NY)).toBe(90)
    expect(dialAngle(ny(6), NY)).toBe(180)
    expect(dialAngle(ny(12), NY)).toBe(270)
    expect(dialAngle(ny(18), NY)).toBe(360)
    expect(dialAngle(ny(8, 12), NY)).toBe(213)
  })

  it('reads the clock in the zone it is given', () => {
    // Noon in New York is 9 am in Los Angeles.
    expect(dialAngle(ny(12), 'America/Los_Angeles')).toBe(225)
  })
})

describe('pointAt', () => {
  it('measures from the circle’s center, 2 points below the middle of the 160-point box', () => {
    const at = (angle: number) => {
      const p = pointAt(angle, 42)
      return [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000]
    }
    expect(at(90)).toEqual([80, 124])
    expect(at(180)).toEqual([38, 82])
    expect(at(270)).toEqual([80, 40])
    expect(at(360)).toEqual([122, 82])
  })

  it('rounds to hundredths, which keeps the SVG’s numbers short', () => {
    expect(pointAt(213, 42)).toEqual({ x: 44.78, y: 59.13 })
  })
})

describe('arcPath', () => {
  it('draws clockwise from the first angle to the second', () => {
    // 6 am to 6 pm goes over the top; 6 pm to 6 am goes under the bottom.
    expect(arcPath(180, 360, 42)).toBe('M38 82A42 42 0 0 1 122 82')
    expect(arcPath(360, 180, 42)).toBe('M122 82A42 42 0 0 1 38 82')
  })

  it('takes the long way round when the arc is more than half the circle', () => {
    expect(arcPath(180, 405, 42)).toBe('M38 82A42 42 0 1 1 109.7 111.7')
  })

  it('draws a night longer than 12 hours the long way round, from sunset back past 3 o’clock to sunrise', () => {
    // Sunset 7:00 pm (375°), sunrise 8:00 am (210°): 13 hours of night.
    expect(arcPath(375, 210, 42)).toBe('M120.57 92.87A42 42 0 1 1 43.63 61')
  })

  it('rounds a computed radius too', () => {
    expect(arcPath(180, 360, 42 * 0.85)).toBe('M44.3 82A35.7 35.7 0 0 1 115.7 82')
  })
})

describe('glowBands', () => {
  it('lays 30 minutes of golden hour inside the daylight and 30 of twilight outside it, at both ends', () => {
    expect(glowBands(213, 378)).toEqual([
      { kind: 'golden', from: 213, to: 220.5 },
      { kind: 'golden', from: 370.5, to: 378 },
      { kind: 'twilight', from: 205.5, to: 213 },
      { kind: 'twilight', from: 378, to: 385.5 },
    ])
  })

  it('measures the daylight round the dial, wherever 3 o’clock falls', () => {
    // The same sunset written as 18° instead of 378° still gets full 30-minute golden bands.
    const [morning, evening] = glowBands(213, 18)
    expect(morning).toEqual({ kind: 'golden', from: 213, to: 220.5 })
    expect(evening).toEqual({ kind: 'golden', from: 10.5, to: 18 })
  })

  it('keeps each golden band to half the daylight on a very short day, and the twilight at 30 minutes', () => {
    const [morning, evening, dawn, dusk] = glowBands(260, 270)
    expect(morning).toEqual({ kind: 'golden', from: 260, to: 265 })
    expect(evening).toEqual({ kind: 'golden', from: 265, to: 270 })
    expect(dawn).toEqual({ kind: 'twilight', from: 252.5, to: 260 })
    expect(dusk).toEqual({ kind: 'twilight', from: 270, to: 277.5 })
  })
})

describe('cornerFor', () => {
  it('gives the top-left corner that centers an icon on a point, rounded after the subtraction', () => {
    // 69.6 - 7 is 62.599999999999994 in floating point.
    expect(cornerFor({ x: 69.6, y: 59.13 }, 14)).toEqual({ x: 62.6, y: 52.13 })
  })
})

describe('markers, ticks and labels', () => {
  it('points the noon triangle at the top of the circle and the midnight one at the bottom', () => {
    expect(markerPath(270)).toBe('M80 40L76.5 34L83.5 34Z')
    expect(markerPath(90)).toBe('M80 124L76.5 130L83.5 130Z')
  })

  it('crosses the circle with a 6-point tick', () => {
    const tick = tickAt(180)
    expect([tick.from.x, tick.from.y, tick.to.x, tick.to.y].map((v) => Math.round(v * 1000) / 1000)).toEqual([41, 82, 35, 82])
  })

  it('puts the labels 38 points beyond the circle, kept 22 points from the sides and 8 from the top and bottom', () => {
    const at = (angle: number) => {
      const p = labelAt(angle)
      return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]
    }
    expect(at(180)).toEqual([22, 82])
    expect(at(360)).toEqual([138, 82])
    expect(at(270)).toEqual([80, 8])
    expect(at(405)).toEqual([136.57, 138.57])
  })
})

describe('the sky', () => {
  it('runs navy, amber at sunrise, sky blue by day, amber at sunset, navy again, from 3 o’clock round', () => {
    // Sunrise 8:12 am (213°), sunset 7:12 pm (378°, just past 3 o'clock).
    const stops = skyStops(213, 378).map((s) => [s.color, Math.round(s.at * 10000) / 10000])
    expect(stops).toEqual([
      ['rgb(102, 179, 255)', 0.01],
      ['rgb(230, 153, 51)', 0.05],
      ['rgb(13, 13, 51)', 0.07],
      ['rgb(13, 13, 51)', 0.25],
      ['rgb(13, 13, 51)', 0.25],
      ['rgb(13, 13, 51)', 0.5717],
      ['rgb(230, 153, 51)', 0.5917],
      ['rgb(102, 179, 255)', 0.6317],
      ['rgb(102, 179, 255)', 0.75],
    ])
  })

  it('wraps the navy that follows a sunset just before 6 pm round to the start of the turn', () => {
    // Sunset 5:45 pm (356.25°): the navy 2% after it lands just past 3 o'clock, at the start of the gradient.
    const stops = skyStops(213, 356.25).map((s) => [s.color, Math.round(s.at * 10000) / 10000])
    expect(stops[0]).toEqual(['rgb(13, 13, 51)', 0.0096])
    expect(stops[stops.length - 1]).toEqual(['rgb(230, 153, 51)', 0.9896])
  })

  it('becomes a conic gradient that starts at 3 o’clock', () => {
    expect(skyBackground(213, 378)).toBe(
      'conic-gradient(from 90deg, rgb(102, 179, 255) 1%, rgb(230, 153, 51) 5%, rgb(13, 13, 51) 7%, rgb(13, 13, 51) 25%, ' +
        'rgb(13, 13, 51) 25%, rgb(13, 13, 51) 57.17%, rgb(230, 153, 51) 59.17%, rgb(102, 179, 255) 63.17%, rgb(102, 179, 255) 75%)',
    )
  })
})

describe('hourAngle', () => {
  it('places an hour of the day as dialAngle places a time', () => {
    expect(hourAngle(0)).toBe(90)
    expect(hourAngle(12)).toBe(270)
    expect(hourAngle(5.5)).toBe(172.5)
    expect(hourAngle(8 + 12 / 60)).toBe(dialAngle(ny(8, 12), NY))
  })
})
