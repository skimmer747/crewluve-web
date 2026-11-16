// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

const IN_THE_AIR = START + 59 * MINUTE
const ESTIMATED = START + 75 * MINUTE

const svgAt = (t: number, isReplay = false) => {
  const map = liveTripMap(t)
  return render(<TripMapSvg map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} isReplay={isReplay} />).container
}

describe('the SVG map with a real plane (Stage 3 spec §5.4, §6.2)', () => {
  it('draws the real plane in its circle over the ghost, and no schedule’s plane', () => {
    const svg = svgAt(IN_THE_AIR)
    const planes = [...svg.querySelectorAll('.trip-map-ghost, .trip-map-real-plane')].map((g) => g.getAttribute('class'))
    expect(planes).toEqual(['trip-map-ghost', 'trip-map-real-plane'])
    expect(svg.querySelector('.trip-map-plane')).toBeNull()
  })

  it('fades the real plane while it’s an estimate', () => {
    expect(svgAt(ESTIMATED).querySelector('.trip-map-real-plane')?.getAttribute('class')).toBe('trip-map-real-plane estimated')
  })

  it('draws the path seen, unseen and ahead, with the seen path over the rest', () => {
    const routes = [...svgAt(IN_THE_AIR).querySelectorAll('.trip-map-route')].map((p) => p.getAttribute('class'))
    expect(routes).toEqual(['trip-map-route unseen', 'trip-map-route upcoming', 'trip-map-route seen', 'trip-map-route seen'])
  })

  it('in the replay draws the real plane alone', () => {
    const svg = svgAt(START + 30 * MINUTE, true)
    expect(svg.querySelector('.trip-map-real-plane')).not.toBeNull()
    expect(svg.querySelector('.trip-map-ghost')).toBeNull()
  })
})

describe('Apple’s map with a real plane', () => {
  async function shown(t: number, isReplay = false) {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const map = liveTripMap(IN_THE_AIR)
    const view = render(<AppleTripMap map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} isReplay={isReplay} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return { kit, view, map }
  }
  const classes = (kit: ReturnType<typeof fakeMapKit>) => kit.maps[0].annotations.map((a) => a.element.className).filter((c) => /realPlane|ghost/.test(c))

  it('marks the real plane and its ghost, and fades the real plane while it’s an estimate', async () => {
    const { kit, view, map } = await shown(IN_THE_AIR)
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane'])
    view.rerender(<AppleTripMap map={map} t={ESTIMATED} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />)
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane estimated'])
  })

  it('in the replay shows the real plane alone', async () => {
    const { kit } = await shown(START + 30 * MINUTE, true)
    expect(classes(kit)).toEqual(['apple-mark realPlane'])
  })

  it('keeps the real plane over its ghost, and the seen path over the other lines, when the replay goes back to now', async () => {
    const { kit, view, map } = await shown(START + 30 * MINUTE, true)
    view.rerender(<AppleTripMap map={map} t={ESTIMATED} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />)
    // MapKit stacks a later annotation and overlay over the ones added before them.
    expect(classes(kit)).toEqual(['apple-mark ghost', 'apple-mark realPlane estimated'])
    const dashes = kit.maps[0].overlays.filter((o) => o instanceof kit.PolylineOverlay).map((o) => (o.style as { lineDash: number[] }).lineDash)
    expect(dashes.slice(-2)).toEqual([[], []])
    expect(dashes.slice(0, -2).every((d) => d.length > 0)).toBe(true)
  })

  it('dots the path nobody saw, and names the style on the map so the seen path takes its colour', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    const dashes = kit.maps[0].overlays.filter((o) => o instanceof kit.PolylineOverlay).map((o) => (o.style as { lineDash: number[] }).lineDash)
    expect(dashes).toContainEqual([1, 6])
    expect(view.container.querySelector('.apple-trip-map')?.className).toBe('apple-trip-map standard still')
  })
})
