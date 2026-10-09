// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRawForScene } from '../../src/data/demo'
import { RawBuilder } from '../../src/data/rowBuilder'
import type { RawSchedule } from '../../src/data/rows'
import type { ScheduleHandle } from '../../src/ui/hooks/useSchedule'
import { ScheduleScreen } from '../../src/ui/ScheduleScreen'
import { testAirports } from '../fixtures/airports'

const NOW = Date.UTC(2026, 9, 20, 16)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const handle = (raw: RawSchedule | null): ScheduleHandle => ({ raw, lastSuccessAt: NOW, problem: null, refreshing: false, refresh: () => {} })

describe('ScheduleScreen', () => {
  it('renders the demo pilot on the late last leg', () => {
    render(<ScheduleScreen schedule={handle(demoRawForScene('last-leg', NOW))} airports={testAirports} demo onSignOut={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(screen.getByText('Demo — sample pilot')).toBeTruthy()
    expect(screen.getByText(/was delayed in/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
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
