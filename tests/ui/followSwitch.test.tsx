// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFollowsPlane } from '../../src/ui/hooks/useFollowsPlane'
import { FOLLOW_CAPTION_MS } from '../../src/ui/TripTimeline'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { equatorFlight, flightMap } from '../facts/factsTestData'
import { date } from '../facts/liveFacts'

/**
 * The Follow the plane switch (the app's follow the plane design §2): under the full map's timeline, beside Quick
 * layovers (Todd, 17 Nov 2026), off at first and remembered by this browser. The flight is the equator flight from E0 to
 * E20, its plan in the air from 10:15 to 13:15 UTC.
 */
const at = (time: string) => date(`2026-03-20T${time}:00Z`)
const leg = equatorFlight(0, 20)
const map = flightMap(leg, null)

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('the Follow the plane switch (follow the plane design §2; under the timeline, Todd, 17 Nov 2026)', () => {
  const page = (now = at('11:45')) => render(<TripMapPage map={map} now={now} viewerTz="America/New_York" h24={false} day={1} days={1} land={null} onBack={() => {}} />)
  const toggle = () => screen.getByRole('switch', { name: 'Follow the plane' }) as HTMLInputElement

  it('is off at first, under Quick layovers', () => {
    page()
    expect(toggle().checked).toBe(false)
    const switches = screen.getAllByRole('switch').map((s) => s.closest('label')?.textContent?.trim())
    expect(switches).toEqual(['Quick layovers', 'Follow the plane'])
  })

  it('is remembered by this browser', () => {
    page()
    fireEvent.click(toggle())
    expect(toggle().checked).toBe(true)
    expect(localStorage.getItem('crewluve.tripMap.followsPlane')).toBe('on')
    cleanup()
    page()
    expect(toggle().checked).toBe(true)
    fireEvent.click(toggle())
    expect(localStorage.getItem('crewluve.tripMap.followsPlane')).toBe('off')
  })

  it('reads as off, and still switches, where storage can’t be read or written', () => {
    const blocked = () => {
      throw new Error('blocked')
    }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    let shown: [boolean, (on: boolean) => void] | null = null
    function Probe() {
      shown = useFollowsPlane()
      return null
    }
    render(<Probe />)
    expect(shown![0]).toBe(false)
    act(() => shown![1](true))
    expect(shown![0]).toBe(true)
  })

  it('says beside it for a moment what a tap did, as a status screen readers hear, and the app’s words', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      page()
      const status = () => screen.getByRole('status').textContent
      expect(status()).toBe('')
      fireEvent.click(toggle())
      expect(status()).toBe('Following the plane')
      act(() => {
        vi.advanceTimersByTime(FOLLOW_CAPTION_MS)
      })
      expect(status()).toBe('')
      fireEvent.click(toggle())
      expect(status()).toBe('Showing the whole flight')
      // The switch keeps its name: the caption is beside it, not in its label.
      expect(screen.getByRole('switch', { name: 'Follow the plane' })).toBe(toggle())
    } finally {
      vi.useRealTimers()
    }
  })

  it('says when it will follow, turned on with no flight in the air', () => {
    page(at('13:30'))
    fireEvent.click(toggle())
    expect(screen.getByRole('status').textContent).toBe('Follows the plane when a flight is in the air')
  })

  it('tells screen readers what it does', () => {
    page()
    const hint = document.getElementById(toggle().getAttribute('aria-describedby')!)
    expect(hint?.textContent).toBe('Keeps the map on the plane and where it’s headed.')
  })
})
