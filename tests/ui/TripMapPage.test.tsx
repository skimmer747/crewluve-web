// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { factRow, type FactsAtMoment } from '../../src/facts/factRow'
import { makeTripMap } from '../../src/map/tripMap'
import { TripMapPage } from '../../src/ui/TripMapPage'
import { setWindowSize } from '../fixtures/ui'
import { AIRPORTS, at, EUROPE } from '../map/tripMapLegs'

afterEach(() => {
  cleanup()
  setWindowSize(1024, 768)
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
