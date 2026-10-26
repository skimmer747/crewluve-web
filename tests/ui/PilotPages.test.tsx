// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRawForScene, type DemoScene } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import { tempUnitFor, type WeatherLoader } from '../../src/data/weather'
import { buildLegs } from '../../src/engine/legs'
import { buildSchedule } from '../../src/engine/normalize'
import type { Schedule } from '../../src/engine/types'
import { WEATHER_REFRESH_MS } from '../../src/ui/hooks/useWeather'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { PilotPages } from '../../src/ui/PilotPages'
import { scheduleLegs } from '../../src/ui/scheduleFacts'
import { testAirports } from '../fixtures/airports'
import { setWindowSize, stubAnimationFrames } from '../fixtures/ui'

const NOW = Date.UTC(2026, 9, 20, 16)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
  // A phone's window, for the one-column pages, unless a test makes it wider (slice 3C §3).
  setWindowSize(402, 874)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** What useSchedule hands the pages: the schedule built from these rows, as the demo builds it. */
const handle = (raw: RawSchedule | null): ScheduleHandle => ({
  schedule: raw && buildSchedule(raw, NOW), lastSuccessAt: NOW, problem: null, refreshing: false, refresh: () => {},
})

describe('PilotPages', () => {
  it('renders the demo pilot on the late last leg', () => {
    render(<PilotPages schedule={handle(demoRawForScene('last-leg', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(screen.getByText('Demo — sample pilot')).toBeTruthy()
    expect(screen.getByText(/was delayed in/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Back Home In' })).toBeTruthy()
    expect(screen.getByText('Checked just now')).toBeTruthy()
  })

  it("shows the waiting state before the pilot's first update", () => {
    render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })

  it('shows just the title and footer before the first schedule arrives', () => {
    render(<PilotPages schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.queryByText("Waiting for your pilot's first update…")).toBeNull()
  })
})

describe('PilotPages details', () => {
  it('labels the footer button "Exit demo" in the demo and "Disconnect" when live', () => {
    const { unmount } = render(<PilotPages schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('button', { name: 'Exit demo' })).toBeTruthy()
    unmount()
    render(<PilotPages schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy()
  })

  it("shows the homecoming in the pilot's home time zone, not the base's", () => {
    // Base SDF (Eastern), home ONT (Pacific). The flight home lands at 20:00 UTC: 1:00 PM at home, 4:00 PM at base.
    const raw = new RawBuilder(NOW)
      .pilot('Pat', 'SDF', 'ONT')
      .trip('t1', {
        dutyPeriods: [
          { start: -1500, end: -1200, flights: [{ dep: 'ONT', arr: 'SDF', out: -1440, in: -1260 }] },
          { start: -120, end: 300, flights: [{ dep: 'SDF', arr: 'ONT', out: -60, in: 240 }] },
        ],
      })
      .build()
    render(<PilotPages schedule={handle(raw)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    // Testing Library normalizes whitespace, so the narrow space before PM reads as a plain space here.
    expect(screen.getByText(/(1:00 PM|13:00) · Ontario/)).toBeTruthy()
  })

  it('falls back to the title and footer when the schedule cannot be read', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unreadable = { ...buildSchedule(new RawBuilder(NOW).build(), NOW), trips: null } as unknown as Schedule
    render(<PilotPages schedule={{ ...handle(null), schedule: unreadable }} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('replays the celebration when the visitor comes back to the page', async () => {
    const frames = stubAnimationFrames()
    render(<PilotPages schedule={handle(demoRawForScene('last-leg', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    await frames.frame(1000)
    await frames.frame(1000 + 2400)
    expect(frames.pending).toBe(0)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(frames.pending).toBe(1)
  })
})

describe('PilotPages location card (slice 2B1)', () => {
  it('asks for the weather where the pilot is, and shows it', async () => {
    const load = vi.fn<WeatherLoader>(async () => ({ temperature: 41, code: 3, isDay: true }))
    render(<PilotPages schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} loadWeather={load} />)
    expect(await screen.findByText('41°')).toBeTruthy()
    expect(load).toHaveBeenCalledWith({ code: 'ANC', lat: 61.1744, lng: -149.9983, tz: 'America/Anchorage', unit: tempUnitFor() })
  })

  it('stops asking for weather once the schedule empties, since the hook still runs on the empty screen', async () => {
    const load = vi.fn<WeatherLoader>(async () => ({ temperature: 41, code: 3, isDay: true }))
    const screenFor = (raw: RawSchedule) => (
      <PilotPages schedule={handle(raw)} airports={testAirports} demo={false} onSignOut={() => {}} loadWeather={load} />
    )
    const { rerender } = render(screenFor(demoRawForScene('delayed', NOW)))
    expect(await screen.findByText('41°')).toBeTruthy()
    rerender(screenFor(new RawBuilder(NOW).build()))
    await act(async () => {
      vi.advanceTimersByTime(WEATHER_REFRESH_MS)
    })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('asks for no weather while the pilot is flying', async () => {
    const load = vi.fn<WeatherLoader>(async () => null)
    const { container } = render(
      <PilotPages schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} loadWeather={load} />,
    )
    await act(async () => {})
    expect(load).not.toHaveBeenCalled()
    expect(container.querySelector('.location')).toBeNull()
  })

  it('shows the demo’s made-up weather without touching the network', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<PilotPages schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(await screen.findByText('Cloudy')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks Open-Meteo when live', async () => {
    const fetch = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ current: { temperature_2m: 41, weather_code: 3, is_day: 1 } }) }))
    vi.stubGlobal('fetch', fetch)
    render(<PilotPages schedule={handle(demoRawForScene('delayed', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(await screen.findByText('41°')).toBeTruthy()
    expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=61\.17&longitude=-150\.00&/)
  })
})

describe('PilotPages: the status page and the Schedule page (slice 3A §3.3)', () => {
  /** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
  beforeEach(() => history.replaceState(null, '', '/'))
  afterEach(() => history.replaceState(null, '', '/'))

  it('opens the schedule from a card, and its back button brings the status page back', async () => {
    render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    fireEvent.click(screen.getAllByRole('link', { name: 'Schedule' })[0])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Schedule')
    expect(location.hash).toBe('#schedule')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await settle()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(location.hash).toBe('')
  })

  it('opens straight at the schedule from its address, listing every leg but the report time', () => {
    history.replaceState(null, '', '/#schedule')
    const raw = demoRawForScene('home', NOW)
    const { container } = render(<PilotPages schedule={handle(raw)} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Schedule')
    const all = buildLegs(buildSchedule(raw, NOW))
    expect(all.some((l) => l.kind === 'report')).toBe(true)
    expect(container.querySelectorAll('.leg').length).toBe(scheduleLegs(all).length)
  })

  it('lists the times in the visitor’s own zone and clock, not the pilot’s home zone', () => {
    const real = Intl.DateTimeFormat.prototype.resolvedOptions
    const resolved = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...real.call(this), timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour12: false }
    })
    try {
      history.replaceState(null, '', '/#schedule')
      const { container } = render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
      expect(container.querySelector('.leg-times')!.textContent).toMatch(/^\d\d:\d\d pdt – \d\d:\d\d pdt$/)
    } finally {
      resolved.mockRestore()
    }
  })

  it('shows the screens it always has at the schedule’s address while there’s nothing to list', () => {
    history.replaceState(null, '', '/#schedule')
    render(<PilotPages schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    cleanup()
    render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })
})

describe('PilotPages side by side (slice 3C)', () => {
  /** Lets the browser's history events arrive: happy-dom sends popstate a moment after history.back(). */
  const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))
  const pages = (scene: DemoScene = 'flying') => (
    <PilotPages schedule={handle(demoRawForScene(scene, NOW))} airports={testAirports} demo onSignOut={() => {}} />
  )
  const layout = (container: Element) => container.querySelector('main')!.className
  beforeEach(() => {
    history.replaceState(null, '', '/')
    setWindowSize(1180, 820)
  })
  afterEach(() => history.replaceState(null, '', '/'))

  it('shows the status and the schedule side by side on a wide window, under one bar with the title (§4)', () => {
    const raw = demoRawForScene('flying', NOW)
    const { container } = render(<PilotPages schedule={handle(raw)} airports={testAirports} demo onSignOut={() => {}} />)
    expect(layout(container)).toBe('split')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(screen.getByRole('region', { name: 'Status' }).querySelector('.countdown')).not.toBeNull()
    const schedule = screen.getByRole('region', { name: 'Schedule' })
    expect(schedule.querySelector('.calendar-title')!.textContent).toBe('October 2026')
    const legs = within(schedule).getByRole('region', { name: 'Legs' }).querySelectorAll('.leg')
    expect(legs.length).toBe(scheduleLegs(buildLegs(buildSchedule(raw, NOW))).length)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    // Nothing takes focus as it opens, as on the status page (§5.4).
    expect(document.activeElement).toBe(document.body)
  })

  it('has no way into the schedule beside it: no chevrons, and no View Schedule, at home or away (§4.3)', () => {
    for (const scene of ['home', 'nothing-ahead', 'flying'] as const) {
      const { container, unmount } = render(pages(scene))
      expect(container.querySelector('[data-schedule-link]')).toBeNull()
      unmount()
    }
  })

  it('shows the same at the schedule’s own address (§5.1)', () => {
    history.replaceState(null, '', '/#schedule')
    const { container } = render(pages())
    expect(layout(container)).toBe('split')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
  })

  it('changes nothing on screen as Back and Forward move between the two addresses (§5.1)', async () => {
    const { container } = render(pages())
    const main = container.querySelector('main')!
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    location.hash = '#schedule'
    await settle()
    history.back()
    await settle()
    history.forward()
    await settle()
    expect(container.querySelector('main')).toBe(main)
    expect(layout(container)).toBe('split')
    // The schedule beside the status kept its month: nothing was rebuilt.
    expect(container.querySelector('.calendar-title')!.textContent).toBe('November 2026')
    expect(document.activeElement).toBe(document.body)
  })

  it('switches layouts as the window crosses the line, opening the schedule again at this month each time (§5.2)', () => {
    // From the narrow side: happy-dom reports a media query's first change only from not matching.
    setWindowSize(402, 874)
    const { container } = render(pages())
    expect(layout(container)).toBe('screen')
    act(() => setWindowSize(1180, 820))
    expect(layout(container)).toBe('split')
    const selected = () => container.querySelector('[role="gridcell"][aria-selected="true"] button')
    fireEvent.click(screen.getByRole('button', { name: 'Thursday, October 22' }))
    expect(selected()!.getAttribute('aria-label')).toBe('Thursday, October 22')
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(container.querySelector('.calendar-title')!.textContent).toBe('November 2026')
    act(() => setWindowSize(402, 874))
    expect(layout(container)).toBe('screen')
    expect(container.querySelector('.calendar')).toBeNull()
    act(() => setWindowSize(1180, 820))
    expect(container.querySelector('.calendar-title')!.textContent).toBe('October 2026')
    expect(selected()!.getAttribute('aria-current')).toBe('date')
  })

  it('closes a popup as the window crosses the line, since the status page is rebuilt too (§5.2, §5.3)', () => {
    // From the narrow side: happy-dom reports a media query's first change only from not matching.
    setWindowSize(402, 874)
    const { container } = render(pages())
    const openTracking = () => fireEvent.click(screen.getByRole('button', { name: 'UPS2961. Opens flight tracking.' }))
    openTracking()
    expect(screen.getByRole('dialog', { name: 'UPS2961' })).toBeTruthy()
    act(() => setWindowSize(1180, 820))
    expect(layout(container)).toBe('split')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('main')!.hasAttribute('inert')).toBe(false)
    openTracking()
    act(() => setWindowSize(402, 874))
    expect(layout(container)).toBe('screen')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('main')!.hasAttribute('inert')).toBe(false)
  })

  it('opens the Schedule page, with focus on its title, as the window narrows at the schedule’s address (§5.2)', () => {
    history.replaceState(null, '', '/#schedule')
    setWindowSize(402, 874)
    render(pages())
    act(() => setWindowSize(1180, 820))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    act(() => setWindowSize(402, 874))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Schedule' }))
  })

  it('keeps the screens it always has while there’s nothing to show (§2)', () => {
    render(<PilotPages schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    cleanup()
    const { container } = render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
    expect(layout(container)).toBe('screen')
  })
})

describe('PilotPages: the notice and the quick status (piece 5a)', () => {
  it('shows the notice with the status, and before the first update', () => {
    const { unmount } = render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo={false} onSignOut={() => {}}
      notice="Connected on this browser. Add it to your Home Screen to keep it handy." />)
    expect(screen.getByRole('status').textContent).toBe('Connected on this browser. Add it to your Home Screen to keep it handy.')
    unmount()
    render(<PilotPages schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} notice="Couldn't connect. Check your connection and try again." />)
    expect(screen.getByRole('status').textContent).toBe("Couldn't connect. Check your connection and try again.")
    expect(screen.getByText("Waiting for your pilot's first update…")).toBeTruthy()
  })

  it('asks for the quick status at the moment shown, and puts it on the location card', () => {
    const quickStatusAt = vi.fn((now: number) => (now === NOW ? { text: 'Free to Talk', icon: 'bubble.left.fill', expiresAt: null } : null))
    const { container } = render(<PilotPages schedule={handle(demoRawForScene('home', NOW))} airports={testAirports} demo={false} onSignOut={() => {}}
      quickStatusAt={quickStatusAt} />)
    expect(quickStatusAt).toHaveBeenCalledWith(NOW)
    expect(container.querySelector('.location .quick-status')?.textContent).toBe('Quick status: Free to Talk')
  })
})
