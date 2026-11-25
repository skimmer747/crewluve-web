// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FactsAtMoment, LatestEvent } from '../../src/facts/factRow'
import { makeGeography } from '../../src/facts/geography'
import { factsMilestones, latestEvent, makeTripFacts } from '../../src/facts/tripFacts'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { placeAt } from '../../src/map/svgPaths'
import type { MapLeg } from '../../src/map/tripMap'
import { tripMapDrawing } from '../../src/map/tripMapDrawing'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { bannerLayout } from '../../src/ui/LatestEventBanner'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { box, EQUATOR, equatorFlight, EQUINOX, flightMap, mark } from '../facts/factsTestData'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { setWindowSize } from '../fixtures/ui'
import { liveTripMap } from '../map/liveTrip'
import { MINUTE, START } from '../map/madeUpFlights'

/**
 * The latest event shown large (latest event design §1, §2, §3): in the card's top corner, and centred under the full
 * map's pill, with the camera keeping the plane clear of it. And the website's own (Todd, 16 Nov 2026): the key to the
 * two planes moves just under the banner, still at the right, where they don't fit side by side.
 */

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
  vi.restoreAllMocks()
  setWindowSize(1024, 768)
})

const NY = 'America/New_York'
const t = (hhmm: string) => Date.parse(`2026-03-20T${hhmm}:00Z`)
/** The made-up live trip's real plane in the air, with its ghost: the key shows. */
const IN_THE_AIR = START + 59 * MINUTE

/** Two made-up countries, either side of 82° W, which the live trip's flight from Louisville to Philadelphia crosses. */
const WEST_AND_EAST = makeGeography([box('Westland', 'country', -90, -82, null, 35, 45), box('Eastland', 'country', -82, -70, null, 35, 45)], [])

const BANNER = { width: 200, height: 40 }
/** The banner 200 px wide: its title 176 px, with 12 px of padding each side. */
const BANNER_PARTS = { 'latest-event': BANNER, 'latest-event-title': { width: 176, height: 25 } }
const KEY = { width: 190, height: 22 }

/** Measures the elements of these classes at these sizes, as happy-dom lays nothing out. */
function measure(sizes: Record<string, { width: number; height: number }>) {
  const measured = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const found = Object.entries(sizes).find(([name]) => this.classList.contains(name))
    return found ? DOMRect.fromRect(found[1]) : measured.call(this)
  })
}

/** Apple's map, faked, so the camera's padding can be read. */
function appleMap() {
  const kit = fakeMapKit()
  startAppleMapKit(async () => kit as unknown as MapKitApi)
  return kit
}

const keyTop = () => document.querySelector<HTMLElement>('.trip-map-key')!.style.top

describe('where the key goes beside the banner, and what the camera keeps clear (Todd, 16 Nov 2026)', () => {
  it('keeps the key at the top right where it fits beside the banner with a gap', () => {
    // The banner's right edge at 210 px; the key's left at 416 - 10 - 190 = 216, 6 px on.
    expect(bannerLayout(210, BANNER, KEY, 416)).toEqual({ keyTop: null, inset: 10 + 40 + 4 })
    // A key taller than the banner reaches further down.
    expect(bannerLayout(210, { width: 200, height: 20 }, KEY, 416).inset).toBe(10 + 22 + 4)
  })

  it('moves it just under the banner, still at the right, where it doesn’t', () => {
    expect(bannerLayout(210, BANNER, KEY, 415)).toEqual({ keyTop: 10 + 40 + 6, inset: 10 + 40 + 6 + 22 + 4 })
  })

  it('with no key, or nothing measured yet, leaves the key alone and covers only what shows', () => {
    // A banner nearly as wide as the map would leave no room for a key, were there one.
    expect(bannerLayout(295, BANNER, { width: 0, height: 0 }, 300)).toEqual({ keyTop: null, inset: 54 })
    expect(bannerLayout(10, { width: 0, height: 0 }, { width: 0, height: 0 }, 300)).toEqual({ keyTop: null, inset: 0 })
  })
})

describe('the banner on the card (latest event design §1, §2, §3)', () => {
  const equatorCard = (now: number) => {
    const map = flightMap(equatorFlight(0, 20), mark('HOME', 0.5, 14))
    const facts = makeTripFacts(map, { geography: EQUATOR, comparisons: null, viewerTz: NY, h24: false, day: 1, days: 1 })
    return render(<TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />).container
  }
  const banner = (container: Element) => container.querySelector('.trip-map-open .latest-event')

  it('shows the latest event in the map’s top corner, large, with how long ago under it', () => {
    const container = equatorCard(t('11:12'))
    expect(banner(container)?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner(container)?.querySelector('.latest-event-when')?.textContent).toBe('About 12 min ago')
    // Screen readers hear it at the end of the card's sentence.
    expect(banner(container)?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('[data-trip-map-open]')?.getAttribute('aria-label'))
      .toMatch(/Not tracked live, so it's shown where the schedule has it\. Latest: crossed into Bravo, about 12 minutes ago\. Opens the full map\.$/)
  })

  it('leaves the event off the bottom chip beside it', () => {
    // At 11:02 the headline is "Just crossed into Bravo": the banner says it, so the chip says what's below.
    const container = equatorCard(t('11:02'))
    expect(banner(container)?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner(container)?.querySelector('.latest-event-when:not(.latest-event-widest)')?.textContent).toBe('About 2 min ago')
    expect(container.querySelector('.trip-map-chip.bottom')?.textContent).toBe('Over Bravo')
  })

  it('isn’t there before the flight’s first event, nor without the facts', () => {
    expect(banner(equatorCard(t('10:50')))).toBeNull()
    cleanup()
    const map = liveTripMap(IN_THE_AIR)
    const { container } = render(<TripMapCard map={map} now={IN_THE_AIR} viewerTz={NY} h24={false} name="Alex" day={1} days={1}
      delayMinutes={null} land={null} onOpenMap={() => {}} />)
    expect(banner(container)).toBeNull()
  })

  /** The live trip's card with its facts, on Apple's map, the card's map `width` wide. */
  const liveCard = async (width: number) => {
    const kit = appleMap()
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const map = liveTripMap(IN_THE_AIR)
    const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
    // By then it has crossed into Eastland, and passed halfway.
    expect(latestEvent(facts, IN_THE_AIR)?.title).toBe('Halfway')
    render(<TripMapCard map={map} now={IN_THE_AIR} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return kit
  }

  it('moves the key just under it on a narrow card, still at the right, and keeps the plane clear of both', async () => {
    // From the corner the banner reaches 10 + 200 = 210 px, and the key would start at 415 - 10 - 190 = 215: 1 px short
    // of the gap.
    const kit = await liveCard(415)
    expect(keyTop()).toBe('56px')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(82))
  })

  it('leaves the key at the top right of a card with room for both', async () => {
    const kit = await liveCard(416)
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
  })
})

describe('the banner on the full map (latest event design §1, §2, §3)', () => {
  const crossed: LatestEvent = { title: 'Crossed into Bravo', when: '12 min ago', sentence: 'Latest: crossed into Bravo, 12 minutes ago.' }
  const factsWith = (latest: LatestEvent | null) => (): FactsAtMoment => ({
    headline: 'Over Bravo', rows: [], tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: null }, latestEvent: latest,
  })
  const page = async (latest: LatestEvent | null = crossed) => {
    const kit = appleMap()
    render(<TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null}
      onBack={() => {}} factsAt={factsWith(latest)} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return kit
  }
  const banner = () => document.querySelector('.trip-map-full .latest-event')
  const place = () => document.querySelector<HTMLElement>('.latest-event-place')

  it('shows the latest event under the pill, and reads its sentence to screen readers', async () => {
    setWindowSize(402, 874)
    await page()
    expect(banner()?.querySelector('.latest-event-title')?.textContent).toBe('Crossed into Bravo')
    expect(banner()?.querySelector('.latest-event-when')?.textContent).toBe('12 min ago')
    expect(banner()?.querySelector('.latest-event-title')?.getAttribute('aria-hidden')).toBe('true')
    const spoken = screen.getByText('Latest: crossed into Bravo, 12 minutes ago.')
    expect(banner()?.contains(spoken)).toBe(true)
    expect(spoken.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('on a phone, centres it over the map, moves the key just under it at the right, and keeps the plane clear of both', async () => {
    setWindowSize(402, 874)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page()
    expect(place()?.style.left).toBe('0px')
    // Centred, its right edge is at 295 px: past 390 - 10 - 190.
    expect(keyTop()).toBe('56px')
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 82, left: 0 }))
  })

  it('leaves the key at the top right where the map is wide enough for both, the banner centred', async () => {
    // Centred over 612 px, the banner ends at 406 px, and the key starts at 612 - 10 - 190 = 412: just the gap. One pixel
    // less, and the key moves under it.
    setWindowSize(700, 1000)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 612, height: 600 } })
    const kit = await page()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top).toBe(54))
    cleanup()
    resetAppleMapKit()
    vi.restoreAllMocks()
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 611, height: 600 } })
    await page()
    expect(keyTop()).toBe('56px')
  })

  it('on a computer, centres it over the open map, clear of the side panel, with the key where it always is', async () => {
    setWindowSize(1280, 800)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 1280, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    const kit = await page()
    // The open panel and its margins cover 412 px. Centred over the rest, the banner ends at 946 px, well before the key.
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 54, left: 412 }))
    // Folded to the corner, the panel leaves the whole width open.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    expect(place()?.style.left).toBe('0px')
  })

  it('on a narrower computer screen, moves the key under it while the open panel leaves no room beside it', async () => {
    // Centred over the 588 px the open panel leaves, the banner ends at 806 px, and the key would start at 800.
    setWindowSize(1000, 800)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 1000, height: 740 }, 'trip-map-panel': { width: 380, height: 600 } })
    await page()
    await waitFor(() => expect(place()?.style.left).toBe('412px'))
    expect(keyTop()).toBe('56px')
    // Folded, the banner is centred over the whole map, ending at 600 px: room for the key at the top right again.
    fireEvent.click(screen.getByRole('button', { name: 'Hide facts' }))
    expect(keyTop()).toBe('')
  })

  it('with no latest event, isn’t there, and the key and the camera are as they were', async () => {
    setWindowSize(402, 874)
    measure({ ...BANNER_PARTS, 'trip-map-key': KEY, 'trip-map-full': { width: 390, height: 520 } })
    const kit = await page(null)
    expect(banner()).toBeNull()
    expect(keyTop()).toBe('')
    await waitFor(() => expect(kit.maps[0].padding?.top ?? 0).toBe(0))
  })
})

describe('the plane under the card’s banner (the review’s fixes)', () => {
  // A flight due north along the meridian, 20° in 3 h 22 min, 85% of the way: the plane near the top of the card's view
  // of the leg. The banner 50 px tall and the bottom chip 23 px leave a band from 64 px down to 183 px, too thin (119 px)
  // to frame the leg in.
  const north: MapLeg = { id: 'n', kind: 'flight', origin: mark('S0', 0, 0), destination: mark('N20', 20, 0), start: EQUINOX, end: EQUINOX + 202 * MINUTE, flightNumber: 'TST2' }
  const t = EQUINOX + Math.round(0.85 * 202) * MINUTE
  const NORTH_AND_SOUTH = makeGeography([box('Southland', 'country', -1, 1, null, -1, 10), box('Northland', 'country', -1, 1, null, 10, 21)], [])
  const sizes = {
    'latest-event': { width: 200, height: 50 }, 'latest-event-title': { width: 176, height: 25 }, 'trip-map-chip': { width: 186, height: 23 },
    'trip-map-frame': { width: 342, height: 220 },
  }
  const card = () => {
    const map = flightMap(north, null)
    const facts = makeTripFacts(map, { geography: NORTH_AND_SOUTH, comparisons: null, viewerTz: NY, h24: false })
    expect(latestEvent(facts, t)).not.toBeNull()
    render(<TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null}
      onOpenMap={() => {}} facts={facts} />)
    return tripMapDrawing(map, t).plane!.place
  }
  // The plane's mark, 12 px round, and its 8 px margin, inside the band.
  const inTheBand = (y: number) => {
    expect(y).toBeGreaterThanOrEqual(64 + 20)
    expect(y).toBeLessThanOrEqual(220 - 37 - 20)
  }

  it('is slid into the band on the site’s own map', () => {
    measure(sizes)
    card()
    const transform = document.querySelector('.trip-map-plane')!.getAttribute('transform')!
    inTheBand(Number(transform.match(/^translate\(\S+ (\S+)\)/)![1]))
  })

  it('is slid into the band on Apple’s map', async () => {
    const kit = appleMap()
    measure(sizes)
    const plane = card()
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    // Too thin a band to frame in, so the leg is framed above the bottom chip, and the plane slid into the band. MapKit
    // keeps the chip's cover, 37 px, as its padding, so its logo and Legal link stay above the chip, as Apple requires.
    await waitFor(() => expect(kit.maps[0].padding).toMatchObject({ top: 0, bottom: 37 }))
    const { rect } = kit.maps[0].rects.at(-1)!
    // The whole card, the rectangle MapKit is asked for grown by that padding below it.
    const card342 = { x: rect.x, y: rect.y, width: rect.width, height: (rect.width / 342) * 220 }
    inTheBand(placeAt(plane, { rect: card342, width: 342, height: 220 }).y)
  })
})

describe('where the key goes while the same event shows (the review’s fixes)', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** ResizeObservers the test calls, as a browser does when a measured box changes size: happy-dom never does. */
  function resizeObservers() {
    const watching = new Set<() => void>()
    vi.stubGlobal('ResizeObserver', class {
      readonly measure: () => void
      constructor(measure: () => void) {
        this.measure = measure
      }
      observe() {
        watching.add(this.measure)
      }
      disconnect() {
        watching.delete(this.measure)
      }
    })
    return { resized: () => act(() => watching.forEach((measure) => measure())) }
  }

  /** Lines sized by their words, 7 px a letter, the banner by its widest line shown and its padding, as a browser would. */
  function measureByWords(sizes: Record<string, { width: number; height: number }>) {
    const words = (el: Element) => (el.textContent ?? '').length * 7
    const measured = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('latest-event')) {
        const shown = [...this.children].filter((c) => c.classList.contains('latest-event-title') || c.classList.contains('latest-event-when'))
          .filter((c) => !c.classList.contains('latest-event-widest'))
        return DOMRect.fromRect({ width: Math.max(...shown.map(words)) + 24, height: 50 })
      }
      if (this.classList.contains('latest-event-title') || this.classList.contains('latest-event-widest')) return DOMRect.fromRect({ width: words(this), height: 20 })
      const found = Object.entries(sizes).find(([name]) => this.classList.contains(name))
      return found ? DOMRect.fromRect(found[1]) : measured.call(this)
    })
  }

  it('on the card, stays put as "when" grows under the same event, and so does the camera', async () => {
    // The live trip, its real plane and ghost with the key, half a minute after halfway and 20 minutes on.
    const cardAt = (now: number) => {
      const map = liveTripMap(now)
      const facts = makeTripFacts(map, { geography: WEST_AND_EAST, comparisons: null, viewerTz: NY, h24: false })
      return { facts, view: <TripMapCard map={map} now={now} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null}
        land={null} onOpenMap={() => {}} facts={facts} /> }
    }
    const halfway = factsMilestones(cardAt(IN_THE_AIR).facts, liveTripMap(IN_THE_AIR).legs[0]).find((m) => m.kind === 'halfway')!.time
    const [early, later] = [cardAt(halfway + 30_000), cardAt(halfway + 20 * MINUTE)]
    const [first, second] = [latestEvent(early.facts, halfway + 30_000)!, latestEvent(later.facts, halfway + 20 * MINUTE)!]
    expect(second.title).toBe(first.title)
    expect(second.when.length).toBeGreaterThan(first.when.length)
    // A card just wide enough for the key beside the banner as it was first, sized by what it showed: not as it is later.
    const width = 10 + Math.max(first.title.length, first.when.length) * 7 + 24 + 6 + 10 + KEY.width
    const kit = appleMap()
    const observers = resizeObservers()
    measureByWords({ 'trip-map-key': KEY, 'trip-map-frame': { width, height: 220 } })
    const view = render(early.view)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    expect(document.querySelector('.latest-event-when')?.textContent).toBe(first.when)
    const before = { keyTop: keyTop(), inset: kit.maps[0].padding?.top }
    view.rerender(later.view)
    await observers.resized()
    expect(document.querySelector('.latest-event-when')?.textContent).toBe(second.when)
    expect({ keyTop: keyTop(), inset: kit.maps[0].padding?.top }).toEqual(before)
    // With the widest "when" it would show, the banner leaves the key no room beside it on this card.
    expect(before.keyTop).toBe('66px')
  })

  it('on the full map, stays put as "Just now" grows to "About 1 h 5 min ago", and so does the camera', async () => {
    // A 520 px map: "Halfway" centred with "Just now" leaves the key room beside it, and with "About 1 h 5 min ago" not.
    setWindowSize(700, 1000)
    measureByWords({ 'trip-map-key': KEY, 'trip-map-full': { width: 520, height: 600 } })
    const kit = appleMap()
    const observers = resizeObservers()
    const halfway = (when: string): LatestEvent => ({ title: 'Halfway', when, sentence: `Latest: halfway, ${when.toLowerCase()}.` })
    const page = (latest: LatestEvent) => (
      <TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}}
        factsAt={() => ({ headline: 'Over Ohio', rows: [], tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: null }, latestEvent: latest })} />
    )
    const view = render(page(halfway('Just now')))
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    const before = { keyTop: keyTop(), inset: kit.maps[0].padding?.top }
    view.rerender(page(halfway('About 1 h 5 min ago')))
    await observers.resized()
    expect(document.querySelector('.trip-map-full .latest-event-when')?.textContent).toBe('About 1 h 5 min ago')
    expect({ keyTop: keyTop(), inset: kit.maps[0].padding?.top }).toEqual(before)
    // With the widest "when" it would show, 21 letters, the banner leaves the key no room beside it on this map.
    expect(before.keyTop).toBe('66px')
  })
})
