// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appleCamera, cameraFor, followView, wholeView } from '../../src/map/appleMapPlan'
import { fitRect, NO_INSETS, type WorldRect } from '../../src/map/mapFit'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { keptInView, tripMapDrawing } from '../../src/map/tripMapDrawing'
import { legPlane } from '../../src/facts/planePosition'
import { followRect } from '../../src/map/tripMapFollow'
import { placeAt } from '../../src/map/svgPaths'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date } from '../facts/liveFacts'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at as europeAt, EUROPE } from '../map/tripMapLegs'

/**
 * Following the plane on the website (the app's follow the plane design §2 to §4): the glide on Apple's map and the SVG
 * map, and the card, which follows the full map's switch (tests/ui/followSwitch.test.tsx). The flight is the equator
 * flight from E0 to E20, its plan in the air from 10:15 to 13:15 UTC.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const leg = equatorFlight(0, 20)
const map = flightMap(leg, null)
const WIDTH = 390
const HEIGHT = 520
const props = { map, t: at('11:45'), width: WIDTH, height: HEIGHT, focus: leg, land: null, nightStep: 60_000, mapStyle: 'hybrid' as const, interactive: true }

/** The whole view that follows the plane at `t`, as MapKit is asked for it. */
const followed = (t: number) => cameraFor(followView(followRect(leg, t, false)!, keptInView(tripMapDrawing(map, t)), WIDTH, HEIGHT, NO_INSETS), WIDTH, HEIGHT, NO_INSETS)

/** Display frames, run by the test: each callback waits until `frame` runs it, `ms` after the last. */
function stubFrames() {
  const waiting = new Map<number, FrameRequestCallback>()
  let id = 0
  let requested = 0
  let now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    waiting.set(++id, callback)
    requested += 1
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (which: number) => void waiting.delete(which))
  return {
    get waiting() {
      return waiting.size
    },
    /** How many display frames have been asked for in all. */
    get requested() {
      return requested
    },
    frame(ms = 1000 / 60) {
      now += ms
      const due = [...waiting.values()]
      waiting.clear()
      for (const callback of due) callback(now)
    },
  }
}

/** Reduced motion asked for, or not: other queries go to the real `matchMedia`. */
function stubStill(still: boolean) {
  const real = globalThis.matchMedia
  vi.stubGlobal('matchMedia', (query: string) =>
    query.includes('prefers-reduced-motion') ? { matches: still, addEventListener() {}, removeEventListener() {} } : real.call(globalThis, query))
}

async function ready() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

const sameRect = (a: WorldRect, b: WorldRect) => [a.x, a.y, a.width, a.height].every((v, i) => Math.abs(v - [b.x, b.y, b.width, b.height][i]) < 1e-12)

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  resetAppleMapKit()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('following the plane on Apple’s map (follow the plane design §3, §4)', () => {
  it('frames the plane, its tail and the way ahead at once when the map opens, with no animation', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects).toHaveLength(1)
    expect(kit.maps[0].rects[0].animated).toBe(false)
    expect(sameRect(kit.maps[0].rects[0].rect, followed(at('11:45')).rect)).toBe(true)
  })

  it('frames the whole flight, as before, with the setting off, and before the plane has left', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
    cleanup()
    resetAppleMapKit()
    const later = await ready()
    render(<AppleTripMap {...props} t={at('10:10')} followsPlane />)
    await waitFor(() => expect(later.maps).toHaveLength(1))
    expect(later.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
  })

  it('glides to a new frame a step a display frame, without MapKit’s animation, and arrives exactly', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // An hour on in a replay: the frame is smaller and further east.
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane />)
    expect(frames.waiting).toBe(1)
    frames.frame()
    const target = followed(at('12:45')).rect
    const first = m.rects.at(-1)!
    expect(first.animated).toBe(false)
    expect(first.rect.width).toBeLessThan(m.rects[0].rect.width)
    expect(first.rect.width).toBeGreaterThan(target.width)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    expect(frames.waiting).toBe(0)
    expect(sameRect(m.rects.at(-1)!.rect, target)).toBe(true)
    expect(m.rects.every((r) => !r.animated)).toBe(true)
  })

  it('goes straight to the new frame with reduced motion', async () => {
    stubStill(true)
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane />)
    expect(frames.waiting).toBe(0)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, followed(at('12:45')).rect)).toBe(true)
  })

  it('asks MapKit nothing more while the frame is the same', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} followsPlane />)
    view.rerender(<AppleTripMap {...props} followsPlane />)
    expect(kit.maps[0].rects).toHaveLength(1)
  })

  it('stops once the person moves the map, and glides again from where it is on Recenter', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane recenter={0} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    m.fire('scroll-start')
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane recenter={0} />)
    expect(frames.waiting).toBe(0)
    expect(m.rects).toHaveLength(1)
    view.rerender(<AppleTripMap {...props} t={at('12:45')} followsPlane recenter={1} />)
    expect(frames.waiting).toBe(1)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    expect(sameRect(m.rects.at(-1)!.rect, followed(at('12:45')).rect)).toBe(true)
  })

  it('follows a frame that moves as it glides, in one loop, to where the frame is then', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} t={at('12:15')} followsPlane />)
    let ran = 0
    for (const time of ['12:20', '12:25', '12:30']) {
      frames.frame()
      ran += 1
      view.rerender(<AppleTripMap {...props} t={at(time)} followsPlane />)
    }
    for (; ran < 300 && frames.waiting > 0; ran++) frames.frame()
    expect(frames.requested, 'never started over').toBe(ran)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, followed(at('12:30')).rect)).toBe(true)
  })

  it('makes every move between legs too, to the next flight’s route, with no animation of MapKit’s (follow the plane design §5)', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const trip = (now: number) => makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
    const europe = { ...props, map: trip(europeAt(4)), t: europeAt(4), focus: trip(europeAt(4)).legs[0] }
    const view = render(<AppleTripMap {...europe} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    // Landed in Cologne, a day before the flight to Dubai.
    const between = trip(europeAt(20))
    view.rerender(<AppleTripMap {...europe} map={between} t={europeAt(20)} focus={null} followsPlane />)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    const next = cameraFor(followView(fitRect(framingPoints(between, between.legs[1]))!, keptInView(tripMapDrawing(between, europeAt(20))), WIDTH, HEIGHT, NO_INSETS),
      WIDTH, HEIGHT, NO_INSETS)
    expect(sameRect(kit.maps[0].rects.at(-1)!.rect, next.rect)).toBe(true)
    expect(kit.maps[0].rects.every((r) => !r.animated)).toBe(true)
  })

  it('asks MapKit nothing more while the frame is the same, though MapKit shows a view of its own, as at its zoom limit', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // MapKit settles a little closer in than it was asked, with the plane still in view.
    const asked = m.rects[0].rect
    m.visibleMapRect = new kit.MapRect(asked.x + asked.width * 0.05, asked.y + asked.height * 0.05, asked.width * 0.9, asked.height * 0.9)
    m.fire('region-change-end')
    view.rerender(<AppleTripMap {...props} followsPlane />)
    view.rerender(<AppleTripMap {...props} followsPlane />)
    expect(m.rects).toHaveLength(1)
  })

  it('once there, slides the plane back into view where MapKit shows a view of its own without it', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    const asked = m.rects[0].rect
    // MapKit shows a view a whole view's width east, the plane off its left.
    m.visibleMapRect = new kit.MapRect(asked.x + asked.width, asked.y, asked.width, asked.height)
    m.fire('region-change-end')
    expect(m.rects).toHaveLength(2)
    const slid = m.rects[1].rect
    const plane = placeAt(legPlane(leg, at('11:45'), false).place, { rect: slid, width: WIDTH, height: HEIGHT })
    expect(plane.x).toBeGreaterThan(0)
    expect(plane.x).toBeLessThan(WIDTH)
  })

  it('glides from the view on screen when the latest event’s banner comes and the frame keeps clear of it, with no jump', async () => {
    const kit = await ready()
    const frames = stubFrames()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    // "Took off from …": the banner takes 100 px at the top.
    const banner = { top: 100, right: 0, bottom: 0, left: 0 }
    view.rerender(<AppleTripMap {...props} insets={banner} followsPlane />)
    expect(m.rects, 'nothing laid out again at once').toHaveLength(1)
    expect(frames.waiting).toBe(1)
    frames.frame()
    // The first step shows nearly what was on screen, in the new padding.
    const before = wholeView({ rect: m.rects[0].rect, padding: NO_INSETS }, WIDTH, HEIGHT)
    const first = wholeView({ rect: m.rects[1].rect, padding: banner }, WIDTH, HEIGHT)
    expect(Math.abs(first.y - before.y)).toBeLessThan(0.1 * before.height)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) frames.frame()
    const target = cameraFor(followView(followRect(leg, at('11:45'), false)!, keptInView(tripMapDrawing(map, at('11:45'))), WIDTH, HEIGHT, banner), WIDTH, HEIGHT, banner)
    expect(sameRect(m.rects.at(-1)!.rect, target.rect)).toBe(true)
  })

  it('frames the whole flight again, animated, when the setting is turned off', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} followsPlane />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    view.rerender(<AppleTripMap {...props} followsPlane={false} />)
    const last = kit.maps[0].rects.at(-1)!
    expect(last.animated).toBe(true)
    expect(last.rect).toMatchObject(appleCamera(framingPoints(map, leg), [], WIDTH, HEIGHT, NO_INSETS).rect)
  })
})

describe('following the plane on the SVG map (follow the plane design §3, §4)', () => {
  const svgProps = { map, t: at('11:45'), width: WIDTH, height: HEIGHT, focus: leg, land: null, nightStep: 60_000 }
  /** Where the airport with `code` is drawn, across the view. */
  const airportX = (container: Element, code: string) => {
    const group = [...container.querySelectorAll('.trip-map-airport')].find((g) => g.textContent === code)
    return group ? Number(group.querySelector('circle')!.getAttribute('cx')) : null
  }

  it('leaves the start behind and keeps the destination in view, at once when it opens', () => {
    const { container } = render(<TripMapSvg {...svgProps} followsPlane />)
    expect(airportX(container, 'E20')).toBeLessThanOrEqual(WIDTH)
    expect(airportX(container, 'E0')).toBeLessThan(0)
  })

  it('frames the whole flight with the setting off', () => {
    const { container } = render(<TripMapSvg {...svgProps} />)
    expect(airportX(container, 'E0')).toBeGreaterThan(0)
    expect(airportX(container, 'E20')).toBeLessThan(WIDTH)
  })

  it('follows a frame that moves as it glides, in one loop, as a replay plays', () => {
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} followsPlane />)
    view.rerender(<TripMapSvg {...svgProps} t={at('12:15')} followsPlane />)
    let ran = 0
    for (const time of ['12:20', '12:25', '12:30']) {
      act(() => frames.frame())
      ran += 1
      view.rerender(<TripMapSvg {...svgProps} t={at(time)} followsPlane />)
    }
    for (; ran < 300 && frames.waiting > 0; ran++) act(() => frames.frame())
    expect(frames.requested, 'never started over').toBe(ran)
    const end = render(<TripMapSvg {...svgProps} t={at('12:30')} followsPlane />)
    expect(airportX(view.container, 'E0')).toBe(airportX(end.container, 'E0'))
  })

  it('goes straight to the new frame with reduced motion', () => {
    stubStill(true)
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} followsPlane />)
    view.rerender(<TripMapSvg {...svgProps} t={at('12:45')} followsPlane />)
    expect(frames.requested).toBe(0)
    const end = render(<TripMapSvg {...svgProps} t={at('12:45')} followsPlane />)
    expect(airportX(view.container, 'E0')).toBe(airportX(end.container, 'E0'))
  })

  it('glides there from the whole flight when it’s turned on', () => {
    const frames = stubFrames()
    const view = render(<TripMapSvg {...svgProps} />)
    // A panel opens over the map's left side first: the glide starts from the frame it shows now, not the one it opened with.
    const panel = { top: 0, right: 0, bottom: 0, left: 150 }
    view.rerender(<TripMapSvg {...svgProps} insets={panel} />)
    const before = airportX(view.container, 'E0')!
    view.rerender(<TripMapSvg {...svgProps} insets={panel} followsPlane />)
    expect(airportX(view.container, 'E0'), 'from where it was').toBe(before)
    // Each frame draws the map again, which the test waits for.
    act(() => frames.frame())
    const step = airportX(view.container, 'E0')!
    expect(step).toBeLessThan(before)
    expect(step).toBeGreaterThan(0)
    for (let i = 0; i < 300 && frames.waiting > 0; i++) act(() => frames.frame())
    // Left behind: under the panel, out of the part of the map it leaves clear.
    expect(airportX(view.container, 'E0')).toBeLessThan(panel.left)
  })
})

describe('the full map follows its switch (follow the plane design §2)', () => {
  it('frames the plane, not the whole flight, once the switch is on', async () => {
    const asked = async () => {
      const kit = await ready()
      render(<TripMapPage map={map} now={at('11:45')} viewerTz="America/New_York" h24={false} day={1} days={1} land={null} onBack={() => {}} />)
      await waitFor(() => expect(kit.maps).toHaveLength(1))
      const width = kit.maps[0].rects.at(-1)!.rect.width
      cleanup()
      resetAppleMapKit()
      return width
    }
    const whole = await asked()
    localStorage.setItem('crewluve.tripMap.followsPlane', 'on')
    expect(await asked()).toBeLessThan(whole * 0.85)
  })
})

describe('the card follows the setting (follow the plane design §2)', () => {
  it('frames the plane, not the whole flight, once the full map’s switch is on', async () => {
    const asked = async () => {
      const kit = await ready()
      const now = europeAt(4)
      render(<TripMapCard map={makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!} now={now} viewerTz="America/New_York"
        h24={false} name="Alex" day={1} days={4} delayMinutes={null} land={null} onOpenMap={() => {}} onOpenTracking={() => {}} />)
      await waitFor(() => expect(kit.maps).toHaveLength(1))
      const width = kit.maps[0].rects.at(-1)!.rect.width
      cleanup()
      resetAppleMapKit()
      return width
    }
    const whole = await asked()
    localStorage.setItem('crewluve.tripMap.followsPlane', 'on')
    expect(await asked()).toBeLessThan(whole * 0.85)
  })
})
