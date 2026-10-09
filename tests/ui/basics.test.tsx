// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { Span } from '../../src/copy/narrative'
import type { Visual } from '../../src/copy/visuals'
import { cssColor } from '../../src/ui/colors'
import { Icon } from '../../src/ui/Icon'
import { NarrativeCard } from '../../src/ui/NarrativeCard'
import { ProgressRing } from '../../src/ui/ProgressRing'
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

  it('draws on the 256 grid at 28 px, filled with the surrounding text color', () => {
    const { container } = render(<Icon name="House" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.getAttribute('width')).toBe('28')
    expect(svg.getAttribute('height')).toBe('28')
    expect(svg.style.color).toBe('')
  })

  it('uses the color it is given', () => {
    const { container } = render(<Icon name="House" size={20} color="var(--green)" />)
    const svg = container.querySelector('svg')!
    expect(svg.style.color).toBe('var(--green)')
    expect(svg.getAttribute('height')).toBe('20')
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

describe('ProgressRing', () => {
  const LENGTH = 2 * Math.PI * 20.5 // one lap of the circle: radius 20.5 in the 44 px box, 3 px stroke

  function draw(value: number, color = 'var(--green)') {
    const { container } = render(<ProgressRing value={value} color={color} />)
    const svg = container.querySelector('svg')!
    return { svg, circles: Array.from(svg.querySelectorAll('circle')) }
  }
  /** The fill's dash and gap lengths from its stroke-dasharray. */
  const dashOf = (fill: SVGElement) => fill.style.strokeDasharray.split(' ').map(Number)

  it('is a decorative 44 px ring', () => {
    const { svg } = draw(0.25)
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('44')
    expect(svg.getAttribute('height')).toBe('44')
    expect(svg.getAttribute('viewBox')).toBe('0 0 44 44')
  })

  it('draws a 20% track and a round-capped 3 px fill, both in the given color', () => {
    const { circles } = draw(0.25, 'var(--blue)')
    expect(circles).toHaveLength(2)
    const [track, fill] = circles
    for (const circle of circles) {
      expect(circle.getAttribute('r')).toBe('20.5')
      expect(circle.style.stroke).toBe('var(--blue)')
      expect(circle.style.strokeWidth).toBe('3px')
    }
    expect(track.style.strokeOpacity).toBe('0.2')
    expect(fill.style.strokeLinecap).toBe('round')
  })

  it("fills the matching share of the circle, starting at 12 o'clock", () => {
    const [, fill] = draw(0.25).circles
    const [dash, gap] = dashOf(fill)
    expect(dash).toBeCloseTo(LENGTH * 0.25, 6)
    expect(gap).toBeCloseTo(LENGTH, 6)
    expect(fill.getAttribute('transform')).toBe('rotate(-90 22 22)')
  })

  it('closes the circle at full progress and clamps anything above it', () => {
    const full = dashOf(draw(1).circles[1])
    expect(full[0]).toBeCloseTo(LENGTH, 6)
    expect(dashOf(draw(1.7).circles[1])).toEqual(full)
  })

  it.each([0, -0.5, Number.NaN])('draws only the track for %s, because a zero-length round cap would still paint a dot', (value) => {
    const { circles } = draw(value)
    expect(circles).toHaveLength(1)
    expect(circles[0].style.strokeOpacity).toBe('0.2')
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

  it('draws the status icon at 28 px and the ring in the status color', () => {
    const { container } = render(<NarrativeCard spans={spans} visual={{ icon: 'Package', color: 'ups' }} ring={0.5} />)
    const icon = container.querySelector<SVGElement>('svg.icon')!
    expect(icon.getAttribute('width')).toBe('28')
    expect(icon.getAttribute('height')).toBe('28')
    expect(icon.style.color).toBe('var(--ups)')
    const circles = container.querySelectorAll<SVGElement>('svg.ring circle')
    expect(circles).toHaveLength(2)
    for (const circle of circles) expect(circle.style.stroke).toBe('var(--ups)')
  })

  describe('when a countdown changes', () => {
    const visual: Visual = { icon: 'Airplane', color: 'blue' }
    const landing = (countdown: string): Span[] => [{ text: 'Landing in ' }, { text: countdown, bold: true, color: 'status', digits: true }]

    it('mounts a new countdown node so the roll-in replays, and keeps the node while the text is the same', () => {
      const { container, rerender } = render(<NarrativeCard spans={landing('50m')} visual={visual} ring={null} />)
      const first = container.querySelector('.digits')!
      expect(first.textContent).toBe('50m')

      rerender(<NarrativeCard spans={landing('50m')} visual={visual} ring={null} />)
      expect(container.querySelector('.digits')).toBe(first)

      rerender(<NarrativeCard spans={landing('49m')} visual={visual} ring={null} />)
      const next = container.querySelector('.digits')!
      expect(next.textContent).toBe('49m')
      expect(next).not.toBe(first)
      expect(container.querySelectorAll('.digits')).toHaveLength(1)
    })
  })
})

describe('NarrativeCard for screen readers', () => {
  const card = (text: string, spoken: string) => (
    <NarrativeCard
      spans={[{ text: 'Landing in ' }, { text, bold: true, color: 'status', digits: true, spoken }]}
      visual={{ icon: 'Package', color: 'ups' }}
      ring={null}
    />
  )

  it('reads the countdown in words and hides the digits from screen readers', () => {
    const { container } = render(card('50m', '50 minutes'))
    const digits = container.querySelector('.digits')!
    expect(digits.textContent).toBe('50m')
    expect(digits.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.narrative-text .sr-only')!.textContent).toBe('50 minutes')
  })

  it('still replays the roll-in when a new minute arrives', () => {
    const { container, rerender } = render(card('50m', '50 minutes'))
    const first = container.querySelector('.digits')
    rerender(card('49m', '49 minutes'))
    expect(container.querySelector('.digits')).not.toBe(first)
    expect(container.querySelectorAll('.narrative-text .sr-only')).toHaveLength(1)
    expect(container.querySelector('.narrative-text .sr-only')!.textContent).toBe('49 minutes')
  })
})
