// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Weather } from '../../src/data/weather'
import { sharedDaylight } from '../../src/time/sharedDaylight'
import { sunTimes } from '../../src/time/sun'
import { wedgePath } from '../../src/ui/bigDialGeometry'
import { DRAG_CLOSE_PX } from '../../src/ui/hooks/useDragToClose'
import { POPUP_CLOSE_MS } from '../../src/ui/hooks/usePopupClose'
import { locationFacts, showsDial } from '../../src/ui/locationFacts'
import { hourAngle } from '../../src/ui/sunDialGeometry'
import { SunPopup, type SunPopupProps } from '../../src/ui/SunPopup'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { testAirports } from '../fixtures/airports'
import { heldProperties, iconNameOf, stubAnimationFrames } from '../fixtures/ui'

const NY = 'America/New_York'
const NIGHT = Date.UTC(2026, 9, 11, 6, 5) // 10:05 PM in Anchorage, 2:05 AM in New York
const DAYTIME = Date.UTC(2026, 9, 10, 21, 14) // 1:14 PM in Anchorage
const cloudy: Weather = { temperature: 41.2, code: 3, isDay: false }
const scheduled = NIGHT + 5 * HOUR + 20 * MINUTE

/** The popup in Anchorage, as the screen would draw it: the place's facts are worked out for the time and weather given. */
const props = (over: Partial<Omit<SunPopupProps, 'facts'>> = {}): SunPopupProps => {
  const base = { now: NIGHT, homeTz: NY, homeAirport: 'LEX', h24: false, airports: testAirports, weather: cloudy, departure: { scheduled, actual: scheduled }, onClose: () => {}, ...over }
  const facts = locationFacts('ANC', base.now, testAirports, base.weather)
  if (!showsDial(facts)) throw new Error('Anchorage should have sun times')
  return { ...base, facts }
}
const popup = (over: Partial<Omit<SunPopupProps, 'facts'>> = {}) => <SunPopup {...props(over)} />
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
const text = (container: Element, selector: string) => container.querySelector(selector)!.textContent

beforeEach(() => {
  // No canvas in happy-dom: the weather animation draws nothing, but its canvas is there.
  stubAnimationFrames()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SunPopup', () => {
  it('is a dialog named for the city, with the two clocks and the big dial', () => {
    const { container } = render(popup())
    const dialog = screen.getByRole('dialog', { name: 'Anchorage' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const [local, home] = [...container.querySelectorAll('.sun-popup-time')]
    expect(local.textContent).toBe('Local time 10:05\u202FPM')
    expect(home.textContent).toBe('Time at home 2:05\u202FAM')
    expect(
      screen.getByRole('img', {
        name: 'Sunrise 8:30\u202FAM, sunset 7:03\u202FPM, nighttime in Anchorage, 4 hours behind you. Next departure 3:25\u202FAM, in 5 hours, 20 minutes.',
      }),
    ).toBeTruthy()
    expect(container.querySelector('.sun-dial')!.getAttribute('class')).toBe('sun-dial big')
  })

  it('shows the weather, the daylight, sunrise and sunset, the moon, the place and the credit', () => {
    const { container } = render(popup())
    expect(iconNameOf(container.querySelector('.sun-popup-weather-row svg'))).toBe('Cloud')
    expect(container.querySelector('.sun-popup-weather-row svg')!.getAttribute('width')).toBe('28')
    expect(text(container, '.sun-popup-temp')).toBe('41°')
    expect(text(container, '.sun-popup-words')).toBe('Cloudy')
    const rows = [...container.querySelectorAll('.sun-popup-row')].map((row) => row.textContent)
    expect(rows).toEqual(['10h 32m of daylight', 'Sunrise 8:30\u202FAMSunset 7:03\u202FPM', 'New Moon', 'In Anchorage'])
    expect(screen.getByRole('link', { name: 'Weather: Open-Meteo (opens in a new tab)' }).getAttribute('href')).toBe('https://open-meteo.com/')
  })

  it('draws the app’s icons: the pin, the close button, the clocks’ sun or moon and house, and the rows’', () => {
    const { container } = render(popup())
    const icon = (selector: string) => iconNameOf(container.querySelector(selector))
    expect(icon('.sun-popup-head > svg')).toBe('MapPin')
    expect(iconNameOf(screen.getByRole('button', { name: 'Close' }).querySelector('svg'))).toBe('XCircle')
    const [local, home] = [...container.querySelectorAll('.sun-popup-time svg')] as SVGElement[]
    expect([iconNameOf(local), local.style.color, local.getAttribute('width')]).toEqual(['Moon', 'var(--indigo)', '15'])
    expect([iconNameOf(home), home.style.color]).toEqual(['House', 'var(--green)'])
    expect(icon('.sun-popup-sunrise svg')).toBe('SunHorizon')
    expect(icon('.sun-popup-sunset svg')).toBe('SunHorizon')
    expect(icon('.sun-popup-where svg')).toBe('MapPinArea')
    expect(container.querySelector('.sun-popup-moon .moon-phase')).not.toBeNull()
  })

  it('shows the sun in the clock row by day, and follows the visitor’s 24-hour clock', () => {
    const { container } = render(popup({ now: DAYTIME, h24: true }))
    const local = container.querySelector('.sun-popup-time svg') as SVGElement
    expect([iconNameOf(local), local.style.color]).toEqual(['Sun', 'var(--orange)'])
    expect([...container.querySelectorAll('.sun-popup-time')].map((t) => t.textContent)).toEqual(['Local time 13:14', 'Time at home 17:14'])
    expect(text(container, '.sun-popup-sunrise')).toBe('Sunrise 08:30')
  })

  it('is dark at night whatever the device, and follows the device by day', () => {
    const { container, rerender } = render(popup())
    expect(container.querySelector('.sun-popup-card')!.classList.contains('force-dark')).toBe(true)
    rerender(popup({ now: DAYTIME }))
    expect(container.querySelector('.sun-popup-card')!.classList.contains('force-dark')).toBe(false)
  })

  it('lays home’s shared daylight on the dial from home’s airport, and none without one', () => {
    const { container, rerender } = render(popup())
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(1)
    rerender(popup({ homeAirport: null }))
    expect(container.querySelectorAll('.sun-shared')).toHaveLength(0)
  })

  it('plays the weather animation behind the card', () => {
    const { container } = render(popup())
    expect(container.querySelector('.sun-popup-card > canvas.sun-popup-weather')).not.toBeNull()
  })

  it('leaves out the weather row, the credit and the animation without weather, and keeps the rest', () => {
    const { container } = render(popup({ weather: null }))
    expect(container.querySelector('.sun-popup-weather-row')).toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelectorAll('.sun-popup-row')).toHaveLength(4)
    expect(container.querySelector('.sun-dial.big')).not.toBeNull()
  })
})

describe('SunPopup: what it hands the dial', () => {
  // One departure object throughout, as when nothing about the flight has changed, so only the input under test moves.
  const departure = { scheduled, actual: scheduled }

  it('works home’s sun times out again when home’s day turns over', () => {
    const evening = Date.UTC(2026, 9, 11, 3) // 11 PM on 10 October in New York
    const { container, rerender } = render(popup({ now: evening, departure }))
    rerender(popup({ now: NIGHT, departure }))
    const anchorage = testAirports.get('ANC')!
    const lexington = testAirports.get('LEX')!
    const [span] = sharedDaylight(sunTimes(NIGHT, anchorage.lat, anchorage.lng, 'America/Anchorage')!, sunTimes(NIGHT, lexington.lat, lexington.lng, NY)!, NY)
    expect(container.querySelector('.sun-shared-wedge')!.getAttribute('d')).toBe(wedgePath(hourAngle(span.start), hourAngle(span.end)))
  })

  it('uses the home zone it’s given now', () => {
    const { rerender } = render(popup({ departure }))
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('4 hours behind you')
    rerender(popup({ departure, homeTz: 'America/Chicago' }))
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('3 hours behind you')
  })

  it('shows a delay as soon as it arrives', () => {
    const { rerender } = render(popup({ departure }))
    rerender(popup({ departure: { scheduled, actual: scheduled + 40 * MINUTE } }))
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('40 minutes late')
  })
})

describe('SunPopup: opening and closing', () => {
  it('moves focus to the close button and holds the page still where it was, then puts it back', () => {
    // The body is fixed in place, since iOS before 16 still scrolls a page whose body has overflow: hidden.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 })
    try {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      const body = () => [document.body.style.position, document.body.style.top, document.body.style.width, document.body.style.overflow]
      const { unmount } = render(popup())
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
      expect(body()).toEqual(['fixed', '-120px', '100%', 'hidden'])
      unmount()
      expect(body()).toEqual(['', '', '', ''])
      expect(scrollTo).toHaveBeenCalledWith(0, 120)
    } finally {
      delete (window as { scrollY?: unknown }).scrollY
    }
  })

  it.each([
    ['the close button', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['the Escape key', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['a tap on the backdrop', () => fireEvent.click(document.querySelector('.sun-popup-backdrop')!)],
  ])('closes by %s, fading out over 0.2 s first', async (_how, ask) => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    ask()
    await act(() => {})
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only once, however often it’s asked', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(popup({ onClose }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    vi.advanceTimersByTime(POPUP_CLOSE_MS * 3)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('starts a close from wherever the opening has the backdrop and the card (their opacity) and the big dial (its size)', () => {
    const { container } = render(popup())
    const close = screen.getByRole('button', { name: 'Close' })
    const held = heldProperties()
    fireEvent.click(close)
    const parts = ['.sun-popup-backdrop', '.sun-popup-card', '.sun-dial.big'].map((selector) => held.get(container.querySelector(selector)!))
    expect(parts).toEqual([['opacity'], ['opacity'], ['transform']])
  })

  it('closes from where the drag left the card, without moving it', async () => {
    const { container } = render(popup())
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 260, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: 260, pointerId: 1 })
    await act(() => {})
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(true)
    expect(card.style.transform).toBe('translateY(160px)')
  })

  it('closes when the card is dragged down more than 100 px, following the drag', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 260, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('translateY(160px)')
    expect(card.classList.contains('dragging')).toBe(true)
    fireEvent.pointerUp(grab, { clientY: 260, pointerId: 1 })
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('springs back from a drag of exactly 100 px, and closes past it', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    const grab = container.querySelector('.sun-popup-grab')!
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: 100 + DRAG_CLOSE_PX, pointerId: 1 })
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 2 })
    fireEvent.pointerUp(grab, { clientY: 101 + DRAG_CLOSE_PX, pointerId: 2 })
    vi.advanceTimersByTime(POPUP_CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('springs back from a shorter drag, or one the browser cancels', async () => {
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 180, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: 180, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    expect(card.classList.contains('dragging')).toBe(false)
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 2 })
    fireEvent.pointerMove(grab, { clientY: 400, pointerId: 2 })
    fireEvent.pointerCancel(grab, { clientY: 400, pointerId: 2 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    expect(container.querySelector('.sun-popup')!.classList.contains('closing')).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('doesn’t make the dial work itself out again on each move of a drag', () => {
    const { container } = render(popup())
    const grab = container.querySelector('.sun-popup-grab')!
    fireEvent.pointerDown(grab, { clientY: 100, pointerId: 1 })
    const formatToParts = vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
    for (const y of [110, 120, 130, 140, 150]) fireEvent.pointerMove(grab, { clientY: y, pointerId: 1 })
    // Each move redraws the popup, whose own four times (two clocks, sunrise and sunset) take one each. The dial's
    // angles, labels and description, about 30 more, wait for the next second.
    expect(formatToParts.mock.calls.length).toBeLessThanOrEqual(5 * 4)
  })

  it('never drags up, and never starts a drag on the close button', async () => {
    const { container } = render(popup())
    const grab = container.querySelector('.sun-popup-grab')!
    const card = container.querySelector('.sun-popup-card') as HTMLElement
    fireEvent.pointerDown(grab, { clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 100, pointerId: 1 })
    await act(() => {})
    expect(card.style.transform).toBe('')
    fireEvent.pointerUp(grab, { clientY: 100, pointerId: 1 })
    const close = screen.getByRole('button', { name: 'Close' })
    fireEvent.pointerDown(close, { clientY: 100, pointerId: 3 })
    fireEvent.pointerMove(grab, { clientY: 300, pointerId: 3 })
    await act(() => {})
    expect(card.style.transform).toBe('')
  })

  it('keeps Tab inside: past the last link back to the close button, and Shift-Tab the other way', () => {
    render(popup())
    const close = screen.getByRole('button', { name: 'Close' })
    const link = screen.getByRole('link')
    link.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(link)
  })

  it('appears and goes at once for reduced motion, with no animation and a still dial', () => {
    reduceMotion()
    const frames = stubAnimationFrames()
    const onClose = vi.fn()
    const { container } = render(popup({ onClose }))
    expect(container.querySelector('canvas')).toBeNull()
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.sun-sweep-solid')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
