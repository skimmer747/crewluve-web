// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Footer, freshnessColor, type FooterProps } from '../../src/ui/Footer'

afterEach(cleanup)

const NOW = Date.UTC(2026, 9, 9, 12) // 8:00am EDT
const props = (extra: Partial<FooterProps> = {}): FooterProps => ({
  now: NOW,
  lastSuccessAt: NOW - 42_000,
  newestUpdatedAt: NOW - (3 * 3600 + 5 * 60) * 1000,
  problem: null,
  refreshing: false,
  onRefresh: () => {},
  onSignOut: () => {},
  signOutLabel: 'Sign out',
  viewerTz: 'America/New_York',
  h24: false,
  ...extra,
})

describe('Footer', () => {
  it('shows when the site checked and when the schedule last changed', () => {
    render(<Footer {...props()} />)
    expect(screen.getByText('Checked 42s ago')).toBeTruthy()
    expect(screen.getByText('Schedule updated 3h 05m ago')).toBeTruthy()
  })

  it('swaps the rows for a warning when offline or unreachable', () => {
    const { rerender } = render(<Footer {...props({ problem: { kind: 'offline' } })} />)
    expect(screen.getByText('Offline — showing the schedule from 7:59am')).toBeTruthy()
    rerender(<Footer {...props({ problem: { kind: 'unreachable' } })} />)
    expect(screen.getByText("Couldn't reach CrewLu Cloud — will retry")).toBeTruthy()
    expect(screen.queryByText(/Checked/)).toBeNull()
  })

  it('wires the sign-out and refresh buttons', () => {
    const onSignOut = vi.fn()
    const onRefresh = vi.fn()
    const { rerender } = render(<Footer {...props({ onSignOut, onRefresh })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    rerender(<Footer {...props({ refreshing: true, signOutLabel: 'Exit demo' })} />)
    expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Exit demo' })).toBeTruthy()
  })
})

describe('freshnessColor', () => {
  it.each([[0, 'var(--green)'], [119_999, 'var(--green)'], [120_000, 'var(--blue)'], [300_000, 'var(--orange)'], [600_000, 'var(--red)']])(
    '%i ms → %s', (age, color) => expect(freshnessColor(age)).toBe(color),
  )
})
