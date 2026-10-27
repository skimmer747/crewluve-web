// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Footer, freshnessColor, type FooterProps } from '../../src/ui/Footer'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

const NOW = Date.UTC(2026, 9, 9, 12) // 8:00am EDT
const props = (extra: Partial<FooterProps> = {}): FooterProps => ({
  now: NOW,
  lastSuccessAt: NOW - 42_000,
  newestUpdatedAt: NOW - (3 * 3600 + 5 * 60) * 1000,
  problem: null,
  refreshing: false,
  onRefresh: () => {},
  onLeave: () => {},
  leaveLabel: 'Disconnect',
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

  it('wires the Disconnect and refresh buttons', () => {
    const onLeave = vi.fn()
    const onRefresh = vi.fn()
    const { rerender } = render(<Footer {...props({ onLeave, onRefresh })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    rerender(<Footer {...props({ refreshing: true, leaveLabel: 'Exit demo' })} />)
    expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Exit demo' })).toBeTruthy()
  })
})

describe('Footer rows', () => {
  const row = (container: Element, index: number) => container.querySelectorAll('.sync-row')[index]

  it.each([[42_000, 'var(--green)'], [180_000, 'var(--blue)'], [420_000, 'var(--orange)'], [900_000, 'var(--red)']])(
    'draws a cloud for the checked row, %i ms old, in %s', (age, color) => {
      const { container } = render(<Footer {...props({ lastSuccessAt: NOW - age })} />)
      const icon = row(container, 0).querySelector('svg')!
      expect(iconNameOf(icon)).toBe('Cloud')
      expect(icon.style.color).toBe(color)
    },
  )

  it('keeps the schedule-updated row neutral, however old the schedule is', () => {
    const { container } = render(<Footer {...props({ newestUpdatedAt: NOW - 3 * 86_400_000 })} />)
    const icon = row(container, 1).querySelector('svg')!
    expect(iconNameOf(icon)).toBe('ArrowCircleUp')
    expect(icon.style.color).toBe('var(--text-2)')
  })

  it('shows only the row it has a time for', () => {
    const { container, rerender } = render(<Footer {...props({ lastSuccessAt: null })} />)
    expect(container.querySelectorAll('.sync-row')).toHaveLength(1)
    expect(screen.queryByText(/Checked/)).toBeNull()
    expect(screen.getByText('Schedule updated 3h 05m ago')).toBeTruthy()
    rerender(<Footer {...props({ newestUpdatedAt: null })} />)
    expect(container.querySelectorAll('.sync-row')).toHaveLength(1)
    expect(screen.getByText('Checked 42s ago')).toBeTruthy()
    expect(screen.queryByText(/Schedule updated/)).toBeNull()
  })

  it('shows no rows before the first fetch', () => {
    const { container } = render(<Footer {...props({ lastSuccessAt: null, newestUpdatedAt: null })} />)
    expect(container.querySelectorAll('.sync-row')).toHaveLength(0)
    expect(screen.queryByText(/Checked/)).toBeNull()
  })

  it.each([['offline'], ['unreachable']] as const)('warns with an orange triangle when %s', (kind) => {
    const { container } = render(<Footer {...props({ problem: { kind } })} />)
    const icon = container.querySelector<SVGElement>('.sync-problem svg')!
    expect(iconNameOf(icon)).toBe('Warning')
    expect(icon.style.color).toBe('var(--orange)')
  })

  it('says plain "Offline" when nothing has been fetched yet', () => {
    render(<Footer {...props({ problem: { kind: 'offline' }, lastSuccessAt: null })} />)
    expect(screen.getByText('Offline')).toBeTruthy()
  })
})

describe('Footer, offline with a schedule saved on another day', () => {
  const offline = (extra: Partial<FooterProps>) => props({ problem: { kind: 'offline' }, ...extra })
  const yesterday = Date.UTC(2026, 9, 8, 11, 59) // Thu 8 Oct, 7:59am EDT: NOW is Fri 9 Oct, 8:00am

  it('names the day, so "7:59am" cannot be taken for this morning', () => {
    render(<Footer {...offline({ lastSuccessAt: yesterday })} />)
    expect(screen.getByText('Offline — showing the schedule from Thu 7:59am')).toBeTruthy()
  })

  it('keeps the 24-hour clock', () => {
    const { rerender } = render(<Footer {...offline({ lastSuccessAt: yesterday, h24: true })} />)
    expect(screen.getByText('Offline — showing the schedule from Thu 07:59')).toBeTruthy()
    rerender(<Footer {...offline({ h24: true })} />)
    expect(screen.getByText('Offline — showing the schedule from 07:59')).toBeTruthy()
  })

  it('gives the date once the schedule is a week old', () => {
    render(<Footer {...offline({ lastSuccessAt: Date.UTC(2026, 9, 2, 11, 59) })} />)
    expect(screen.getByText('Offline — showing the schedule from Oct 2, 7:59am')).toBeTruthy()
  })

  it('counts today in the viewer’s zone', () => {
    // 03:30Z on Fri 9 Oct is still Thursday evening in New York.
    render(<Footer {...offline({ lastSuccessAt: Date.UTC(2026, 9, 9, 3, 30) })} />)
    expect(screen.getByText('Offline — showing the schedule from Thu 11:30pm')).toBeTruthy()
  })
})

describe('freshnessColor', () => {
  it.each([[0, 'var(--green)'], [119_999, 'var(--green)'], [120_000, 'var(--blue)'], [300_000, 'var(--orange)'], [600_000, 'var(--red)']])(
    '%i ms → %s', (age, color) => expect(freshnessColor(age)).toBe(color),
  )
})
