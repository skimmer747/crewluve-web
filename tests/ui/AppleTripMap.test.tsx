// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appleCamera } from '../../src/map/appleMapPlan'
import { NO_INSETS, type Insets, type WorldRect } from '../../src/map/mapFit'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { placeAt } from '../../src/map/svgPaths'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at, EUROPE, flight } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  vi.unstubAllGlobals()
})

/** The system's light or dark setting, as a `matchMedia` list the test can flip. Other queries go to the real one. */
function stubScheme(dark: boolean) {
  const listeners = new Set<() => void>()
  const list = {
    matches: dark,
    addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
  }
  const real = globalThis.matchMedia
  vi.stubGlobal('matchMedia', (query: string) => (query.includes('prefers-color-scheme') ? list : real.call(globalThis, query)))
  return {
    listeners,
    set(next: boolean) {
      list.matches = next
      for (const listener of [...listeners]) listener()
    },
  }
}

const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(4), airports: AIRPORTS })!
const props = { map, t: at(4), width: 390, height: 520, focus: map.legs[0], land: null, nightStep: 60_000, mapStyle: 'hybrid' as const, interactive: true }

async function ready() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

describe('Apple’s map (Apple Maps spec §4, §5, §8)', () => {
  it('shows the SVG map while MapKit loads or when it fails', async () => {
    const { container } = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(container.querySelector('svg.trip-map-svg')).toBeTruthy())
    expect(container.querySelector('.apple-trip-map')).toBeNull()
  })

  it('creates one map in the style, with the trip’s lines, the night’s seven layers and its marks', async () => {
    const kit = await ready()
    const { container } = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    expect(container.querySelector('svg.trip-map-svg')).toBeNull()
    expect(m.mapType).toBe('hybrid')
    expect(m.options).toMatchObject({ isScrollEnabled: true, isZoomEnabled: true, isRotationEnabled: false, showsMapTypeControl: false })
    expect(m.overlays.filter((o) => o instanceof kit.PolygonOverlay)).toHaveLength(7)
    expect(m.overlays.filter((o) => o instanceof kit.PolylineOverlay).length).toBeGreaterThan(0)
    expect(m.annotations.some((a) => a.element.classList.contains('plane'))).toBe(true)
    expect(m.rects).toHaveLength(1)
    // The same view the SVG map takes of the leg in focus.
    const leg = [map.legs[0].origin.place, map.legs[0].destination.place]
    expect(m.rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), null, 390, 520, NO_INSETS).rect)
    expect(leg).toHaveLength(2)
  })

  it('gives MapKit the panel as its padding, so the trip and Apple’s logo keep clear of it', async () => {
    const kit = await ready()
    const insets = { top: 0, right: 0, bottom: 0, left: 150 }
    render(<AppleTripMap {...props} insets={insets} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].padding).toMatchObject(insets)
    expect(kit.maps[0].rects[0].rect).toMatchObject(appleCamera(framingPoints(map, map.legs[0]), null, 390, 520, insets).rect)
  })

  it('swaps the pilot’s marker when what they’re doing changes, leaving one marker', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} t={at(12)} focus={null} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const pilots = () => kit.maps[0].annotations.map((a) => a.element.className).filter((c) => c.includes('pilot'))
    expect(pilots()).toEqual(['apple-mark pilot activity-layover'])
    // In the air on the next leg there's no pilot's marker, and after the last leg, at home, there's the house.
    view.rerender(<AppleTripMap {...props} t={at(34)} focus={null} />)
    expect(pilots()).toEqual([])
    view.rerender(<AppleTripMap {...props} t={at(39)} focus={null} />)
    expect(pilots()).toHaveLength(1)
    expect(pilots()[0]).not.toBe('apple-mark pilot activity-plane')
  })

  it('shows what the pilot is doing on the ground, where the heart was: a bed on a layover', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} t={at(12)} focus={null} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const marks = kit.maps[0].annotations.map((a) => a.element.className)
    expect(marks.filter((c) => c.includes('pilot'))).toEqual(['apple-mark pilot activity-layover'])
    expect(marks.some((c) => c.includes('heart') || c.includes('plane'))).toBe(false)
  })

  it('never puts a night shape on the date line: MapKit would fill it inside-out for half of each day', async () => {
    const kit = await ready()
    render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const night = kit.maps[0].overlays.filter((o) => o instanceof kit.PolygonOverlay)
    const longitudes = night.flatMap((o) => (o.points as { longitude: number }[][]).flat().map((c) => c.longitude))
    expect(longitudes.length).toBeGreaterThan(1000)
    expect(Math.max(...longitudes.map(Math.abs))).toBeLessThan(180)
  })

  it('ranks the airports of the leg in focus first, as the focus moves to the next leg', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const priority = (code: string) => kit.maps[0].annotations.find((a) => a.element.textContent === code)!.displayPriority
    expect(['SDF', 'CGN', 'DXB'].map(priority)).toEqual([750, 750, 250])
    view.rerender(<AppleTripMap {...props} focus={map.legs[1]} />)
    expect(['SDF', 'CGN', 'DXB'].map(priority)).toEqual([250, 750, 750])
  })

  it('follows a change to dark mode while the map is open: Apple’s tiles, the night and the lines', async () => {
    const scheme = stubScheme(false)
    const kit = await ready()
    const view = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    expect(m.colorScheme).toBe('light')
    const night = m.overlays.find((o) => o instanceof kit.PolygonOverlay)!
    const line = m.overlays.find((o) => o instanceof kit.PolylineOverlay)!
    const [nightStyle, lineStyle] = [night.style, line.style]
    act(() => scheme.set(true))
    expect(m.colorScheme).toBe('dark')
    expect(night.style).not.toBe(nightStyle)
    expect(line.style).not.toBe(lineStyle)
    view.unmount()
    expect(scheme.listeners.size).toBe(0)
  })

  it('keeps the card’s still map out of the Tab order and from screen readers, so Apple’s Legal link isn’t a link inside the card’s button', async () => {
    const kit = await ready()
    const still = render(<AppleTripMap {...props} interactive={false} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const card = still.container.querySelector('.apple-trip-map')!
    expect(card.getAttribute('aria-hidden')).toBe('true')
    expect(card.hasAttribute('inert')).toBe(true)
    still.unmount()
    // The full map's own controls and Legal link stay reachable.
    const full = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(2))
    const page = full.container.querySelector('.apple-trip-map')!
    expect([page.hasAttribute('aria-hidden'), page.hasAttribute('inert')]).toEqual([false, false])
  })

  it('destroys the map when MapKit fails after it was made, and shows the SVG map', async () => {
    const kit = await ready()
    const { container } = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    act(() => kit.fire('error', { status: 'Unauthorized' }))
    await waitFor(() => expect(container.querySelector('svg.trip-map-svg')).toBeTruthy())
    expect(kit.maps[0].destroyed).toBe(true)
  })

  it('updates in place as time moves, rather than adding again', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    const counts = [m.overlays.length, m.annotations.length]
    const plane = m.annotations.find((a) => a.element.classList.contains('plane'))!
    const before = plane.coordinate.longitude
    view.rerender(<AppleTripMap {...props} t={at(5)} />)
    expect([m.overlays.length, m.annotations.length]).toEqual(counts)
    expect(plane.coordinate.longitude).not.toBe(before)
    expect(kit.maps).toHaveLength(1)
  })

  it('stops framing once the person moves the map, and frames again on Recenter', async () => {
    const kit = await ready()
    const onUserMove = vi.fn()
    const view = render(<AppleTripMap {...props} onUserMove={onUserMove} recenter={0} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    m.fire('scroll-start')
    expect(onUserMove).toHaveBeenCalledTimes(1)
    view.rerender(<AppleTripMap {...props} focus={map.legs[1]} onUserMove={onUserMove} recenter={0} />)
    expect(m.rects).toHaveLength(1)
    view.rerender(<AppleTripMap {...props} focus={map.legs[1]} onUserMove={onUserMove} recenter={1} />)
    expect(m.rects).toHaveLength(2)
  })

  it('switches style without a new map, and the card’s map doesn’t move', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...props} interactive={false} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].options).toMatchObject({ isScrollEnabled: false, isZoomEnabled: false, showsZoomControl: false })
    view.rerender(<AppleTripMap {...props} interactive={false} mapStyle="satellite" />)
    expect(kit.maps[0].mapType).toBe('satellite')
    expect(kit.maps).toHaveLength(1)
  })
})

describe('keeping the pilot’s marker in view when MapKit stops zooming out short of the trip (the app’s TripMapSlide)', () => {
  // The demo's Anchorage trip, over: the pilot is home in Louisville, at its eastern end. On the card, under its top chip.
  const pacific = makeTripMap([flight('a1', 'SDF', 'ANC', 0, 6), flight('a2', 'ANC', 'SDF', 30, 6)], {
    isNextTrip: false, home: 'SDF', now: at(40), airports: AIRPORTS,
  })!
  const home = pacific.legs[0].origin.place
  const insets: Insets = { top: 37, right: 0, bottom: 0, left: 0 }
  const card = { ...props, map: pacific, t: at(40), width: 343, height: 220, focus: null, insets, interactive: false }

  /** The whole card MapKit shows for a rectangle inside its padding: the rectangle, grown by the padding. */
  const wholeView = (rect: WorldRect, padding: Insets): WorldRect => {
    const perPixel = rect.width / (343 - padding.left - padding.right)
    return { x: rect.x - padding.left * perPixel, y: rect.y - padding.top * perPixel, width: 343 * perPixel, height: 220 * perPixel }
  }
  /** MapKit at its limit: the middle of what it was asked for, 60% as wide and as high. */
  const atLimit = (r: WorldRect): WorldRect => ({ x: r.x + r.width * 0.2, y: r.y + r.height * 0.2, width: r.width * 0.6, height: r.height * 0.6 })

  /** MapKit settles on `shown`, its visible rectangle inside the padding, and says so. */
  function settled(kit: Awaited<ReturnType<typeof ready>>, shown: WorldRect) {
    const m = kit.maps[0]
    m.visibleMapRect = new kit.MapRect(shown.x, shown.y, shown.width, shown.height)
    act(() => m.fire('region-change-end'))
  }

  it('slides the view to show the marker below the chip once MapKit, after taking the view it was asked for, moves in to its limit', async () => {
    const kit = await ready()
    render(<AppleTripMap {...card} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    const asked = m.rects[0].rect
    // At MapKit's limit, Louisville, at the trip's edge, would be off the card.
    const off = placeAt(home, { rect: wholeView(atLimit(asked), insets), width: 343, height: 220 })
    expect(off.x > 343 - 20 || off.y > 220 - 20).toBe(true)
    // MapKit first reports the view it was asked for, then moves in to its limit in a change of its own.
    settled(kit, asked)
    expect(m.rects).toHaveLength(1)
    settled(kit, atLimit(asked))
    expect(m.rects).toHaveLength(2)
    expect(m.rects[1].animated).toBe(false)
    const at = placeAt(home, { rect: wholeView(m.rects[1].rect, m.padding!), width: 343, height: 220 })
    expect(at.x).toBeGreaterThanOrEqual(20)
    expect(at.x).toBeLessThanOrEqual(343 - 20)
    expect(at.y).toBeGreaterThanOrEqual(37 + 20)
    expect(at.y).toBeLessThanOrEqual(220 - 20)
    // MapKit settles on the slid view: nothing more to do.
    settled(kit, m.rects[1].rect)
    expect(m.rects).toHaveLength(2)
    // One slide a framing: should MapKit settle elsewhere again, the camera doesn't chase it.
    settled(kit, atLimit(asked))
    expect(m.rects).toHaveLength(2)
  })

  it('slides with an animation after an animated framing, as when Recenter frames the full map again', async () => {
    const kit = await ready()
    const view = render(<AppleTripMap {...card} interactive recenter={0} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    act(() => m.fire('scroll-start'))
    view.rerender(<AppleTripMap {...card} interactive recenter={1} />)
    expect(m.rects.map((r) => r.animated)).toEqual([false, true])
    settled(kit, atLimit(m.rects[1].rect))
    expect(m.rects.map((r) => r.animated)).toEqual([false, true, true])
  })

  it('reads the padding MapKit has: none, when the chips leave too thin a band to frame in', async () => {
    const kit = await ready()
    const thin = { top: 90, right: 0, bottom: 90, left: 0 }
    render(<AppleTripMap {...card} insets={thin} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    expect(m.padding).toMatchObject(NO_INSETS)
    settled(kit, atLimit(m.rects[0].rect))
    expect(m.rects).toHaveLength(2)
    const y = placeAt(home, { rect: wholeView(m.rects[1].rect, NO_INSETS), width: 343, height: 220 }).y
    expect(y).toBeGreaterThanOrEqual(90)
    expect(y).toBeLessThanOrEqual(130)
  })

  it('leaves the view alone in flight, with no marker on the ground to keep in view', async () => {
    const kit = await ready()
    render(<AppleTripMap {...card} t={at(3)} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].annotations.some((a) => a.element.classList.contains('plane'))).toBe(true)
    settled(kit, atLimit(kit.maps[0].rects[0].rect))
    expect(kit.maps[0].rects).toHaveLength(1)
  })

  it('leaves the view alone when MapKit shows what it was asked for', async () => {
    const kit = await ready()
    render(<AppleTripMap {...card} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    settled(kit, kit.maps[0].rects[0].rect)
    expect(kit.maps[0].rects).toHaveLength(1)
  })

  it('leaves the view to the person once they move the map', async () => {
    const kit = await ready()
    render(<AppleTripMap {...card} interactive />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const m = kit.maps[0]
    act(() => m.fire('scroll-start'))
    settled(kit, atLimit(m.rects[0].rect))
    expect(m.rects).toHaveLength(1)
  })
})
