// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoRaw } from '../../src/data/demo'
import type { Leg } from '../../src/engine/legs'
import { makeSnapshot, safeSnapshot, type Snapshot } from '../../src/engine/snapshot'
import { EmptyState } from '../../src/ui/EmptyState'
import type { FooterProps } from '../../src/ui/Footer'
import { StatusScreen } from '../../src/ui/StatusScreen'
import { testAirports } from '../fixtures/airports'
import { A, at, engineFor } from '../fixtures/engine'

afterEach(cleanup)

const NY = 'America/New_York'
const e = engineFor(demoRaw('driver', A))
const footer = (now: number): FooterProps => ({
  now, lastSuccessAt: now, newestUpdatedAt: now - 3_600_000, problem: null, refreshing: false,
  onRefresh: () => {}, onSignOut: () => {}, signOutLabel: 'Sign out', viewerTz: NY, h24: false,
})

function renderAt(minutes: number, snap: Snapshot = makeSnapshot(e.schedule, e.legs, at(minutes), NY), demo = false) {
  const now = at(minutes)
  return render(
    <StatusScreen snap={snap} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} demo={demo} celebrateKey={0} footer={footer(now)} />,
  )
}

describe('StatusScreen', () => {
  it('away: title, sentence, and the Back Home In card with date and city', () => {
    const { container } = renderAt(100)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
    expect(container.querySelector('.narrative-text')!.textContent).toBe(
      'Alex is flying to Rockford on UPS flight 2961 from Louisville — landing in 50m which is 8:00am EDT.',
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
    expect(container.querySelector('.countdown-value')!.textContent).toBe('1d  07h  40m')
    expect(container.querySelector('.countdown-sub')!.textContent).toBe('Sat, Oct 10 at 2:50\u202FPM · Lexington')
  })

  it('home: Leaves Home In with its departure line, then the been-home pill', () => {
    const { container } = renderAt(-1440)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Leaves Home In')
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

describe('EmptyState', () => {
  it('explains how to get data into CrewLu Cloud', () => {
    render(<EmptyState />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('No schedule in CrewLu Cloud yet')
    expect(screen.getByText('Ask your pilot to turn on CrewLu Cloud in the Crewlu app and sync once, then refresh this page.')).toBeTruthy()
  })
})
