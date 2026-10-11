// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { moonCycle } from '../../src/time/moon'
import { MoonPhaseIcon, moonLitPath } from '../../src/ui/MoonPhaseIcon'

afterEach(cleanup)

describe('moonLitPath', () => {
  it('lights the right half at first quarter and the left half at third quarter', () => {
    // The shadow line is then straight up the middle: an arc with no width.
    expect(moonLitPath(0.25)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A0 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.75)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A0 9.5 0 0 0 12 2.5Z')
  })

  it('lights nothing at new moon and the whole disc at full moon', () => {
    // New: the shadow line comes back up the same edge. Full: it comes back up the other side.
    expect(moonLitPath(0)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A9.5 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.5)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A9.5 9.5 0 0 0 12 2.5Z')
  })

  it('bulges the shadow line toward the lit side for a crescent and away from it when gibbous', () => {
    // Waxing crescent (lit right): the line comes up right of center. Waxing gibbous: left of center.
    expect(moonLitPath(0.125)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A6.72 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.375)).toBe('M12 2.5A9.5 9.5 0 0 1 12 21.5A6.72 9.5 0 0 1 12 2.5Z')
    // Waning gibbous (lit left): right of center. Waning crescent: left of center.
    expect(moonLitPath(0.625)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A6.72 9.5 0 0 0 12 2.5Z')
    expect(moonLitPath(0.875)).toBe('M12 2.5A9.5 9.5 0 0 0 12 21.5A6.72 9.5 0 0 1 12 2.5Z')
  })
})

describe('MoonPhaseIcon', () => {
  it('draws the outline and the lit part for the moon’s age at that moment', () => {
    const t = Date.parse('2026-10-11T12:00:00Z')
    const { container } = render(<MoonPhaseIcon t={t} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('17')
    expect(svg.querySelector('circle')).not.toBeNull()
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(moonLitPath(moonCycle(t)))
  })
})
