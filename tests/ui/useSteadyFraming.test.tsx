// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { GeoPoint } from '../../src/map/greatCircle'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { useSteadyFraming } from '../../src/ui/hooks/useSteadyFraming'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { FLYING, liveTripMap, TRAIL } from '../map/liveTrip'
import { MINUTE, point, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
})

const IN_THE_AIR = START + 59 * MINUTE

const p = (lat: number, lng: number) => ({ lat, lng })

describe('the frame held steady while a real path grows (Stage 3 spec §6.2)', () => {
  let held: GeoPoint[] = []
  function Probe({ framing, what }: { framing: GeoPoint[]; what: string }) {
    held = useSteadyFraming(framing, what)
    return null
  }
  const first = [p(38, -86), p(40, -75)]

  it('keeps its places while the new ones fit their frame, and takes the new ones once they don’t', () => {
    const view = render(<Probe framing={first} what="f1" />)
    expect(held).toBe(first)
    view.rerender(<Probe framing={[...first, p(39, -80)]} what="f1" />)
    expect(held).toBe(first)
    const grown = [...first, p(47, -80)]
    view.rerender(<Probe framing={grown} what="f1" />)
    expect(held).toBe(grown)
  })

  it('takes the new places when something else is framed, even inside the old frame', () => {
    const view = render(<Probe framing={first} what="trip" />)
    const leg = [p(39, -80), p(39.5, -78)]
    view.rerender(<Probe framing={leg} what="f1" />)
    expect(held).toBe(leg)
  })
})

/**
 * The made-up flight seen once more: a little north of every place framed so far, in the room the frame keeps around
 * them, or far north of the trip. Without the hold, the first would move the camera a little.
 */
const grownInside = { ...FLYING, trail: [...TRAIL.slice(0, 3), point(40, 40.05, -82.0), ...TRAIL.slice(3)] }
const grownPast = { ...FLYING, trail: [...TRAIL.slice(0, 3), point(40, 47.5, -82.0), ...TRAIL.slice(3)] }

describe('the SVG map’s frame while a real path grows (Stage 3 spec §6.2)', () => {
  const louisville = (container: Element) => {
    const dot = [...container.querySelectorAll('.trip-map-airport')].find((g) => g.textContent === 'SDF')!.querySelector('circle')!
    return [dot.getAttribute('cx'), dot.getAttribute('cy')]
  }
  const svg = (live = FLYING) => {
    const map = liveTripMap(IN_THE_AIR, live)
    return <TripMapSvg map={map} t={IN_THE_AIR} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} />
  }

  it('holds it while the path grows inside it, and frames again once it grows past', () => {
    const view = render(svg())
    const before = louisville(view.container)
    view.rerender(svg(grownInside))
    expect(louisville(view.container)).toEqual(before)
    view.rerender(svg(grownPast))
    expect(louisville(view.container)).not.toEqual(before)
  })
})

describe('Apple’s map’s frame while a real path grows', () => {
  it('holds Apple’s map’s frame while the path grows inside it, and frames again once it grows past', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const apple = (live = FLYING) => {
      const map = liveTripMap(IN_THE_AIR, live)
      return <AppleTripMap map={map} t={IN_THE_AIR} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} mapStyle="standard" interactive={false} />
    }
    const view = render(apple())
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(kit.maps[0].rects).toHaveLength(1)
    view.rerender(apple(grownInside))
    expect(kit.maps[0].rects).toHaveLength(1)
    view.rerender(apple(grownPast))
    expect(kit.maps[0].rects).toHaveLength(2)
  })

})
