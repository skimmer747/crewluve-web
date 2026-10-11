// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TimeDifference } from '../../src/copy/location'
import { ODOMETER_DELAY_MS, ODOMETER_STEP_MS, TimeDifferenceLine } from '../../src/ui/TimeDifferenceLine'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const behind4: TimeDifference = { hours: 4, minutes: 0, direction: 'behind' }
const ahead130: TimeDifference = { hours: 1, minutes: 30, direction: 'ahead' }

/** What a sighted visitor sees: the line without its screen-reader words. */
const seen = (container: Element) => container.querySelector('.time-diff [aria-hidden="true"]')!.textContent
const minutes = (container: Element) => container.querySelector('.time-diff-minutes')!
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('TimeDifferenceLine', () => {
  it('says "same time as you" when the clocks match', () => {
    const { container } = render(<TimeDifferenceLine diff={{ hours: 0, minutes: 0, direction: 'same' }} />)
    expect(container.querySelector('.time-diff')!.textContent).toBe('same time as you')
  })

  it('counts the hours up from 0, one every 150 ms, after a short pause, like the app’s odometer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(<TimeDifferenceLine diff={behind4} />)
    expect(seen(container)).toBe('0h behind you')
    await advance(ODOMETER_DELAY_MS)
    expect(seen(container)).toBe('1h behind you')
    await advance(ODOMETER_STEP_MS * 3)
    expect(seen(container)).toBe('4h behind you')
    await advance(ODOMETER_STEP_MS * 5)
    expect(seen(container)).toBe('4h behind you')
  })

  it('fades the minutes in once the hours have counted up', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(minutes(container).classList.contains('shown')).toBe(false)
    await advance(ODOMETER_DELAY_MS)
    expect(seen(container)).toBe('1h 30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(false)
    await advance(ODOMETER_STEP_MS)
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('shows a difference under an hour at once, without "0h"', () => {
    const { container } = render(<TimeDifferenceLine diff={{ hours: 0, minutes: 30, direction: 'ahead' }} />)
    expect(seen(container)).toBe('30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('shows the final text at once for people who prefer reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(seen(container)).toBe('1h 30m ahead of you')
    expect(minutes(container).classList.contains('shown')).toBe(true)
  })

  it('colors the numbers by direction: blue ahead, orange behind', () => {
    const { container, rerender } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(container.querySelector('.time-diff')!.className).toBe('time-diff ahead')
    rerender(<TimeDifferenceLine diff={behind4} />)
    expect(container.querySelector('.time-diff')!.className).toBe('time-diff behind')
  })

  it('reads the difference to screen readers in words', () => {
    const { container } = render(<TimeDifferenceLine diff={ahead130} />)
    expect(container.querySelector('.time-diff .sr-only')!.textContent).toBe('1 hour 30 minutes ahead of you')
  })

  it('counts up again when the difference changes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container, rerender } = render(<TimeDifferenceLine diff={behind4} />)
    await advance(ODOMETER_DELAY_MS + ODOMETER_STEP_MS * 4)
    rerender(<TimeDifferenceLine diff={{ hours: 2, minutes: 0, direction: 'ahead' }} />)
    expect(seen(container)).toBe('0h ahead of you')
    await advance(ODOMETER_DELAY_MS + ODOMETER_STEP_MS)
    expect(seen(container)).toBe('2h ahead of you')
  })

  it('stops counting when it goes away', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { unmount } = render(<TimeDifferenceLine diff={behind4} />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
