// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Weather } from '../../src/data/weather'
import { CLOSE_MS, SunPopup, type SunPopupProps } from '../../src/ui/SunPopup'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { testAirports } from '../fixtures/airports'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

const NY = 'America/New_York'
const NIGHT = Date.UTC(2026, 9, 11, 6, 5) // 10:05 PM in Anchorage, 2:05 AM in New York
const DAYTIME = Date.UTC(2026, 9, 10, 21, 14) // 1:14 PM in Anchorage
const cloudy: Weather = { temperature: 41.2, code: 3, isDay: false }
const scheduled = NIGHT + 5 * HOUR + 20 * MINUTE

const props = (over: Partial<SunPopupProps> = {}): SunPopupProps => ({
  airport: 'ANC',
  now: NIGHT,
  homeTz: NY,
  homeAirport: 'LEX',
  h24: false,
  airports: testAirports,
  weather: cloudy,
  departure: { scheduled, actual: scheduled },
  onClose: () => {},
  ...over,
})
const popup = (over: Partial<SunPopupProps> = {}) => <SunPopup {...props(over)} />
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
const text = (container: Element, selector: string) => container.querySelector(selector)!.textContent

beforeEach(() => {
  // No canvas in happy-dom: the weather animation draws nothing, but its canvas is there.
  stubAnimationFrames()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
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

describe('SunPopup: opening and closing', () => {
  it('moves focus to the close button and stops the page scrolling, then puts both back', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { unmount } = render(popup())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
    // Focus goes back just after the page stops being inert, at the end of the render that closes the popup.
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.activeElement).toBe(opener)
    opener.remove()
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
    vi.advanceTimersByTime(CLOSE_MS)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only once, however often it’s asked', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(popup({ onClose }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    vi.advanceTimersByTime(CLOSE_MS * 3)
    expect(onClose).toHaveBeenCalledTimes(1)
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
    vi.advanceTimersByTime(CLOSE_MS)
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
