// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { Span } from '../../src/copy/narrative'
import { cssColor } from '../../src/ui/colors'
import { Icon } from '../../src/ui/Icon'
import { NarrativeCard } from '../../src/ui/NarrativeCard'
import { Title, titleFor } from '../../src/ui/Title'

afterEach(cleanup)

describe('cssColor', () => {
  it('maps tokens to theme variables and passes brand hex through', () => {
    expect(cssColor('green')).toBe('var(--green)')
    expect(cssColor('ups')).toBe('var(--ups)')
    expect(cssColor('secondary')).toBe('var(--text-2)')
    expect(cssColor('#002666')).toBe('#002666')
  })
})

describe('Icon', () => {
  it('draws the Phosphor path and hides decorative icons from screen readers', () => {
    const { container } = render(<Icon name="House" size={20} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('20')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelectorAll('path')).toHaveLength(1)
  })

  it('labels meaningful icons', () => {
    render(<Icon name="Warning" label="Problem" />)
    expect(screen.getByRole('img', { name: 'Problem' })).toBeTruthy()
  })
})

describe('Title', () => {
  it('asks where the pilot is', () => {
    expect(titleFor('Alex')).toBe("Where's Alex?")
    expect(titleFor(null)).toBe("Where's your pilot?")
    render(<Title text="Where's Alex?" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Where's Alex?")
  })
})

describe('NarrativeCard', () => {
  const spans: Span[] = [
    { text: 'Alex is flying to ' },
    { text: 'Rockford', bold: true },
    { text: ' — landing in ' },
    { text: '50m', bold: true, color: 'status', digits: true },
    { text: ' or ' },
    { text: '5h', bold: true, color: 'red', digits: true },
  ]

  it('renders the sentence, bold spans, and colored countdowns', () => {
    const { container } = render(<NarrativeCard spans={spans} visual={{ icon: 'Package', color: 'ups' }} ring={0.5} />)
    expect(container.querySelector('.narrative-text')!.textContent).toBe('Alex is flying to Rockford — landing in 50m or 5h')
    expect(container.querySelectorAll('.narrative-text .b')).toHaveLength(3)
    const digits = container.querySelectorAll<HTMLElement>('.digits')
    expect(digits[0].style.color).toBe('var(--ups)')
    expect(digits[1].style.color).toBe('var(--red)')
    expect(container.querySelector('svg.ring')).not.toBeNull()
  })

  it('leaves out the ring when there is no progress', () => {
    const { container } = render(<NarrativeCard spans={spans} visual={{ icon: 'House', color: 'green' }} ring={null} />)
    expect(container.querySelector('svg.ring')).toBeNull()
  })
})
