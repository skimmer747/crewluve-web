// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { memo } from '../../src/ui/memo'

afterEach(cleanup)

/** How many times each probe below has drawn. */
let draws = 0

const Label = memo(({ text, onTap }: { text: string; onTap?: () => void }) => {
  draws++
  return <button type="button" onClick={onTap}>{text}</button>
})

describe('memo (redraws §4.1)', () => {
  it('draws again only when a prop has changed, compared one by one by identity', () => {
    draws = 0
    const tap = () => {}
    const { rerender } = render(<Label text="Today" onTap={tap} />)
    rerender(<Label text="Today" onTap={tap} />)
    expect(draws).toBe(1)
    rerender(<Label text="Tomorrow" onTap={tap} />)
    expect([draws, screen.getByRole('button').textContent]).toEqual([2, 'Tomorrow'])
  })

  it('counts a new function as a change, as the same code made again is a different function', () => {
    draws = 0
    const { rerender } = render(<Label text="Today" onTap={() => {}} />)
    rerender(<Label text="Today" onTap={() => {}} />)
    expect(draws).toBe(2)
  })

  it('counts a prop that comes or goes as a change', () => {
    draws = 0
    const tap = () => {}
    const { rerender } = render(<Label text="Today" />)
    rerender(<Label text="Today" onTap={tap} />)
    rerender(<Label text="Today" />)
    expect(draws).toBe(3)
  })

  it('is named after the component it holds, for devtools and Preact’s warnings', () => {
    expect(memo(function TripCalendar() { return null }).displayName).toBe('Memo(TripCalendar)')
  })

  it('still draws again for its own state, as the calendar does for the keyboard’s place', () => {
    draws = 0
    const Counter = memo(({ label }: { label: string }) => {
      const [count, setCount] = useState(0)
      draws++
      return <button type="button" onClick={() => setCount(count + 1)}>{`${label} ${count}`}</button>
    })
    render(<Counter label="Taps" />)
    fireEvent.click(screen.getByRole('button'))
    expect([draws, screen.getByRole('button').textContent]).toEqual([2, 'Taps 1'])
  })
})
