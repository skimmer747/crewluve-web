// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InFlightCard } from '../../src/ui/InFlightCard'
import type { FlightEnd, InFlightFacts } from '../../src/ui/inFlightFacts'
import { HOUR, MINUTE } from '../../src/time/zoned'
import { iconNameOf, visibleText } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const ANC: FlightEnd = { code: 'ANC', city: 'Anchorage', place: { lat: 61.1744, lon: -149.9983 }, timeZone: 'America/Anchorage' }
const SDF: FlightEnd = { code: 'SDF', city: 'Louisville', place: { lat: 38.1746, lon: -85.7382 }, timeZone: 'America/Kentucky/Louisville' }
const OUT = Date.UTC(2026, 9, 12, 13, 40)
const NOW = OUT + 100 * MINUTE // 11:20 AM in Louisville
const facts = (over: Partial<InFlightFacts> = {}): InFlightFacts => ({
  dep: ANC, arr: SDF, start: OUT, end: OUT + 5 * HOUR, blockMs: 5 * HOUR, delayMinutes: 40,
  flightNumber: 'UPS2962', trackingNumber: 'UPS2962', links: null, ...over,
})
const card = (over: Partial<InFlightFacts> = {}, h24 = false, onOpenTracking = () => {}) => (
  <InFlightCard facts={facts(over)} now={NOW} h24={h24} onOpenTracking={onOpenTracking} />
)

describe('InFlightCard', () => {
  it('is a frosted card, named for screen readers, with the map, the banner and the info bar in that order', () => {
    const { container } = render(card())
    const section = container.querySelector('section')!
    expect(section.getAttribute('class')).toBe('card glass inflight')
    expect(screen.getByRole('heading', { level: 2, name: 'In flight' }).classList.contains('sr-only')).toBe(true)
    expect([...section.children].map((el) => el.getAttribute('class'))).toEqual(['sr-only', 'flight-map', 'inflight-banner late', 'inflight-bar'])
  })

  it('shows DELAYED with a warning for a late departure, and EARLY DEP with a check for an early one', () => {
    const { container, rerender } = render(card())
    const banner = () => container.querySelector('.inflight-banner')!
    expect(visibleText(banner())).toBe('DELAYED 40m')
    expect(iconNameOf(banner().querySelector('svg'))).toBe('Warning')
    rerender(card({ delayMinutes: -20 }))
    expect(banner().getAttribute('class')).toBe('inflight-banner early')
    expect(visibleText(banner())).toBe('EARLY DEP 20m')
    expect(iconNameOf(banner().querySelector('svg'))).toBe('CheckCircle')
  })

  it('says the banner in words to screen readers, so "40m" isn’t read as meters', () => {
    const { container, rerender } = render(card())
    const banner = () => container.querySelector('.inflight-banner')!
    expect(banner().querySelector('[aria-hidden="true"]:not(svg)')!.textContent).toBe('DELAYED 40m')
    expect(banner().querySelector('.sr-only')!.textContent).toBe('Delayed 40 minutes')
    rerender(card({ delayMinutes: -20 }))
    expect(banner().querySelector('.sr-only')!.textContent).toBe('Departed 20 minutes early')
  })

  it('has no banner when the flight is on time', () => {
    expect(render(card({ delayMinutes: null })).container.querySelector('.inflight-banner')).toBeNull()
  })

  it('makes the flight number a button that opens the tracking popup, handing itself over', () => {
    const open = vi.fn()
    render(card({}, false, open))
    const button = screen.getByRole('button', { name: 'UPS2962' })
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(button)
    expect(open).toHaveBeenCalledWith(button)
  })

  it('says In Flight under the number, and keeps it without a number', () => {
    const { container } = render(card({ flightNumber: null }))
    expect(container.querySelector('.inflight-number')).toBeNull()
    expect(container.querySelector('.inflight-status')!.textContent).toBe('In Flight')
  })

  it('shows the arrival airport’s time and code, in 24-hour when asked', () => {
    const { container, rerender } = render(card())
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Louisville 11:20\u202FAM')
    expect(iconNameOf(container.querySelector('.inflight-time svg'))).toBe('NavigationArrow')
    expect(container.querySelector('.inflight-code')!.textContent).toBe('SDF')
    rerender(card({}, true))
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Louisville 11:20')
  })

  it('falls back to the departure’s time when the arrival’s zone isn’t known, and names its city', () => {
    const { container } = render(card({ arr: { ...SDF, timeZone: null } }))
    expect(container.querySelector('.inflight-time')!.textContent).toBe('Time in Anchorage 7:20\u202FAM')
  })

  it('shows no time, and names no city for it, when neither airport’s zone is known', () => {
    const { container } = render(card({ dep: { ...ANC, timeZone: null }, arr: { ...SDF, timeZone: null } }))
    expect(container.querySelector('.inflight-time')!.textContent).toBe('')
  })
})
