// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRawForScene } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { ScheduleScreen } from '../../src/ui/ScheduleScreen'
import { testAirports } from '../fixtures/airports'
import { stubAnimationFrames } from '../fixtures/ui'

const NOW = Date.UTC(2026, 9, 20, 16)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const handle = (raw: RawSchedule | null): ScheduleHandle => ({ raw, lastSuccessAt: NOW, problem: null, refreshing: false, refresh: () => {} })

describe('ScheduleScreen', () => {
  it('renders the demo pilot on the late last leg', () => {
    render(<ScheduleScreen schedule={handle(demoRawForScene('last-leg', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(screen.getByText('Demo — sample pilot')).toBeTruthy()
    expect(screen.getByText(/was delayed in/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Back Home In' })).toBeTruthy()
    expect(screen.getByText('Checked just now')).toBeTruthy()
  })

  it('shows the empty state for an account with nothing in CrewLu Cloud', () => {
    render(<ScheduleScreen schedule={handle(new RawBuilder(NOW).build())} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.getByText('No schedule in CrewLu Cloud yet')).toBeTruthy()
  })

  it('shows just the title and footer before the first schedule arrives', () => {
    render(<ScheduleScreen schedule={handle(null)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.queryByText('No schedule in CrewLu Cloud yet')).toBeNull()
  })
})

describe('ScheduleScreen details', () => {
  it('labels the footer button "Exit demo" in the demo and "Sign out" when live', () => {
    const { unmount } = render(<ScheduleScreen schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('button', { name: 'Exit demo' })).toBeTruthy()
    unmount()
    render(<ScheduleScreen schedule={handle(demoRawForScene('flying', NOW))} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
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
    render(<ScheduleScreen schedule={handle(raw)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    // Testing Library normalizes whitespace, so the narrow space before PM reads as a plain space here.
    expect(screen.getByText(/(1:00 PM|13:00) · Ontario/)).toBeTruthy()
  })

  it('falls back to the title and footer when the rows cannot be read', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unreadable = { ...new RawBuilder(NOW).build(), trips: null } as unknown as RawSchedule
    render(<ScheduleScreen schedule={handle(unreadable)} airports={testAirports} demo={false} onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('CrewLuve')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('replays the celebration when the visitor comes back to the page', async () => {
    const frames = stubAnimationFrames()
    render(<ScheduleScreen schedule={handle(demoRawForScene('last-leg', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    await frames.frame(1000)
    await frames.frame(1000 + 2400)
    expect(frames.pending).toBe(0)
    await act(async () => {
      fireEvent(document, new Event('visibilitychange'))
    })
    expect(frames.pending).toBe(1)
  })
})
