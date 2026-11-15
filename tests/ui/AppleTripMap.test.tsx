// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appleCamera } from '../../src/map/appleMapPlan'
import { NO_INSETS } from '../../src/map/mapFit'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { framingPoints, makeTripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

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
