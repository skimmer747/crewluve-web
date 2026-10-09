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
import { stubAnimationFrames } from '../fixtures/ui'

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
    <StatusScreen snap={snap} now={now} viewerTz={NY} homeTz={NY} h24={false} airports={testAirports} demo={demo} celebrateKey={celebrateKey} footer={footer(now)} />
  )
}

function renderAt(minutes: number, snap?: Snapshot, demo = false) {
  return render(screenAt(minutes, snap, demo))
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
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
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
