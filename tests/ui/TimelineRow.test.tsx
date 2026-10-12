// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { GapKind, LegMoment } from '../../src/copy/schedule'
import type { Leg } from '../../src/engine/legs'
import { rowLook } from '../../src/ui/scheduleFacts'
import { TimelineRow } from '../../src/ui/TimelineRow'
import { testAirports } from '../fixtures/airports'
import { drive, flight, H, pilot, place } from '../fixtures/legs'
import { iconNameOf } from '../fixtures/ui'

afterEach(cleanup)

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const at = (hours: number) => (T0 + hours) * H
const commuter = pilot('LEX', 'SDF')
const ups = flight('RFD', 'SDF', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }) // 6:15am to 7:45am

function row(leg: Leg, moment: LegMoment, now: number, gap: { kind: GapKind; ms: number } | null = null) {
  const { container } = render(
    <ol>
      <TimelineRow leg={leg} look={rowLook(leg, commuter, testAirports)} moment={moment} now={now} timeZone={NY} h24={false} gap={gap} />
    </ol>,
  )
  const card = container.querySelector<HTMLElement>('.leg')!
  const text = (selector: string) => card.querySelector(selector)?.textContent ?? null
  return { container, card, text }
}

describe('TimelineRow (slice 3A §4.4–4.9)', () => {
  it('shows the icon in a circle of the leg’s color, the title, the times, and the leg’s length', () => {
    const { card, text } = row(ups, 'other', at(9))
    expect(card.className).toBe('leg glass')
    expect(card.style.getPropertyValue('--leg')).toBe('var(--ups)')
    const icon = card.querySelector('.leg-icon svg')!
    expect(iconNameOf(icon)).toBe('Package')
    expect(icon.getAttribute('width')).toBe('15')
    expect(text('.leg-title')).toBe('UPS2961: RFD → SDF')
    expect(text('.leg-times')).toBe('6:15am edt – 7:45am edt')
    expect([text('.leg-clock-label'), text('.leg-clock-value'), text('.leg-clock .sr-only')]).toEqual(['Duration', '1h 30m', 'Duration 1 hour, 30 minutes'])
    expect(card.querySelector('.up-next')).toBeNull()
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon')
  })

  it('counts down the leg happening now, with its edge and a pulsing icon', () => {
    const { card, text } = row(ups, 'happening', at(7))
    expect(card.className).toBe('leg glass leg-happening')
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon pulsing')
    expect([text('.leg-clock-label'), text('.leg-clock-value')]).toEqual(['Ends in', '45:00'])
    expect(card.querySelector('.up-next')).toBeNull()
  })

  it('rings the next leg, tags it UP NEXT, and counts down to its start', () => {
    const { card, text } = row(ups, 'next', at(5))
    expect(card.className).toBe('leg glass leg-next')
    const ring = card.querySelector('.leg-ring')!
    expect(ring.getAttribute('aria-hidden')).toBe('true')
    expect(ring.querySelector('.leg-ring-turn')).not.toBeNull()
    expect(text('.up-next')).toBe('UP NEXT')
    expect([text('.leg-clock-label'), text('.leg-clock-value')]).toEqual(['Starts in', '1:15:00'])
    expect(card.querySelector('.leg-icon')!.className).toBe('leg-icon')
  })

  it('edges a leg that ends at home in green, and tells screen readers it arrives home', () => {
    const home = drive('SDF', 'LEX', true, T0 + 9, T0 + 10.5)
    const { card } = row(home, 'other', at(12))
    expect(card.className).toBe('leg glass leg-home homeward')
    expect([...card.querySelectorAll('.sr-only')].map((s) => s.textContent)).toContain('Arriving at home airport')
    cleanup()
    expect(row(home, 'happening', at(10)).card.className).toBe('leg glass leg-happening homeward')
  })

  it('puts the gap before the row as a dashed line and its label, hidden from screen readers', () => {
    const layover = place('layover', 'ONT', T0 + 10, T0 + 30)
    const { container } = row(layover, 'other', at(40), { kind: 'layover', ms: 2 * H })
    const item = container.querySelector('li')!
    const gap = item.firstElementChild!
    expect(gap.className).toBe('leg-gap leg-gap-layover')
    expect(gap.getAttribute('aria-hidden')).toBe('true')
    expect(gap.textContent).toBe('Layover 2h')
    expect(gap.querySelector('.leg-gap-line')).not.toBeNull()
    expect(gap.nextElementSibling!.className).toBe('leg glass')
    cleanup()
    expect(row(layover, 'other', at(40)).container.querySelector('.leg-gap')).toBeNull()
  })
})
