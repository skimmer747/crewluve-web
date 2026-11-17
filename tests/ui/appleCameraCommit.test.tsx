// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, expect, it, vi } from 'vitest'
import { keepInView } from '../../src/map/appleMapPlan'
import type { Insets, WorldRect } from '../../src/map/mapFit'
import type { MapKitApi } from '../../src/map/mapkitApi'
import type { MapLeg } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { flightMap, mark } from '../facts/factsTestData'
import { fakeMapKit } from '../fixtures/fakeMapKit'

/**
 * The commit that frames Apple's map doesn't also keep up with the plane (the review's fixes): were the check between
 * framings to find a slide as the framing is asked, as rounding or a ghost's pull might one day make it, it would cancel
 * the check that slides once the framing has settled at MapKit's limit. `keepInView` stands in for that here.
 */

vi.mock('../../src/map/appleMapPlan', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/map/appleMapPlan')>()
  return { ...original, keepInView: vi.fn(original.keepInView) }
})

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  vi.mocked(keepInView).mockReset()
})

const T0 = Date.UTC(2026, 2, 20, 10)
const north: MapLeg = { id: 'n', kind: 'flight', origin: mark('S0', 0, 0), destination: mark('N20', 20, 0), start: T0, end: T0 + 40 * 60_000, flightNumber: 'TST2' }
const insets: Insets = { top: 93, right: 0, bottom: 37, left: 0 }

it('keeps up only after the commit that frames, so the framing’s settle check still runs', async () => {
  // A slide wherever it's asked, a pixel's worth.
  vi.mocked(keepInView).mockImplementation((shown) => ({ ...shown, rect: { ...shown.rect, y: shown.rect.y + shown.rect.height / 220 } }))
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  render(<AppleTripMap map={flightMap(north, null)} t={T0 + 20 * 60_000} width={342} height={220} focus={north} land={null} nightStep={60_000}
    mapStyle="hybrid" interactive={false} insets={insets} />)
  await waitFor(() => expect(kit.maps).toHaveLength(1))
  const m = kit.maps[0]
  // The framing alone, with nothing asked after it in its commit.
  expect(m.rects).toHaveLength(1)
  // MapKit settles closer in than asked, on the lower part, where the plane is off the band: the settle check slides, at
  // MapKit's zoom.
  const r: WorldRect = m.rects[0].rect
  m.visibleMapRect = new kit.MapRect(r.x + r.width * 0.2, r.y + r.height * 0.4, r.width * 0.6, r.height * 0.6)
  vi.mocked(keepInView).mockImplementation(() => null)
  act(() => m.fire('region-change-end'))
  expect(m.rects).toHaveLength(2)
  expect(m.rects[1].rect.width).toBeCloseTo(r.width * 0.6, 12)
})
