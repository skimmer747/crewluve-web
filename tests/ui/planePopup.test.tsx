// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shortTimeText } from '../../src/copy/format'
import { planePopupWords, type PlaneKind } from '../../src/copy/planePopup'
import type { MapKitApi } from '../../src/map/mapkitApi'
import type { MapLeg, TripMap } from '../../src/map/tripMap'
import { AppleTripMap } from '../../src/ui/AppleTripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { PlanePopup, popupPlacement } from '../../src/ui/PlanePopup'
import { TripMapCard } from '../../src/ui/TripMapCard'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { TripMapSvg } from '../../src/ui/TripMapSvg'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { FLYING, liveTripMap, PHL, TRAIL } from '../map/liveTrip'
import { fix, liveFlight, MINUTE, START } from '../map/madeUpFlights'

afterEach(() => {
  cleanup()
  resetAppleMapKit()
  localStorage.clear()
  vi.restoreAllMocks()
})

const NY = 'America/New_York'
const IN_THE_AIR = START + 59 * MINUTE
/** Seen again further on, two minutes later. */
const LATER = START + 61 * MINUTE
const FURTHER = { ...FLYING, fix: fix(60, 39.7, -79.2, { trackDeg: 75 }) }

const wordsAt = (t: number, isReplay = false) => (leg: MapLeg, plane: PlaneKind) => planePopupWords(leg, plane, t, isReplay, NY, false)
const popup = () => document.querySelector('.trip-map-popup')
const popupTitle = () => popup()?.querySelector('.trip-map-popup-title')?.textContent ?? null

describe('where a popup goes (which plane design §3)', () => {
  it('over its plane, in the open', () => {
    expect(popupPlacement({ x: 200, y: 150 }, 390)).toEqual({ below: false, shift: 0 })
  })

  it('under its plane near the map’s top', () => {
    expect(popupPlacement({ x: 200, y: 40 }, 390).below).toBe(true)
  })

  it('slid in from either side, to stay inside the map', () => {
    expect(popupPlacement({ x: 20, y: 150 }, 390).shift).toBe(108)
    expect(popupPlacement({ x: 380, y: 150 }, 390).shift).toBe(-118)
  })

  it('in the middle of a map too narrow for it', () => {
    expect(popupPlacement({ x: 50, y: 150 }, 200).shift).toBe(50)
  })

  it('is drawn over its plane, or under it, slid sideways by the shift', () => {
    const words = { title: 'On schedule', lines: ['Where UPS1234 was scheduled to be'] }
    const view = render(<PlanePopup words={words} at={{ x: 20, y: 150 }} placement={{ below: false, shift: 108 }} />)
    expect((popup() as HTMLElement).style.transform).toBe('translate(calc(-50% + 108px), calc(-100% - 18px))')
    view.rerender(<PlanePopup words={words} at={{ x: 20, y: 40 }} placement={{ below: true, shift: 0 }} />)
    expect((popup() as HTMLElement).style.transform).toBe('translate(calc(-50% + 0px), 18px)')
    expect(popup()?.textContent).toBe('On scheduleWhere UPS1234 was scheduled to be')
  })
})

describe("the popup on the site's own map", () => {
  const svg = (t: number, opts: { live?: typeof FLYING | null; isReplay?: boolean; words?: boolean; map?: TripMap } = {}) => {
    const map = opts.map ?? liveTripMap(t, opts.live === undefined ? FLYING : opts.live)
    return <TripMapSvg map={map} t={t} width={390} height={300} focus={map.legs[0]} land={null} nightStep={60_000} isReplay={opts.isReplay}
      planeWords={opts.words === false ? undefined : wordsAt(t, opts.isReplay)} />
  }
  const real = () => document.querySelector('.trip-map-real-plane')!
  const ghost = () => document.querySelector('.trip-map-ghost')!
  const lone = () => document.querySelector('.trip-map-plane')!

  it('opens over the real plane when it’s pointed at, and closes when the pointer leaves', () => {
    render(svg(IN_THE_AIR))
    expect(document.querySelector('svg')?.getAttribute('class')).toBe('trip-map-svg points')
    fireEvent.pointerEnter(real())
    expect(popupTitle()).toBe('UPS1234 · real plane')
    const circle = real().querySelector('circle')!
    expect(popup()?.getAttribute('style')).toContain(`left: ${circle.getAttribute('cx')}px`)
    fireEvent.pointerLeave(real(), { pointerType: 'mouse' })
    expect(popup()).toBeNull()
  })

  it('stays open after a tap, moves to the other plane on a tap there, and closes on a tap elsewhere', () => {
    render(svg(IN_THE_AIR))
    fireEvent.click(ghost())
    fireEvent.pointerLeave(ghost(), { pointerType: 'touch' })
    expect(popupTitle()).toBe('On schedule')
    fireEvent.pointerDown(ghost())
    expect(popupTitle()).toBe('On schedule')
    fireEvent.click(real())
    expect(popupTitle()).toBe('UPS1234 · real plane')
    fireEvent.pointerDown(document.querySelector('.trip-map-ocean')!)
    expect(popup()).toBeNull()
  })

  it('moves with its plane', () => {
    const view = render(svg(IN_THE_AIR))
    fireEvent.pointerEnter(real())
    const before = popup()!.getAttribute('style')
    view.rerender(svg(LATER, { live: FURTHER }))
    expect(popup()!.getAttribute('style')).not.toBe(before)
    expect(popup()!.getAttribute('style')).toContain(`left: ${real().querySelector('circle')!.getAttribute('cx')}px`)
  })

  it('closes as a replay starts, and when its plane goes', () => {
    const view = render(svg(IN_THE_AIR))
    fireEvent.pointerEnter(real())
    view.rerender(svg(IN_THE_AIR, { isReplay: true }))
    expect(popup()).toBeNull()
    view.rerender(svg(IN_THE_AIR))
    fireEvent.pointerEnter(ghost())
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    view.rerender(svg(START + 112 * MINUTE, { live: landed }))
    expect(document.querySelector('.trip-map-ghost')).toBeNull()
    expect(popup()).toBeNull()
    // It stays closed when a ghost comes back.
    view.rerender(svg(IN_THE_AIR))
    expect(popup()).toBeNull()
  })

  it('opens over the plane drawn alone, by the schedule, and stays open on a press on it', () => {
    render(svg(IN_THE_AIR, { live: null }))
    expect(document.querySelector('.trip-map-real-plane')).toBeNull()
    fireEvent.pointerEnter(lone())
    expect(popupTitle()).toBe('UPS1234 · by the schedule')
    expect(popup()?.textContent).toBe("UPS1234 · by the scheduleNot tracked live, so it's shown where the schedule has itIf it's running late, it may still be at the gate")
    const x = lone().getAttribute('transform')!.match(/^translate\(([^ ]+) /)![1]
    expect(popup()?.getAttribute('style')).toContain(`left: ${x}px`)
    fireEvent.pointerLeave(lone(), { pointerType: 'mouse' })
    expect(popup()).toBeNull()
    fireEvent.click(lone())
    fireEvent.pointerDown(lone())
    expect(popupTitle()).toBe('UPS1234 · by the schedule')
  })

  it('says where the schedule had the plane drawn alone in a replay', () => {
    const t = START + 30 * MINUTE
    render(svg(t, { live: null, isReplay: true, map: liveTripMap(t, null) }))
    fireEvent.pointerEnter(lone())
    expect(popupTitle()).toBe('UPS1234 · by the schedule')
    expect(popup()?.querySelectorAll('p')[1].textContent).toMatch(new RegExp(`^Where the schedule had it at ${shortTimeText(t, NY, false)} L`))
  })

  it('closes when live data arrives and the real plane and its ghost take the lone plane’s place', () => {
    const view = render(svg(IN_THE_AIR, { live: null }))
    fireEvent.click(lone())
    expect(popupTitle()).toBe('UPS1234 · by the schedule')
    view.rerender(svg(IN_THE_AIR))
    expect(document.querySelector('.trip-map-plane')).toBeNull()
    expect(popup()).toBeNull()
    // It stays closed when the lone plane comes back.
    view.rerender(svg(IN_THE_AIR, { live: null }))
    expect(popup()).toBeNull()
  })

  it('opens nothing on the card’s map, whose planes take no pointer', () => {
    render(svg(IN_THE_AIR, { words: false }))
    fireEvent.pointerEnter(real())
    fireEvent.click(real())
    expect(popup()).toBeNull()
    expect(document.querySelector('svg')?.getAttribute('class')).toBe('trip-map-svg')
  })
})

describe("the popup on Apple's map", () => {
  async function shown(t: number, opts: { words?: boolean; map?: TripMap } = {}) {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    const map = opts.map ?? liveTripMap(t)
    const props = (at: number, m: TripMap, isReplay = false) => ({
      map: m, t: at, width: 390, height: 300, focus: m.legs[0], land: null, nightStep: 60_000, mapStyle: 'standard' as const,
      interactive: opts.words !== false, isReplay, planeWords: opts.words === false ? undefined : wordsAt(at, isReplay),
    })
    const view = render(<AppleTripMap {...props(t, map)} />)
    await waitFor(() => expect(kit.maps).toHaveLength(1))
    return { kit, view, map, props }
  }
  const mark = (kit: ReturnType<typeof fakeMapKit>, kind: string) => kit.maps[0].annotations.find((a) => a.element.classList.contains(kind))!
  const popupMark = (kit: ReturnType<typeof fakeMapKit>) => kit.maps[0].annotations.find((a) => a.element.className === 'apple-popup')
  const point = (element: HTMLElement, type: string, pointerType = 'mouse') => fireEvent(element, new PointerEvent(type, { bubbles: true, pointerType }))
  // MapKit lays out its marks itself: the stand-in keeps them off the page, so the popup is read from its own mark.
  const shownTitle = (kit: ReturnType<typeof fakeMapKit>) => popupMark(kit)?.element.querySelector('.trip-map-popup-title')?.textContent ?? null

  it('opens over every mark when a plane is pointed at, and closes when the pointer leaves', async () => {
    const { kit } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    expect(kit.maps[0].annotations.at(-1)).toBe(popupMark(kit))
    expect(popupMark(kit)!.coordinate).toEqual(mark(kit, 'realPlane').coordinate)
    expect(popupMark(kit)!.displayPriority).toBe(1000)
    expect(shownTitle(kit)).toBe('UPS1234 · real plane')
    point(mark(kit, 'realPlane').element, 'pointerleave')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('stays open after a tap, until a tap elsewhere on the map', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    point(mark(kit, 'ghost').element, 'pointerleave', 'touch')
    await waitFor(() => expect(shownTitle(kit)).toBe('On schedule'))
    point(mark(kit, 'ghost').element, 'pointerdown', 'touch')
    await new Promise((r) => setTimeout(r, 0))
    expect(shownTitle(kit)).toBe('On schedule')
    point(view.container.querySelector('.apple-trip-map') as HTMLElement, 'pointerdown', 'touch')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('moves with its plane, and goes over a mark made after it', async () => {
    const { kit, view, props } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const before = popupMark(kit)!.coordinate
    const later = liveTripMap(LATER, FURTHER)
    // A drive on to Trenton after the flight: a new airport's mark.
    const drive: MapLeg = {
      id: 'd1', kind: 'drive', origin: later.legs[0].destination, flightNumber: null, start: later.legs[0].end + 30 * MINUTE, end: later.legs[0].end + 60 * MINUTE,
      destination: { code: 'TTN', city: 'Trenton', place: { lat: 40.28, lng: -74.81 }, timeZone: NY },
    }
    view.rerender(<AppleTripMap {...props(LATER, { ...later, legs: [...later.legs, drive] })} />)
    await waitFor(() => expect(kit.maps[0].annotations.some((a) => a.element.textContent === 'TTN')).toBe(true))
    expect(popupMark(kit)!.coordinate).toEqual(mark(kit, 'realPlane').coordinate)
    expect(popupMark(kit)!.coordinate).not.toEqual(before)
    expect(kit.maps[0].annotations.at(-1)).toBe(popupMark(kit))
  })

  it('closes on a press elsewhere that MapKit keeps to itself', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const tile = document.createElement('div')
    tile.addEventListener('pointerdown', (e) => e.stopPropagation())
    view.container.querySelector('.apple-trip-map')!.appendChild(tile)
    point(tile, 'pointerdown', 'touch')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
  })

  it('goes under its plane near the map’s top', async () => {
    const { kit } = await shown(IN_THE_AIR)
    kit.maps[0].pagePoint = { x: 195, y: 30 }
    point(mark(kit, 'ghost').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)?.element.querySelector('.trip-map-popup')?.className).toBe('trip-map-popup below'))
  })

  it('measures its plane from the map, on a page scrolled down', async () => {
    const { kit } = await shown(IN_THE_AIR)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(100)
    // 130 px down the page is 30 px down the map: near its top.
    kit.maps[0].pagePoint = { x: 195, y: 130 }
    point(mark(kit, 'ghost').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)?.element.querySelector('.trip-map-popup')?.className).toBe('trip-map-popup below'))
  })

  it('closes as a replay starts, emptying its mark', async () => {
    const { kit, view, map, props } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const element = popupMark(kit)!.element
    view.rerender(<AppleTripMap {...props(START + 30 * MINUTE, map, true)} />)
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    expect(element.childNodes).toHaveLength(0)
  })

  it('closes when its plane goes, and stays closed when it comes back', async () => {
    const { kit, view, props } = await shown(IN_THE_AIR)
    fireEvent.click(mark(kit, 'ghost').element)
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const landed = liveFlight(TRAIL, { legId: 'f1', state: 'landed', landedAt: START + 110 * MINUTE, fix: fix(111, PHL.lat, PHL.lng, { onGround: true, trackDeg: null }) })
    view.rerender(<AppleTripMap {...props(START + 112 * MINUTE, liveTripMap(START + 112 * MINUTE, landed))} />)
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    view.rerender(<AppleTripMap {...props(IN_THE_AIR, liveTripMap(IN_THE_AIR))} />)
    await waitFor(() => expect(kit.maps[0].annotations.some((a) => a.element.classList.contains('ghost'))).toBe(true))
    expect(popupMark(kit)).toBeUndefined()
  })

  it('empties its mark when the map goes', async () => {
    const { kit, view } = await shown(IN_THE_AIR)
    point(mark(kit, 'realPlane').element, 'pointerenter')
    await waitFor(() => expect(popupMark(kit)).toBeDefined())
    const element = popupMark(kit)!.element
    view.unmount()
    expect(element.childNodes).toHaveLength(0)
  })

  it('opens over the plane drawn alone, by the schedule, and closes when live data arrives', async () => {
    const { kit, view, props } = await shown(IN_THE_AIR, { map: liveTripMap(IN_THE_AIR, null) })
    expect(kit.maps[0].annotations.some((a) => a.element.classList.contains('realPlane'))).toBe(false)
    point(mark(kit, 'plane').element, 'pointerenter')
    await waitFor(() => expect(shownTitle(kit)).toBe('UPS1234 · by the schedule'))
    expect(popupMark(kit)!.coordinate).toEqual(mark(kit, 'plane').coordinate)
    point(mark(kit, 'plane').element, 'pointerleave')
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    fireEvent.click(mark(kit, 'plane').element)
    point(mark(kit, 'plane').element, 'pointerdown', 'touch')
    await waitFor(() => expect(shownTitle(kit)).toBe('UPS1234 · by the schedule'))
    view.rerender(<AppleTripMap {...props(IN_THE_AIR, liveTripMap(IN_THE_AIR))} />)
    await waitFor(() => expect(popupMark(kit)).toBeUndefined())
    expect(kit.maps[0].annotations.some((a) => a.element.classList.contains('plane'))).toBe(false)
  })

  it('opens nothing on the card’s map', async () => {
    const { kit } = await shown(IN_THE_AIR, { words: false })
    point(mark(kit, 'realPlane').element, 'pointerenter')
    fireEvent.click(mark(kit, 'realPlane').element)
    await new Promise((r) => setTimeout(r, 0))
    expect(popupMark(kit)).toBeUndefined()
  })
})

describe('the key to the two planes (which plane design §2)', () => {
  const card = (t: number, live: typeof FLYING | null = FLYING) => {
    const map = liveTripMap(t, live)
    return <TripMapCard map={map} now={t} viewerTz={NY} h24={false} name="Alex" day={1} days={1} delayMinutes={null} land={null} onOpenMap={() => {}} />
  }
  const key = () => document.querySelector('.trip-map-key')

  it('names the real plane and the schedule on the card, hidden from screen readers', () => {
    render(card(IN_THE_AIR))
    expect(key()?.textContent).toBe('Real planeOn schedule')
    expect(key()?.getAttribute('aria-hidden')).toBe('true')
    expect(key()?.querySelectorAll('.trip-map-key-mark.real, .trip-map-key-mark.ghost')).toHaveLength(2)
  })

  it("isn't on the card for a flight with no live data", () => {
    render(card(IN_THE_AIR, null))
    expect(key()).toBeNull()
  })

  it("keeps the card's trip clear of it, as of the top chip", async () => {
    const padding = async (keyHeight: number) => {
      const kit = fakeMapKit()
      startAppleMapKit(async () => kit as unknown as MapKitApi)
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const height = this.classList.contains('trip-map-key') ? keyHeight : 0
        return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: height, width: 0, height, toJSON: () => ({}) } as DOMRect
      })
      render(card(IN_THE_AIR))
      await waitFor(() => expect(kit.maps[0]?.padding).toBeTruthy())
      const top = kit.maps[0].padding!.top
      cleanup()
      resetAppleMapKit()
      vi.restoreAllMocks()
      return top
    }
    expect(await padding(22)).toBeGreaterThan(await padding(0))
  })

  it('is on the full map now, and not in a replay; its planes open their popups there', () => {
    render(<TripMapPage map={liveTripMap(IN_THE_AIR)} now={IN_THE_AIR} viewerTz={NY} h24={false} day={1} days={1} land={null} onBack={() => {}} />)
    expect(key()?.textContent).toBe('Real planeOn schedule')
    fireEvent.pointerEnter(document.querySelector('.trip-map-real-plane')!)
    expect(popupTitle()).toBe('UPS1234 · real plane')
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    fireEvent.input(slider, { target: { value: String(Number(slider.max) / 4) } })
    expect(key()).toBeNull()
    expect(popup()).toBeNull()
    // In the replay the real plane's popup says where it was at the moment shown.
    fireEvent.pointerEnter(document.querySelector('.trip-map-real-plane')!)
    const shownTime = document.querySelector('.trip-timeline-time')!.textContent!.split(' · ')[0].replace(/^\S+\s/, '')
    expect(popup()?.textContent).toBe(`UPS1234 · real planeWhere it was at ${shownTime}`)
  })
})
