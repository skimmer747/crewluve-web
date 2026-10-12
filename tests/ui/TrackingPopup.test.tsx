// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackingLinks } from '../../src/copy/tracking'
import { TRACKING_CLOSE_MS, TrackingPopup } from '../../src/ui/TrackingPopup'
import { iconNameOf } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const links = trackingLinks('5X', '2962')
const popup = (onClose = () => {}, withLinks = true) => <TrackingPopup flightNumber="UPS2962" links={withLinks ? links : null} onClose={onClose} />
const reduceMotion = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))

describe('TrackingPopup', () => {
  it('is a dialog named for the flight, with the app’s words', () => {
    const { container } = render(popup())
    const dialog = screen.getByRole('dialog', { name: 'UPS2962' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(iconNameOf(container.querySelector('.tracking-head svg'))).toBe('Airplane')
    expect(container.querySelector('.tracking-lead')!.textContent).toBe('Track this flight')
    expect([...container.querySelectorAll('.tracking-link-name')].map((el) => el.textContent)).toEqual(['FlightRadar24', 'FlightAware'])
    expect([...container.querySelectorAll('.tracking-link-caption')].map((el) => el.textContent)).toEqual(['Live tracking map', 'Flight status & history'])
  })

  it('links to the flight’s pages in a new tab, telling them nothing about where the visitor came from', () => {
    render(popup())
    const radar = screen.getByRole('link', { name: 'FlightRadar24 Live tracking map (opens in a new tab)' })
    const aware = screen.getByRole('link', { name: 'FlightAware Flight status & history (opens in a new tab)' })
    expect(radar.getAttribute('href')).toBe('https://fr24.com/UPS2962')
    expect(aware.getAttribute('href')).toBe('https://www.flightaware.com/live/flight/UPS2962')
    for (const link of [radar, aware]) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it('marks each link with its icon and the “opens elsewhere” icon', () => {
    const { container } = render(popup())
    const [radar, aware] = [...container.querySelectorAll('.tracking-link')]
    expect([...radar.querySelectorAll('svg')].map(iconNameOf)).toEqual(['Broadcast', 'ArrowSquareOut'])
    expect([...aware.querySelectorAll('svg')].map(iconNameOf)).toEqual(['GpsFix', 'ArrowSquareOut'])
  })

  it('has only its header and “Track this flight” without links, as the app does', () => {
    const { container } = render(popup(() => {}, false))
    expect(container.querySelector('.tracking-link')).toBeNull()
    expect(container.querySelector('.tracking-lead')!.textContent).toBe('Track this flight')
  })

  it('puts focus on the close button as it opens', () => {
    render(popup())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  })

  it('closes by the close button, the backdrop or Escape, once, after the 0.2 s fade', () => {
    vi.useFakeTimers()
    for (const how of ['button', 'backdrop', 'escape'] as const) {
      const onClose = vi.fn()
      const { container, unmount } = render(popup(onClose))
      if (how === 'button') fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      if (how === 'backdrop') fireEvent.click(container.querySelector('.tracking-backdrop')!)
      if (how === 'escape') fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(container.querySelector('.tracking-popup')!.getAttribute('class')).toBe('tracking-popup closing')
      act(() => {
        vi.advanceTimersByTime(TRACKING_CLOSE_MS - 1)
      })
      expect(onClose).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('closes when a link is followed, as the app’s buttons do', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(popup(onClose))
    const link = screen.getByRole('link', { name: /FlightAware/ })
    link.addEventListener('click', (event) => event.preventDefault()) // so the test's browser doesn't try to open the page
    fireEvent.click(link)
    act(() => {
      vi.advanceTimersByTime(TRACKING_CLOSE_MS)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes at once for visitors who ask for reduced motion', () => {
    reduceMotion()
    const onClose = vi.fn()
    render(popup(onClose))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
