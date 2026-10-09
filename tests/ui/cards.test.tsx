// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { CountdownCard } from '../../src/ui/CountdownCard'
import { DaysHomePill } from '../../src/ui/DaysHomePill'
import { FallbackCard, fallbackText } from '../../src/ui/FallbackCard'

afterEach(cleanup)

const NOW = Date.UTC(2026, 9, 9, 12)
const MIN = 60_000

describe('CountdownCard', () => {
  it('shows the title, padded numbers with small units, and the subtitle', () => {
    const { container } = render(
      <CountdownCard title="Back Home In" icon="House" color="green" target={NOW + (11 * 1440 + 8 * 60 + 39) * MIN} now={NOW}
        subtitle="Sun, Oct 19 at 5:57 PM · Lexington" />,
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
    expect(container.querySelector('.countdown-value')!.textContent).toBe('11d  08h  39m')
    expect(container.querySelector('.num')!.getAttribute('style')).toContain('var(--green)')
    expect(container.querySelector('.countdown-sub')!.textContent).toBe('Sun, Oct 19 at 5:57 PM · Lexington')
  })

  it('switches to minutes and seconds in the last hour, and says Now! at zero', () => {
    const { container, rerender } = render(
      <CountdownCard title="Back Home In" icon="House" color="red" target={NOW + 25 * MIN} now={NOW} subtitle={null} />,
    )
    expect(container.querySelector('.countdown-value')!.textContent).toBe('25m  00s')
    rerender(<CountdownCard title="Back Home In" icon="House" color="red" target={NOW} now={NOW} subtitle={null} />)
    expect(container.querySelector('.countdown-value')!.textContent).toBe('Now!')
    expect(container.querySelector('.countdown-sub')).toBeNull()
  })
})

describe('FallbackCard', () => {
  it.each([[0, 'Soon'], [1, '~1 day'], [3, '~3 days']])('%i days left → %s', (days, text) => {
    expect(fallbackText(days)).toBe(text)
  })

  it('renders as a green Back Home In card', () => {
    const { container } = render(<FallbackCard daysRemaining={2} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Back Home In')
    expect(container.querySelector('.countdown-value')!.textContent).toBe('~2 days')
  })
})

describe('DaysHomePill', () => {
  it('counts the days home', () => {
    const { rerender } = render(<DaysHomePill name="Alex" days={1} />)
    expect(screen.getByText("Alex's been home for 1 day")).toBeTruthy()
    rerender(<DaysHomePill name="Alex" days={3} />)
    expect(screen.getByText("Alex's been home for 3 days")).toBeTruthy()
  })
})
