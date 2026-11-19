// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { TripSoFar } from '../../src/facts/factRow'
import { ClockKey, ClockText, ClockZonesContext, type ClockZones } from '../../src/ui/ClockText'
import { FactsBody } from '../../src/ui/FactsBody'

/** Every time says whose it is, on the page (time labels design §3.4, §3.5). */

afterEach(cleanup)

const N = ' '
/** 19 Nov 2026, 4:35 PM in New York: Eastern Standard Time. */
const ZONES: ClockZones = { viewerTz: 'America/New_York', at: Date.UTC(2026, 10, 19, 21, 35), cities: { Anchorage: 'America/Anchorage' } }

const shown = (text: string) => render(<ClockZonesContext.Provider value={ZONES}><p><ClockText text={text} /></p></ClockZonesContext.Provider>).container

/** What a sighted reader sees: the text with what only screen readers hear left out. */
const seen = (el: Element) => {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('.sr-only').forEach((n) => n.remove())
  return copy.textContent
}

/** What a screen reader hears: the text with what's hidden from it left out. */
const heard = (el: Element) => {
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
  return copy.textContent
}

describe('a time on the page (time labels design §3.5)', () => {
  it("wraps the family's time in <time>, with its 24-hour time and the zone's full name as its hover tip", () => {
    const container = shown(`Halfway at about 4:35${N}PM L`)
    const time = container.querySelector('time')!
    expect(time.getAttribute('datetime')).toBe('16:35')
    expect(time.getAttribute('title')).toBe(`4:35${N}PM Eastern Standard Time`)
    expect(seen(container)).toBe(`Halfway at about 4:35${N}PM L`)
  })

  it('says "your time" for the L to a screen reader', () => {
    expect(heard(shown(`Halfway at about 4:35${N}PM L`))).toBe(`Halfway at about 4:35${N}PM your time`)
  })

  it("wraps a city's time too, with that city's zone", () => {
    const container = shown(`Lands Anchorage about 12:35${N}PM · 4:35${N}PM L`)
    const times = [...container.querySelectorAll('time')]
    expect(times.map((t) => t.getAttribute('title'))).toEqual([`12:35${N}PM Alaska Standard Time`, `4:35${N}PM Eastern Standard Time`])
    expect(times.map((t) => t.getAttribute('datetime'))).toEqual(['12:35', '16:35'])
    expect(seen(container)).toBe(`Lands Anchorage about 12:35${N}PM · 4:35${N}PM L`)
    expect(heard(container)).toBe(`Lands Anchorage about 12:35${N}PM · 4:35${N}PM your time`)
  })

  it('leaves words with no time as they are', () => {
    const container = shown('2,140 mi flown · 1,960 to go')
    expect(container.querySelector('time')).toBeNull()
    expect(container.textContent).toBe('2,140 mi flown · 1,960 to go')
  })
})

describe('the key (time labels design §3.5)', () => {
  it("names the viewer's zone at the moment shown", () => {
    const { container } = render(<ClockZonesContext.Provider value={ZONES}><ClockKey /></ClockZonesContext.Provider>)
    expect(container.querySelector('.clock-key')?.textContent).toBe('L = your time (Eastern Standard Time)')
  })

  it('shows at the bottom of the facts, under "Estimated from the schedule"', () => {
    const empty: TripSoFar = { flights: [], totalsTitle: 'Trip so far', totals: null }
    const { container } = render(<ClockZonesContext.Provider value={ZONES}><FactsBody rows={[]} tripSoFar={empty} /></ClockZonesContext.Provider>)
    const lines = [...container.querySelector('footer.facts-footer')!.children].map((el) => el.textContent)
    expect(lines).toEqual(['Estimated from the schedule', 'L = your time (Eastern Standard Time)'])
  })
})

describe('the newest event, bold (time labels design §3.4)', () => {
  const tripSoFar: TripSoFar = {
    flights: [{
      id: 'f2', title: 'UPS202 · Cologne → Dubai', tag: 'In the air now',
      events: [
        { text: `Out over the Persian Gulf · about 9:05${N}AM L`, isEstimate: true, isCurrent: true },
        { text: `Crossed into Iran · 8:40${N}AM L`, isEstimate: false, isCurrent: false },
      ],
    }],
    totalsTitle: 'Trip so far',
    totals: null,
  }

  it('is drawn with the current class, an estimate staying slanted too, and is "latest" to a screen reader', () => {
    const { container } = render(<ClockZonesContext.Provider value={ZONES}><FactsBody rows={[]} tripSoFar={tripSoFar} /></ClockZonesContext.Provider>)
    const lines = [...container.querySelectorAll('.trip-so-far-flight li')]
    expect(lines.map((li) => li.className)).toEqual(['estimate current', ''])
    expect(heard(lines[0])).toBe(`Out over the Persian Gulf · about 9:05${N}AM your time, latest`)
    expect(heard(lines[1])).toBe(`Crossed into Iran · 8:40${N}AM your time`)
    expect(seen(lines[0])).toBe(`Out over the Persian Gulf · about 9:05${N}AM L`)
  })
})
