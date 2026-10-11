// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoRaw, demoRawForScene, DEMO_SCENES, type DemoScene } from '../../src/data/demo'
import type { Weather } from '../../src/data/weather'
import { buildLegs, type Leg } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import { makeSnapshot, safeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { EmptyState } from '../../src/ui/EmptyState'
import type { FooterProps } from '../../src/ui/Footer'
import { StatusScreen } from '../../src/ui/StatusScreen'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor } from '../fixtures/engine'
import { stubAnimationFrames } from '../fixtures/ui'

/** The text a sighted visitor sees: everything except the screen-reader-only words. */
function visibleText(el: Element): string {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('.sr-only').forEach((node) => node.remove())
  return copy.textContent ?? ''
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const NY = 'America/New_York'
const e = engineFor(demoRaw('driver', A))
const footer = (now: number): FooterProps => ({
  now, lastSuccessAt: now, newestUpdatedAt: now - 3_600_000, problem: null, refreshing: false,
  onRefresh: () => {}, onSignOut: () => {}, signOutLabel: 'Sign out', viewerTz: NY, h24: false,
})

function screenAt(minutes: number, snap: Snapshot = makeSnapshot(e.schedule, e.legs, at(minutes), NY), demo = false, celebrateKey = 0) {
  const now = at(minutes)
  return (
    <StatusScreen snap={snap} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo={demo} celebrateKey={celebrateKey}
      footer={footer(now)} />
  )
}

function renderAt(minutes: number, snap?: Snapshot, demo = false) {
  return render(screenAt(minutes, snap, demo))
}

describe('StatusScreen', () => {
  it('away: title, sentence, and the Back Home In card with date and city', () => {
    const { container } = renderAt(100)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(visibleText(container.querySelector('.narrative-text')!)).toBe(
      'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00am EDT.',
    )
    // Screen readers hear the countdown in words, not "50m".
    expect(container.querySelector('.narrative-text .sr-only')!.textContent).toBe('50 minutes')
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('1 day, 7 hours, 40 minutes')
    expect(screen.getByRole('heading', { level: 2, name: 'Back Home In' })).toBeTruthy()
    expect(container.querySelector('.countdown-value')!.textContent).toBe('1d  07h  40m')
    expect(container.querySelector('.countdown-sub')!.textContent).toBe('Sat, Oct 10 at 2:50\u202FPM · Lexington')
  })

  it('home: Leaves Home In with its departure line, then the been-home pill', () => {
    const { container } = renderAt(-1440)
    expect(screen.getByRole('heading', { level: 2, name: 'Leaves Home In' })).toBeTruthy()
    expect(container.querySelector('.countdown-value')!.textContent).toBe('22h  30m')
    expect(container.querySelector('.countdown-sub')!.textContent).toBe('Departs Friday October 9th at 4:00am')
    expect(screen.getByText("Alex's been home for 3 days")).toBeTruthy()
  })

  it('shows only the sentence when the engine fails, and the demo banner in demo mode', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unknown = safeSnapshot(e.schedule, null as unknown as Leg[], at(0), NY)
    const { container } = renderAt(0, unknown, true)
    expect(container.querySelector('.narrative-text')!.textContent).toBe('On duty')
    expect(container.querySelector('.countdown')).toBeNull()
    expect(screen.getByText('Demo — sample pilot')).toBeTruthy()
    error.mockRestore()
  })
})

describe('StatusScreen pieces', () => {
  const home = () => makeSnapshot(e.schedule, e.legs, at(-1440), NY)
  const away = () => makeSnapshot(e.schedule, e.legs, at(100), NY)

  it('shows the been-home pill only after a full day at home', () => {
    const { container, rerender } = renderAt(-1440, { ...home(), daysHome: 0 })
    expect(container.querySelector('.pill')).toBeNull()
    rerender(screenAt(-1440, { ...home(), daysHome: 1 }))
    expect(screen.getByText("Alex's been home for 1 day")).toBeTruthy()
  })

  it('tells a commuter with nothing logged where the trip leaves from', () => {
    const snap = { ...home(), leave: { ...home().leave!, commuterUnlogged: true, airport: 'ATL' } }
    const { container } = renderAt(-1440, snap)
    expect(container.querySelector('.countdown-sub')!.textContent).toBe('Trip departs Atlanta Friday October 9th at 4:00am')
  })

  it('falls back to the ~N days card when no arrival can be worked out, and to nothing without a fallback', () => {
    const { container, rerender } = renderAt(100, { ...away(), arrival: null, fallbackDaysRemaining: 2 })
    expect(screen.getByRole('heading', { level: 2, name: 'Back Home In' })).toBeTruthy()
    expect(container.querySelector('.countdown-value')!.textContent).toBe('~2 days')
    rerender(screenAt(100, { ...away(), arrival: null, fallbackDaysRemaining: null }))
    expect(container.querySelector('.countdown')).toBeNull()
  })

  it('asks after "your pilot" when the pilot has no name', () => {
    renderAt(100, { ...away(), hasName: false })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's your pilot?")
  })

  it('shows the demo banner only in demo mode', () => {
    const { container, rerender } = renderAt(100)
    expect(container.querySelector('.demo-banner')).toBeNull()
    rerender(screenAt(100, undefined, true))
    expect(container.querySelector('.demo-banner')).not.toBeNull()
  })
})

describe('StatusScreen celebration', () => {
  const lastLeg = () => makeSnapshot(e.schedule, e.legs, at(1700), NY)

  it('celebrates on the arrival card in the last 24 hours away', async () => {
    const frames = stubAnimationFrames()
    expect(lastLeg().celebrate).toBe(true)
    const { container } = renderAt(1700, lastLeg())
    await frames.frame(0)
    expect(container.querySelector('.countdown .celebration svg')).not.toBeNull()
  })

  it('stays quiet earlier in the trip', async () => {
    const frames = stubAnimationFrames()
    const { container } = renderAt(100)
    await frames.frame(0)
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.celebration')).toBeNull()
  })

  it('replays when the celebrate key changes', async () => {
    const frames = stubAnimationFrames()
    const snap = lastLeg()
    const { container, rerender } = render(screenAt(1700, snap, false, 0))
    await frames.frame(0)
    await frames.frame(2400)
    expect(container.querySelector('.celebration')).toBeNull()
    rerender(screenAt(1700, snap, false, 1))
    await frames.frame(9000)
    expect(container.querySelector('.countdown .celebration svg')).not.toBeNull()
  })
})

describe('EmptyState', () => {
  it('explains how to get data into CrewLu Cloud', () => {
    render(<EmptyState />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('No schedule in CrewLu Cloud yet')
    expect(screen.getByText('Ask your pilot to turn on CrewLu Cloud in the Crewlu app and sync once, then refresh this page.')).toBeTruthy()
  })
})

describe('StatusScreen trip cards (slice 2A)', () => {
  /** The screen at `minutes` with its own viewer zone, pilot home zone and clock style. */
  const screenWith = (minutes: number, opts: { viewerTz?: string; homeTz?: string; h24?: boolean }) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={opts.viewerTz ?? NY} homeTz={opts.homeTz ?? NY}
        h24={opts.h24 ?? false} airports={testAirports} weather={null} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }

  it('dates the departure in the pilot’s home zone, not the viewer’s', () => {
    render(screenWith(-1440, { viewerTz: 'America/Los_Angeles', homeTz: NY }))
    expect(screen.getByText('Departs tomorrow at 6:30am')).toBeTruthy()
  })

  it('passes the 24-hour choice through to the upcoming trip card', () => {
    render(screenWith(-1440, { h24: true }))
    expect(screen.getByText('Departs tomorrow at 06:30')).toBeTruthy()
  })

  it('away: the Day N card sits after the Back Home In card, before the footer', () => {
    const { container } = render(screenWith(100, {}))
    const back = screen.getByRole('heading', { level: 2, name: 'Back Home In' })
    const day = screen.getByRole('heading', { level: 2, name: 'Day 1 of 2' })
    expect(back.compareDocumentPosition(day) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(day.compareDocumentPosition(container.querySelector('.footer')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('home: the upcoming trip card sits after the been-home pill, before the footer', () => {
    const { container } = renderAt(-1440)
    const card = container.querySelector('.trip-card')!
    expect(screen.getByText('Departs tomorrow at 6:30am')).toBeTruthy()
    expect(container.querySelector('.pill')!.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(card.compareDocumentPosition(container.querySelector('.footer')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/^Day \d+ of \d+$/)).toBeNull()
  })

  it('away: Day N of M with the cities ahead, and no upcoming trip card', () => {
    const { container } = renderAt(100)
    expect(screen.getByRole('heading', { level: 2, name: 'Day 1 of 2' })).toBeTruthy()
    expect([...container.querySelectorAll('.city-name')].map((n) => n.textContent)).toEqual(['Anchorage', 'Louisville'])
    expect(screen.queryByText('Line Trip')).toBeNull()
  })

  it('base: the countdown and the upcoming trip together', () => {
    const { container } = renderAt(30)
    expect(container.querySelector('.countdown')).not.toBeNull()
    expect(screen.getByText('Line Trip')).toBeTruthy()
  })

  it('shows neither card when the snapshot has none', () => {
    const { container } = renderAt(1950)
    expect(container.querySelector('.trip-card')).toBeNull()
  })
})

describe('StatusScreen location card (slice 2B1)', () => {
  const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
  const withWeather = (minutes: number, weather: Weather | null) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports}
        weather={weather} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }

  it('sits after the countdown and the been-home pill, and before the trip card', () => {
    const { container } = renderAt(-1440)
    const location = container.querySelector('.location')!
    expect(container.querySelector('.countdown')!.compareDocumentPosition(location) & FOLLOWING).toBeTruthy()
    expect(container.querySelector('.pill')!.compareDocumentPosition(location) & FOLLOWING).toBeTruthy()
    expect(location.compareDocumentPosition(container.querySelector('.trip-card')!) & FOLLOWING).toBeTruthy()
  })

  it('shows where the pilot is, with the weather it is given', () => {
    const { container } = render(withWeather(180, { temperature: 61, code: 3, isDay: true }))
    expect(screen.getByRole('heading', { level: 2, name: 'Rockford' })).toBeTruthy()
    expect(container.querySelector('.weather-temp')!.textContent).toBe('61°')
  })

  it('is hidden while the pilot is flying', () => {
    const { container } = renderAt(100)
    expect(container.querySelector('.location')).toBeNull()
  })

  /** The turn at Rockford (Chicago time), seen by a visitor in Los Angeles whose family is at home in New York. */
  const fromLosAngeles = (h24: boolean) => {
    const now = at(180)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz="America/Los_Angeles" homeTz={NY} h24={h24}
        airports={testAirports} weather={null} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }

  it('measures the time difference from home, not from wherever the visitor is', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(fromLosAngeles(false))
    expect(container.querySelector('.time-diff .sr-only')!.textContent).toBe('1 hour behind you')
  })

  it('writes the card’s clock in 24-hour time for visitors who use it', () => {
    const { container } = render(fromLosAngeles(true))
    expect(container.querySelector('.time-value')!.textContent).toMatch(/^\d{2}:\d{2}$/)
  })

  it('reads "Unknown Location" when the engine can’t tell where the pilot is', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unknown = safeSnapshot(e.schedule, null as unknown as Leg[], at(0), NY)
    renderAt(0, unknown)
    expect(screen.getByRole('heading', { level: 2, name: 'Unknown Location' })).toBeTruthy()
    error.mockRestore()
  })
})

describe('StatusScreen sun popup (slice 2B2)', () => {
  const rockford: Weather = { temperature: 61, code: 3, isDay: true }
  const turnAt = (minutes = 180) => {
    const now = at(minutes)
    return (
      <StatusScreen snap={makeSnapshot(e.schedule, e.legs, now, NY)} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports}
        weather={rockford} demo={false} celebrateKey={0} footer={footer(now)} />
    )
  }
  const openDial = () => fireEvent.click(screen.getByRole('button', { name: /\. Opens sun details\.$/ }))

  it('opens from the location card’s dial, after <main>, and hides the page behind it', () => {
    const { container } = render(turnAt())
    const main = container.querySelector('main')!
    expect(screen.queryByRole('dialog')).toBeNull()
    openDial()
    const dialog = screen.getByRole('dialog', { name: 'Rockford' })
    expect(main.contains(dialog)).toBe(false)
    expect(main.compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.getAttribute('aria-hidden')).toBe('true')
    expect(main.hasAttribute('inert')).toBe(true)
  })

  it('counts down to the snapshot’s next flight on the big dial', () => {
    render(turnAt())
    openDial()
    expect(screen.getByRole('img', { name: /Next departure .+, in .+\.$/ })).toBeTruthy()
  })

  it('shows the page again once the popup has closed', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(turnAt())
    openDial()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const main = container.querySelector('main')!
    expect(main.getAttribute('aria-hidden')).toBeNull()
    expect(main.hasAttribute('inert')).toBe(false)
  })

  it('closes by itself when the dial goes away at takeoff, and stays closed when it comes back', () => {
    const { rerender } = render(turnAt())
    openDial()
    expect(screen.getByRole('dialog')).toBeTruthy()
    rerender(turnAt(100))
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(turnAt())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('the location card in each demo scene', () => {
  const NOW = Date.UTC(2026, 9, 20, 16, 0)
  const CITY: Record<DemoScene, string | null> = {
    home: 'Lexington',
    'driving-to-work': 'Lexington',
    base: 'Louisville',
    flying: null,
    turn: 'Rockford',
    layover: 'Miami',
    delayed: 'Anchorage',
    'last-leg': null,
    'driving-home': 'Louisville',
    'commuting-home': 'Louisville',
    reserve: 'Louisville',
    training: 'Louisville',
  }

  it.each(Object.keys(DEMO_SCENES) as DemoScene[])('%s', (scene) => {
    const schedule = buildSchedule(demoRawForScene(scene, NOW), NOW)
    const snap = makeSnapshot(schedule, buildLegs(schedule), NOW, NY)
    const { container } = render(
      <StatusScreen snap={snap} now={NOW} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} weather={null} demo celebrateKey={0}
        footer={footer(NOW)} />,
    )
    expect(container.querySelector('.location-city')?.textContent ?? null).toBe(CITY[scene])
  })
})
