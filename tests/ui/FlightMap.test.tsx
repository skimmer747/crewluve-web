// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MAP_WIDTH, greatCirclePoint, mapBounds, planePose, project, routeArrow, routePoints } from '../../src/ui/flightMapGeometry'
import { flightSky, solarTransition } from '../../src/ui/flightSky'
import { FlightMap } from '../../src/ui/FlightMap'
import type { FlightEnd, InFlightFacts } from '../../src/ui/inFlightFacts'
import { isSunUp } from '../../src/time/sun'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const ANC: FlightEnd = { code: 'ANC', city: 'Anchorage', place: { lat: 61.1744, lon: -149.9983 }, timeZone: 'America/Anchorage' }
const SDF: FlightEnd = { code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' }
const RFD: FlightEnd = { code: 'RFD', city: 'Rockford', place: { lat: 42.1954, lon: -89.0972 }, timeZone: 'America/Chicago' }
// Monday 12 October 2026: Anchorage at 5:40 AM, in the dark, to Louisville at 2:40 PM.
const OUT = Date.UTC(2026, 9, 12, 13, 40)
const facts = (over: Partial<InFlightFacts> = {}): InFlightFacts => ({
  dep: ANC, arr: SDF, start: OUT, end: OUT + 5 * HOUR, blockMs: 5 * HOUR, delayMinutes: null,
  flightNumber: 'UPS2962', trackingNumber: 'UPS2962', links: null, ...over,
})
const THIRD = OUT + 100 * MINUTE // a third of the way
const W = DEFAULT_MAP_WIDTH
const box = mapBounds(ANC.place!, SDF.place!)
const points = (container: Element, selector: string) =>
  container.querySelector(selector)!.getAttribute('points')!.split(' ').map((pair) => pair.split(',').map(Number))

describe('FlightMap', () => {
  it('is one image to screen readers, described in words', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    expect(screen.getByRole('img', { name: 'Flight from Anchorage to Louisville, 2,706 nautical miles, 5 hours, about a third of the way' })).toBeTruthy()
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('draws the route as 50 segments, at the phone width until it has measured its own', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const expected = routePoints(ANC.place!, SDF.place!).map((p) => project(p, box, W))
    const drawn = points(container, '.flight-route')
    expect(drawn).toHaveLength(51)
    drawn.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(expected[i].x, 9)
      expect(y).toBeCloseTo(expected[i].y, 9)
    })
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('width')).toBe(String(W))
  })

  it('puts the arrow at the route’s middle, and fades the route across the whole width', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const arrow = routeArrow(routePoints(ANC.place!, SDF.place!).map((p) => project(p, box, W)))
    const [left, tip, right] = points(container, '.flight-arrow')
    expect(left[0]).toBeCloseTo(arrow.left.x, 9)
    expect(tip[1]).toBeCloseTo(arrow.tip.y, 9)
    expect(right[0]).toBeCloseTo(arrow.right.x, 9)
    const fade = container.querySelector('linearGradient[gradientUnits="userSpaceOnUse"]')!
    expect(fade.getAttribute('x2')).toBe(String(W))
    expect([...fade.querySelectorAll('stop')].map((s) => s.getAttribute('class'))).toEqual(['flight-route-edge', 'flight-route-middle', 'flight-route-edge'])
  })

  it('centers each airport’s column on its place, with a sun or a moon, the code, the city and its local time', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const [dep, arr] = [...container.querySelectorAll<HTMLElement>('.flight-airport')]
    const depAt = project(ANC.place!, box, W)
    expect(parseFloat(dep.style.left)).toBeCloseTo(depAt.x, 4)
    expect(parseFloat(dep.style.top)).toBeCloseTo(depAt.y, 4)
    expect(dep.textContent).toBe('ANCAnchorageMO 5:40AM')
    expect(arr.textContent).toBe('SDFLouisvilleMO 2:40PM')
    expect(iconNameOf(dep.querySelector('svg'))).toBe('Moon') // dark at 5:40 AM in Anchorage
    expect(iconNameOf(arr.querySelector('svg'))).toBe('Sun')
    expect(dep.querySelectorAll('.flight-airport-icon svg')).toHaveLength(2) // the glow and the icon
  })

  it('uses 24-hour times when asked, and leaves out a time whose zone isn’t known', () => {
    const { container } = render(<FlightMap facts={facts({ arr: { ...SDF, timeZone: null } })} now={THIRD} h24 />)
    const [dep, arr] = [...container.querySelectorAll('.flight-airport')]
    expect(dep.querySelector('.flight-airport-time')!.textContent).toBe('MO 05:40')
    expect(arr.querySelector('.flight-airport-time')).toBeNull()
  })

  it('paints the sky across, night into day, split at the sunrise point', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const sky = container.querySelector(`linearGradient[id="${container.querySelector('.flight-sky')!.getAttribute('fill')!.slice(5, -1)}"]`)!
    expect(sky.getAttribute('x2')).toBe('1')
    const expected = flightSky(
      isSunUp(OUT, ANC.place!.lat, ANC.place!.lon),
      isSunUp(OUT + 5 * HOUR, SDF.place!.lat, SDF.place!.lon),
      project(ANC.place!, box, W).x / W,
      project(SDF.place!, box, W).x / W,
      solarTransition(ANC.place!, SDF.place!, OUT, OUT + 5 * HOUR),
    )
    expect(expected).toMatchObject({ direction: 'across', left: 'night', right: 'day' })
    if (expected.direction !== 'across') throw new Error('expected a split sky')
    const stops = [...sky.querySelectorAll('stop')]
    expect(stops.map((s) => s.getAttribute('class'))).toEqual(['flight-sky-night-1', 'flight-sky-night-1', 'flight-sky-day-1', 'flight-sky-day-1'])
    expect(stops.map((s) => Number(s.getAttribute('offset')))).toEqual([0, expected.leftUntil, expected.rightFrom, 1])
  })

  it('paints one sky top to bottom when both ends are in daylight', () => {
    const morning = Date.UTC(2026, 9, 12, 15)
    const { container } = render(<FlightMap facts={facts({ dep: SDF, arr: RFD, start: morning, end: morning + 90 * MINUTE, blockMs: 90 * MINUTE })} now={morning + 30 * MINUTE} h24={false} />)
    const sky = container.querySelector('linearGradient[y2="1"]')!
    expect([...sky.querySelectorAll('stop')].map((s) => s.getAttribute('class'))).toEqual(['flight-sky-day-1', 'flight-sky-day-2'])
  })

  it('works the airports’ daylight and the sky out again when either of the flight’s times changes', () => {
    const { container, rerender } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const icons = () => [...container.querySelectorAll('.flight-airport')].map((column) => iconNameOf(column.querySelector('svg')))
    expect(icons()).toEqual(['Moon', 'Sun']) // 5:40 AM in Anchorage, 2:40 PM in Louisville
    rerender(<FlightMap facts={facts({ end: OUT + 10 * HOUR })} now={THIRD} h24={false} />)
    expect(icons()).toEqual(['Moon', 'Moon']) // a later landing, at 7:40 PM, after sunset
    rerender(<FlightMap facts={facts({ start: OUT + 270 * MINUTE, end: OUT + 10 * HOUR })} now={THIRD} h24={false} />)
    expect(icons()).toEqual(['Sun', 'Moon']) // a later departure, at 10:10 AM
  })

  it('draws the plane at its progress, turned along the route', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const pose = planePose(ANC.place!, SDF.place!, box, W, 1 / 3)
    expect(container.querySelector('.flight-plane')!.getAttribute('transform')).toBe(`translate(${pose.at.x} ${pose.at.y})`)
    expect(container.querySelector('.flight-plane-icon')!.getAttribute('transform')).toBe(`rotate(${pose.heading + 90}) scale(${20 / 256}) translate(-128 -128)`)
    expect(container.querySelector('.flight-plane-halo')!.getAttribute('r')).toBe('15')
    expect(pose.at).toEqual(project(greatCirclePoint(ANC.place!, SDF.place!, 1 / 3), box, W))
  })

  it('stacks its layers as the app does: the route, the airports, the plane over them, then the distance', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const layers = [...container.querySelector('.flight-map')!.children].map((layer) => layer.getAttribute('class'))
    expect(layers).toEqual(['flight-map-art', 'flight-airport', 'flight-airport', 'flight-map-plane', 'flight-distance'])
    expect(container.querySelector('svg.flight-map-plane .flight-plane')).not.toBeNull()
    expect(container.querySelector('svg.flight-map-plane')!.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('svg.flight-map-art .flight-plane')).toBeNull()
  })

  it('glows the route in its own fade, and the arrow and the plane, each over a blur', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    const filterOf = (el: Element) => container.querySelector(`filter[id="${el.getAttribute('filter')!.slice(5, -1)}"]`)!
    const blurOf = (el: Element) => filterOf(el).querySelector('feGaussianBlur')!.getAttribute('stdDeviation')
    const routeGlow = container.querySelector('.flight-route-glow')!
    expect(routeGlow.getAttribute('stroke')).toBe(container.querySelector('.flight-route')!.getAttribute('stroke'))
    expect(blurOf(routeGlow)).toBe('2')
    // Over the whole map, so a route that runs straight up the map keeps its glow.
    const area = filterOf(routeGlow)
    expect(['filterUnits', 'x', 'y', 'width', 'height'].map((name) => area.getAttribute(name))).toEqual(['userSpaceOnUse', '0', '0', String(W), '200'])
    expect(blurOf(container.querySelector('.flight-arrow-glow')!)).toBe('2')
    expect(blurOf(container.querySelector('.flight-plane-halo')!)).toBe('4')
    expect(blurOf(container.querySelector('.flight-plane-glow')!.parentElement!)).toBe('2')
  })

  it('has no plane before departure or after landing', () => {
    expect(render(<FlightMap facts={facts()} now={OUT - MINUTE} h24={false} />).container.querySelector('.flight-plane')).toBeNull()
    cleanup()
    expect(render(<FlightMap facts={facts()} now={OUT + 5 * HOUR + MINUTE} h24={false} />).container.querySelector('.flight-plane')).toBeNull()
  })

  it('shows the scheduled block time and the distance under the map', () => {
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    expect(container.querySelector('.flight-distance')!.textContent).toBe('5:002,706 nm')
    expect([...container.querySelectorAll('.flight-distance svg')].map(iconNameOf)).toEqual(['Timer', 'ArrowsHorizontal'])
  })

  it('leaves out the block time when it isn’t over zero', () => {
    const { container } = render(<FlightMap facts={facts({ blockMs: 0 })} now={THIRD} h24={false} />)
    expect(container.querySelector('.flight-distance')!.textContent).toBe('2,706 nm')
  })

  it('shows the app’s fallback when an airport isn’t in the list', () => {
    const unknown: FlightEnd = { code: 'ZZZ', city: 'ZZZ', place: null, timeZone: null }
    const { container } = render(<FlightMap facts={facts({ arr: unknown })} now={THIRD} h24={false} />)
    expect(container.querySelector('svg.flight-map-art')).toBeNull()
    expect(container.querySelector('.flight-map-fallback')!.textContent).toBe('ANC → ZZZ')
    expect(iconNameOf(container.querySelector('.flight-map-fallback svg'))).toBe('Airplane')
    expect(screen.getByRole('img', { name: 'Flight from Anchorage to ZZZ, 5 hours, about a third of the way' })).toBeTruthy()
  })

  it('lays itself out again when its width changes', () => {
    let measured = 343
    let report = () => {}
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: measured }) as DOMRect)
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { report = callback }
      observe() {}
      disconnect() {}
    })
    const { container } = render(<FlightMap facts={facts()} now={THIRD} h24={false} />)
    measured = 400
    act(() => report())
    expect(container.querySelector('svg.flight-map-art')!.getAttribute('width')).toBe('400')
    const [x] = points(container, '.flight-route')[0]
    expect(x).toBeCloseTo(project(ANC.place!, box, 400).x, 9)
  })
})
