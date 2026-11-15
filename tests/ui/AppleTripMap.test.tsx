// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { makeTripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

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
