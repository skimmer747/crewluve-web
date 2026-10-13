// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { legTimes, type LegMoment } from '../../src/copy/schedule'
import type { Leg } from '../../src/engine/legs'
import { rowLook, type Gap } from '../../src/ui/scheduleFacts'
import { TimelineRow } from '../../src/ui/TimelineRow'
import { testAirports } from '../fixtures/airports'
import { drive, flight, H, pilot, place } from '../fixtures/legs'
import { iconNameOf, visibleText } from '../fixtures/ui'

afterEach(cleanup)

const NY = 'America/New_York'
/** Midnight in New York on Thursday 15 Oct 2026, in the fixtures' hours. */
const T0 = Date.UTC(2026, 9, 15, 4) / H
const at = (hours: number) => (T0 + hours) * H
const commuter = pilot('LEX', 'SDF')
const ups = flight('RFD', 'SDF', T0 + 6.25, T0 + 7.75, 'T1', { number: '2961' }) // 6:15am to 7:45am

function row(leg: Leg, moment: LegMoment, now: number, gap: Gap | null = null) {
  const { container } = render(
    <ol>
      <TimelineRow leg={leg} look={rowLook(leg, commuter, testAirports)} times={legTimes(leg.start, leg.end, NY, false)} moment={moment} now={now}
        gap={gap} />
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
    expect(iconNameOf(icon)).toBe('AirplaneTilt')
    expect(icon.getAttribute('width')).toBe('15')
    expect(text('.leg-title')).toBe('UPS2961: RFD → SDF')
    expect(text('.leg-times')).toBe('6:15am edt – 7:45am edt')
    expect([text('.leg-clock-label'), text('.leg-clock-value'), text('.leg-clock .sr-only')]).toEqual(['Duration', '1h 30m', 'Duration 1 hour, 30 minutes'])
    expect([...card.querySelectorAll('.leg-clock-label, .leg-clock-value')].map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
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
    expect(text('.up-next')).toBe('Up next')
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

  it('leaves the home hint off the next leg, where the UP NEXT tag speaks, as the app gives that row its own hint', () => {
    const { card } = row(drive('SDF', 'LEX', true, T0 + 9, T0 + 10.5), 'next', at(8))
    expect(card.className).toBe('leg glass leg-next homeward')
    expect([...card.querySelectorAll('.sr-only')].map((s) => s.textContent)).not.toContain('Arriving at home airport')
  })

  it('puts the gap before the row, a dashed line and its label, with the label in words for screen readers', () => {
    const layover = place('layover', 'ONT', T0 + 10, T0 + 30)
    const { container } = row(layover, 'other', at(40), { kind: 'layover', ms: 2 * H })
    const item = container.querySelector('li')!
    const gap = item.firstElementChild!
    expect(gap.className).toBe('leg-gap leg-gap-layover')
    expect(visibleText(gap)).toBe('Layover 2h')
    expect([gap.querySelector('.leg-gap-line'), gap.querySelector('.leg-gap-text')].map((s) => s!.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
    expect(gap.querySelector('.sr-only')!.textContent).toBe('Layover, 2 hours')
    expect(gap.nextElementSibling!.className).toBe('leg glass')
    cleanup()
    expect(row(layover, 'other', at(40)).container.querySelector('.leg-gap')).toBeNull()
  })
})

describe('TimelineRow taps (slice 3B §5.3)', () => {
  it('reports a tap on the leg, not on its gap, and is no button for keyboards or screen readers, as the calendar’s days do the same', () => {
    const onTap = vi.fn()
    const { container } = render(
      <ol>
        <TimelineRow leg={ups} look={rowLook(ups, commuter, testAirports)} times={legTimes(ups.start, ups.end, NY, false)} moment="other" now={at(9)}
          gap={{ kind: 'gap', ms: H }} onTap={onTap} />
      </ol>,
    )
    const card = container.querySelector<HTMLElement>('.leg')!
    fireEvent.click(card.querySelector('.leg-title')!)
    // It hands over its leg, so one handler serves every row (redraws §4.3).
    expect(onTap.mock.calls).toEqual([[ups]])
    fireEvent.click(container.querySelector('.leg-gap')!)
    expect(onTap).toHaveBeenCalledTimes(1)
    expect([card.tagName, card.getAttribute('role'), card.getAttribute('tabindex')]).toEqual(['DIV', null, null])
  })
})
