// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { factRow, type FactsAtMoment } from '../../src/facts/factRow'
import type { MapKitApi } from '../../src/map/mapkitApi'
import { makeTripMap } from '../../src/map/tripMap'
import { resetAppleMapKit, startAppleMapKit } from '../../src/ui/hooks/useAppleMapKit'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { fakeMapKit } from '../fixtures/fakeMapKit'
import { setWindowSize } from '../fixtures/ui'
import { AIRPORTS, at, drive, EUROPE, flight } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  setWindowSize(1024, 768)
  resetAppleMapKit()
  localStorage.clear()
})

const page = (now = at(12)) => {
  const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
  const onBack = vi.fn()
  render(<TripMapPage map={map} now={now} viewerTz="America/New_York" h24={false} day={1} days={4} land={null} onBack={onBack} />)
  return { onBack }
}

describe('the full map (moving map spec §6)', () => {
  it('names where things stand, and closes from its button and Escape', () => {
    const { onBack } = page()
    expect(screen.getByRole('heading', { level: 1, name: 'Day 1 of 4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close map' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(2)
  })

  it('replays from the timeline and goes back to Live', async () => {
    page()
    expect(screen.queryByRole('button', { name: 'Live' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
    // The replay starts from the real clock, while the page's now is the fixture's, a different time: until the first
    // animation frame brings the real time in, the two disagree, so the label is awaited.
    expect(await screen.findByRole('button', { name: 'Pause replay' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(screen.getByRole('button', { name: 'Replay the trip' })).toBeTruthy()
  })

  it('has a slider for the trip time and a speed choice', () => {
    page()
    const slider = screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement
    expect(Number(slider.min)).toBeLessThan(Number(slider.max))
    expect(Number(slider.step)).toBe(15 * 60_000)
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Replay speed' })).toBeTruthy()
  })

  it('moves the time as the replay plays, and the panel’s headline is a heading', async () => {
    const { container } = render(<TripMapPage map={makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!}
      now={at(12)} viewerTz="America/New_York" h24={false} day={1} days={4} land={null} onBack={() => {}} />)
    expect(container.querySelector('h2.trip-map-headline')).toBeTruthy()
    const time = () => container.querySelector('.trip-timeline-time')!.textContent
    const before = time()
    fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
    await waitFor(() => expect(time()).not.toBe(before))
  })

  it('keeps focus on the slider while the page re-renders with a new onBack', () => {
    const now = at(12)
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now, airports: AIRPORTS })!
    const view = (onBack: () => void) => (
      <TripMapPage map={map} now={now} viewerTz="America/New_York" h24={false} day={1} days={4} land={null} onBack={onBack} />
    )
    const { rerender } = render(view(vi.fn()))
    const slider = screen.getByRole('slider', { name: 'Trip time' })
    slider.focus()
    rerender(view(vi.fn()))
    expect(document.activeElement).toBe(slider)
  })

  it('slows a short drive so it takes 3 seconds at 1x (replay design, 2026-11-13)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      vi.setSystemTime(at(100))
      // A 30-minute drive to work, then the flight.
      const map = makeTripMap([drive('d1', 'SDF', 'LEX', 0, 0.5), flight('f1', 'LEX', 'CGN', 1, 8)], {
        isNextTrip: true, home: 'SDF', now: at(-2), airports: AIRPORTS,
      })!
      render(<TripMapPage map={map} now={at(-2)} viewerTz="America/New_York" h24={false} day={null} days={null} land={null} onBack={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
      act(() => {
        vi.advanceTimersByTime(1500)
      })
      // About halfway through the drive after 1.5 s. At a day in 48 s it would be some 45 minutes in, past the drive.
      const into = Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).value) - at(0)
      expect(into).toBeGreaterThan(10 * 60_000)
      expect(into).toBeLessThan(20 * 60_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('moves the night with every frame of a replay, so its edge glides rather than jumps', () => {
    vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      vi.setSystemTime(at(100))
      page()
      fireEvent.click(screen.getByRole('button', { name: 'Replay the trip' }))
      const night = () => document.querySelector('.trip-map-night')!.getAttribute('d')
      act(() => {
        vi.advanceTimersByTime(32)
      })
      const before = night()
      // Two frames on, a minute of the trip has passed: less than the 3-minute step that made the night jump.
      act(() => {
        vi.advanceTimersByTime(32)
      })
      expect(night()).not.toBe(before)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('the full map on Apple’s map (Apple Maps spec §4.1)', () => {
  it('keeps the SVG map and no style button when MapKit can’t load', async () => {
    page()
    await waitFor(() => expect(document.querySelector('svg.trip-map-svg')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /^Map style/ })).toBeNull()
  })

  it('cycles Hybrid, Map and Satellite, keeps the choice, and shows Recenter once the map is moved', async () => {
    const kit = fakeMapKit()
    startAppleMapKit(async () => kit as unknown as MapKitApi)
    page()
    const style = await screen.findByRole('button', { name: 'Map style: Hybrid' })
    fireEvent.click(style)
    expect(screen.getByRole('button', { name: 'Map style: Map' })).toBeTruthy()
    expect(kit.maps[0].mapType).toBe('standard')
    expect(localStorage.getItem('crewluve.mapStyle.v1')).toBe('standard')
    expect(screen.queryByRole('button', { name: 'Recenter map' })).toBeNull()
    act(() => kit.maps[0].fire('zoom-start'))
    fireEvent.click(screen.getByRole('button', { name: 'Recenter map' }))
    expect(screen.queryByRole('button', { name: 'Recenter map' })).toBeNull()
    expect(kit.maps[0].rects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('the facts’ panel (Stage 2 spec §10)', () => {
  const facts: FactsAtMoment = {
    headline: 'Over Kansas',
    rows: [factRow('distance', 'Path', '2,140 mi flown · 1,960 to go', ['Halfway at 4:12 PM'])],
    tripSoFar: { flights: [], totalsTitle: 'Trip so far', totals: 'Day 1 of 4 · 2,140 mi' },
  }
  const show = (factsAt?: () => FactsAtMoment) => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, home: 'SDF', now: at(12), airports: AIRPORTS })!
    return render(<TripMapPage map={map} now={at(12)} viewerTz="America/New_York" h24={false} day={1} days={4} land={null}
      onBack={() => {}} factsAt={factsAt} />)
  }
  const body = (container: Element) => container.querySelector<HTMLElement>('#trip-facts')!

  it('on a phone, opens with "More facts" and closes with "Fewer facts"', () => {
    setWindowSize(402, 874)
    const { container } = show(() => facts)
    expect(screen.getByRole('heading', { level: 2, name: 'Over Kansas' })).toBeTruthy()
    const more = screen.getByRole('button', { name: 'More facts' })
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(body(container).hidden).toBe(true)
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: 'Fewer facts' }).getAttribute('aria-expanded')).toBe('true')
    expect(body(container).hidden).toBe(false)
    expect(screen.getByText('2,140 mi flown · 1,960 to go. Halfway at 4:12 PM')).toBeTruthy()
  })

  it('on a wide window, opens with its facts showing and folds to the headline and timeline', () => {
    setWindowSize(1280, 800)
    const { container } = show(() => facts)
    const hide = screen.getByRole('button', { name: 'Hide facts' })
    expect(hide.getAttribute('aria-expanded')).toBe('true')
    expect(body(container).hidden).toBe(false)
    fireEvent.click(hide)
    expect(screen.getByRole('button', { name: 'Show facts' })).toBeTruthy()
    expect(body(container).hidden).toBe(true)
    expect(screen.getByRole('slider', { name: 'Trip time' })).toBeTruthy()
  })

  it('without facts, is Stage 1B’s panel', () => {
    const { container } = show()
    expect(screen.queryByRole('button', { name: /facts/ })).toBeNull()
    expect(container.querySelector('#trip-facts')).toBeNull()
    expect(container.querySelector('h2.trip-map-headline')!.textContent).toContain('Cologne')
  })
})

describe('opening a recap (Stage 2 spec §6.5)', () => {
  it('opens paused at the trip’s start, with Live to jump to now', () => {
    const map = makeTripMap(EUROPE, { isNextTrip: false, isRecap: true, home: 'SDF', now: at(80), airports: AIRPORTS })!
    render(<TripMapPage map={map} now={at(80)} viewerTz="America/New_York" h24={false} day={null} days={null} land={null} onBack={() => {}} />)
    expect(Number((screen.getByRole('slider', { name: 'Trip time' }) as HTMLInputElement).value)).toBe(map.span.start)
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Trip recap' })).toBeTruthy()
  })
})
