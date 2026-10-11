// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import type { Weather } from '../../src/data/weather'
import { makeSnapshot } from '../../src/engine/snapshot'
import type { StatusKind } from '../../src/engine/status'
import { LocationCard, showsLocationCard } from '../../src/ui/LocationCard'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor } from '../fixtures/engine'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NY = 'America/New_York'
const NOW = Date.UTC(2026, 9, 10, 17, 14) // Saturday 10 October: 9:14 AM in Anchorage, 1:14 PM in New York
const cloudy: Weather = { temperature: 41.2, code: 3, isDay: true }

const card = (airport: string | null, weather: Weather | null = null, opts: { h24?: boolean; now?: number } = {}) => (
  <LocationCard airport={airport} now={opts.now ?? NOW} homeTz={NY} h24={opts.h24 ?? false} airports={testAirports} weather={weather} />
)
/** Shows the odometer's final text at once. */
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

describe('LocationCard', () => {
  it('heads the card with a red pin and the city', () => {
    const { container } = render(card('ANC', cloudy))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Anchorage')
    const pin = container.querySelector('.location-head svg') as SVGElement
    expect(iconNameOf(pin)).toBe('MapPin')
    expect(pin.style.color).toBe('var(--red)')
  })

  it('shows the flag of a country the app has one for, and none in the US', () => {
    const { container, rerender } = render(card('CGN'))
    expect(container.querySelector('.location-flag')!.textContent).toBe('\u{1F1E9}\u{1F1EA}')
    rerender(card('ANC'))
    expect(container.querySelector('.location-flag')).toBeNull()
  })

  it('shows the weather, then credits Open-Meteo in a link that opens a new tab', () => {
    const { container } = render(card('ANC', cloudy))
    const row = container.querySelector('.weather-row')!
    const icon = row.querySelector('svg') as SVGElement
    expect(iconNameOf(icon)).toBe('Cloud')
    expect(icon.style.color).toBe('var(--gray)')
    expect(row.querySelector('.weather-temp')!.textContent).toBe('41°')
    expect(row.querySelector('.weather-words')!.textContent).toBe('Cloudy')
    // Screen readers also hear that it opens a new tab; the hidden words don't show.
    const credit = screen.getByRole('link', { name: 'Weather: Open-Meteo (opens in a new tab)' })
    expect(credit.querySelector('.sr-only')!.textContent).toBe(' (opens in a new tab)')
    expect(credit.getAttribute('href')).toBe('https://open-meteo.com/')
    expect(credit.getAttribute('target')).toBe('_blank')
    expect(credit.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('sizes the icons like the app: 22 px for the pin and the weather, 17 px for the clock and the plane', () => {
    const width = (el: Element | null) => el!.getAttribute('width')
    const { container, rerender } = render(card('ANC', cloudy))
    expect(width(container.querySelector('.location-head svg'))).toBe('22')
    expect(width(container.querySelector('.weather-row svg'))).toBe('22')
    expect(width(container.querySelector('.time-row svg'))).toBe('17')
    rerender(card('ANC'))
    expect(width(container.querySelector('.weather-none svg'))).toBe('17')
  })

  it('takes day or night for the weather icon from the sun times, so it always agrees with the dial', () => {
    const icon = () => container.querySelector('.weather-row svg') as SVGElement
    // 10:05 pm in Lexington, though the weather's own is_day still says day.
    const { container, rerender } = render(card('LEX', { temperature: 58, code: 0, isDay: true }, { now: Date.UTC(2026, 9, 11, 2, 5) }))
    expect(iconNameOf(icon())).toBe('Moon')
    expect(icon().style.color).toBe('var(--indigo)')
    // 1:14 pm, though is_day says night.
    rerender(card('LEX', { temperature: 58, code: 0, isDay: false }))
    expect(iconNameOf(icon())).toBe('Sun')
  })

  it('falls back to the weather’s own day or night where the sun neither rises nor sets', () => {
    const midwinter = Date.UTC(2026, 11, 21, 20) // Utqiaġvik
    const icon = () => container.querySelector('.weather-row svg')
    const { container, rerender } = render(card('BRW', { temperature: -8, code: 0, isDay: false }, { now: midwinter }))
    expect(iconNameOf(icon())).toBe('Moon')
    rerender(card('BRW', { temperature: -8, code: 0, isDay: true }, { now: midwinter }))
    expect(iconNameOf(icon())).toBe('Sun')
  })

  it('shows a plane and the airport code while there’s no weather', () => {
    const { container } = render(card('ANC'))
    const row = container.querySelector('.weather-row')!
    expect(row.classList.contains('weather-none')).toBe(true)
    expect(iconNameOf(row.querySelector('svg'))).toBe('Airplane')
    expect(row.textContent).toBe('ANC')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows the pilot’s local time and how far it is from home', () => {
    reduceMotion()
    const { container } = render(card('ANC', cloudy))
    expect(container.querySelector('.time-label')!.textContent).toBe('Current time:')
    expect(container.querySelector('.time-value')!.textContent).toBe('9:14\u202FAM')
    expect(container.querySelector('.time-diff .sr-only')!.textContent).toBe('4 hours behind you')
    expect(container.querySelector('.time-diff [aria-hidden="true"]')!.textContent).toBe('4h behind you')
  })

  it('uses 24-hour time for visitors who use it', () => {
    const { container } = render(card('ANC', cloudy, { h24: true }))
    expect(container.querySelector('.time-value')!.textContent).toBe('09:14')
  })

  it('says "same time as you" in home’s time zone', () => {
    const { container } = render(card('LEX'))
    expect(container.querySelector('.time-diff')!.textContent).toBe('same time as you')
  })

  it('puts the sun dial in the corner, named for the city', () => {
    render(card('ANC', cloudy))
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Sunrise .+, sunset .+, daytime in Anchorage$/)
  })

  it('makes the dial a button that opens the sun popup when the screen gives it one', () => {
    const onOpenSun = vi.fn()
    render(<LocationCard airport="ANC" now={NOW} homeTz={NY} h24={false} airports={testAirports} weather={cloudy} onOpenSun={onOpenSun} />)
    const dial = screen.getByRole('button', { name: /^Sunrise .+, sunset .+, daytime in Anchorage\. Opens sun details\.$/ })
    fireEvent.click(dial)
    expect(onOpenSun).toHaveBeenCalledTimes(1)
    expect(onOpenSun).toHaveBeenCalledWith(dial)
  })

  it('leaves the dial out when the sun neither rises nor sets that day, but keeps the time', () => {
    const { container, rerender } = render(card('BRW', null, { now: Date.UTC(2026, 11, 21, 20) })) // Utqiaġvik in midwinter
    expect(container.querySelector('.sun-dial')).toBeNull()
    expect(container.querySelector('.time-value')!.textContent).toBe('11:00\u202FAM')
    rerender(card('BRW', null, { now: Date.UTC(2026, 5, 21, 20) })) // and in midsummer
    expect(container.querySelector('.sun-dial')).toBeNull()
    expect(container.querySelector('.time-value')!.textContent).toBe('12:00\u202FPM')
  })

  it('shows only "Unknown Location" when nobody can tell where the pilot is', () => {
    const { container } = render(card(null, cloudy))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Unknown Location')
    expect(container.querySelector('.weather-row')).toBeNull()
    expect(container.querySelector('.location-time')).toBeNull()
    expect(container.querySelector('.sun-dial')).toBeNull()
  })

  it('shows an airport missing from the list as its code, with no time or dial', () => {
    const { container } = render(card('XYZ'))
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('XYZ')
    expect(container.querySelector('.weather-row')!.textContent).toBe('XYZ')
    expect(container.querySelector('.location-time')).toBeNull()
    expect(container.querySelector('.sun-dial')).toBeNull()
  })
})

describe('showsLocationCard', () => {
  // Every status but flying, as in the app. Ground transport shows the card, like a drive (spec §8 item 9).
  const SHOWN: Record<StatusKind, boolean> = {
    home: true, commutingHome: true, drivingHome: true, drivingToWork: true, inFlight: false, ground: true, turn: true,
    layover: true, base: true, reserve: true, hotStandby: true, training: true, event: true, off: true, unknown: true,
  }
  const e = engineFor(demoRaw('driver', A))
  const snap = makeSnapshot(e.schedule, e.legs, at(0), NY)

  it.each(Object.entries(SHOWN))('%s: %s', (kind, shown) => {
    expect(showsLocationCard({ ...snap, status: { ...snap.status, kind: kind as StatusKind } })).toBe(shown)
  })
})
