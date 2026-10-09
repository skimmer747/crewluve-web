// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CountdownCard } from '../../src/ui/CountdownCard'
import { DaysHomePill } from '../../src/ui/DaysHomePill'
import { FallbackCard, fallbackText } from '../../src/ui/FallbackCard'
import { iconNameOf, stubAnimationFrames } from '../fixtures/ui'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

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

  it('colors the icon and every number, but not the units', () => {
    const { container } = render(
      <CountdownCard title="Back Home In" icon="House" color="green" target={NOW + (11 * 1440 + 8 * 60 + 39) * MIN} now={NOW} subtitle={null} />,
    )
    const icon = container.querySelector<SVGElement>('.countdown-head svg')!
    expect(iconNameOf(icon)).toBe('House')
    expect(icon.style.color).toBe('var(--green)')
    const numbers = [...container.querySelectorAll('.num')]
    expect(numbers.map((n) => n.textContent)).toEqual(['11', '08', '39'])
    for (const n of numbers) expect(n.getAttribute('style')).toContain('var(--green)')
    const units = [...container.querySelectorAll('.unit')]
    expect(units.map((u) => u.textContent)).toEqual(['d', 'h', 'm'])
    for (const u of units) expect(u.getAttribute('style')).toBeNull()
  })

  it('is a timer', () => {
    render(<CountdownCard title="Back Home In" icon="House" color="green" target={NOW + 25 * MIN} now={NOW} subtitle={null} />)
    expect(screen.getByRole('timer').textContent).toBe('25m  00s')
  })

  it('says Now! in the card color', () => {
    const { container } = render(<CountdownCard title="Back Home In" icon="House" color="red" target={NOW} now={NOW} subtitle={null} />)
    const now = container.querySelector('.num')!
    expect(now.textContent).toBe('Now!')
    expect(now.getAttribute('style')).toContain('var(--red)')
  })

  it('plays the celebration inside the card only when asked to', async () => {
    const frames = stubAnimationFrames()
    const card = (celebrate: boolean) => (
      <CountdownCard title="Back Home In" icon="House" color="green" target={NOW + 25 * MIN} now={NOW} subtitle={null} celebrate={celebrate} />
    )
    const { container, rerender } = render(card(false))
    await frames.frame(0)
    expect(frames.pending).toBe(0)
    expect(container.querySelector('.celebration')).toBeNull()
    rerender(card(true))
    await frames.frame(0)
    expect(container.querySelector('.countdown .celebration svg')).not.toBeNull()
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

  it('is green all through: the house icon and the number', () => {
    const { container } = render(<FallbackCard daysRemaining={2} />)
    const icon = container.querySelector<SVGElement>('.countdown-head svg')!
    expect(iconNameOf(icon)).toBe('House')
    expect(icon.style.color).toBe('var(--green)')
    expect(container.querySelector('.num')!.getAttribute('style')).toContain('var(--green)')
  })
})

describe('DaysHomePill', () => {
  it('counts the days home', () => {
    const { rerender } = render(<DaysHomePill name="Alex" days={1} />)
    expect(screen.getByText("Alex's been home for 1 day")).toBeTruthy()
    rerender(<DaysHomePill name="Alex" days={3} />)
    expect(screen.getByText("Alex's been home for 3 days")).toBeTruthy()
  })

  it('draws a green house', () => {
    const { container } = render(<DaysHomePill name="Alex" days={3} />)
    const icon = container.querySelector<SVGElement>('.pill svg')!
    expect(iconNameOf(icon)).toBe('House')
    expect(icon.style.color).toBe('var(--green)')
  })
})
