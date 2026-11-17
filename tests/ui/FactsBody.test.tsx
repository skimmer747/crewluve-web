// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { factRow, rowSentence, type TripSoFar } from '../../src/facts/factRow'
import { FactsBody } from '../../src/ui/FactsBody'

afterEach(cleanup)

const below = factRow('below', 'MapPin', 'Over Bravo, near Testville', ['Passes 35 mi from home at 8:21 AM'])
const headed = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', [null, '6 hours ahead of you'])
const soFar: TripSoFar = {
  flights: [{
    id: 'f1', title: 'UPS201 · Louisville → Cologne', tag: null,
    events: [{ text: 'Halfway · 4:12 PM', isEstimate: false }, { text: 'Crossed into Canada · 1:12 PM', isEstimate: false }],
  }],
  totalsTitle: 'Trip so far',
  totals: 'Day 1 of 4 · 2,140 mi',
}

describe('a fact row (Stage 2 spec §5, §13)', () => {
  it('joins its other parts, leaving out the empty ones', () => {
    expect(headed.detail).toBe('6 hours ahead of you')
    expect(factRow('sky', 'Sun', 'Chasing the sun: their afternoon is stretching').detail).toBeNull()
  })

  it('is one sentence for screen readers', () => {
    expect(rowSentence(below)).toBe('Over Bravo, near Testville. Passes 35 mi from home at 8:21 AM')
    expect(rowSentence(factRow('sky', 'Moon', 'Full moon, up'))).toBe('Full moon, up')
    // Commas where the screen shows " · ", as the app's FactRow.sentence reads it.
    expect(rowSentence(factRow('headed', 'Sun', 'Headed to Cologne', ['6 hours ahead of you', 'Lands at 9:22 AM']))).toBe(
      'Headed to Cologne. 6 hours ahead of you, Lands at 9:22 AM',
    )
  })
})

describe('the facts body (Stage 2 spec §5.2, §6.3)', () => {
  it('shows each row, the trip so far and the footer', () => {
    const { container } = render(<FactsBody rows={[below, headed]} tripSoFar={soFar} />)
    expect(container.querySelectorAll('.fact-row')).toHaveLength(2)
    expect(screen.getByText('Over Bravo, near Testville. Passes 35 mi from home at 8:21 AM')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'UPS201 · Louisville → Cologne' })).toBeTruthy()
    expect(screen.getByText('Halfway · 4:12 PM')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Trip so far' })).toBeTruthy()
    expect(screen.getByText('Day 1 of 4 · 2,140 mi')).toBeTruthy()
    expect(screen.getByText('Estimated from the schedule')).toBeTruthy()
  })

  it('credits Open-Meteo only when a row shows a forecast (§7.2)', () => {
    render(<FactsBody rows={[below]} tripSoFar={soFar} />)
    expect(screen.queryByRole('link', { name: /Open-Meteo/ })).toBeNull()
    cleanup()
    render(<FactsBody rows={[factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', ['48°F and rain on landing'], true)]} tripSoFar={soFar} />)
    expect(screen.getByRole('link', { name: /Open-Meteo/ })).toBeTruthy()
  })

  it('leaves out the totals when there are none', () => {
    render(<FactsBody rows={[]} tripSoFar={{ flights: [], totalsTitle: 'Trip so far', totals: null }} />)
    expect(screen.queryByRole('heading', { name: 'Trip so far' })).toBeNull()
  })

  it('leaves no empty space where the trip so far has nothing to list', () => {
    // On a layover the rows have "Trip so far" (best guesses design §4): with no flight's event yet, as before the
    // geography has loaded, the list has nothing to say, and the footer follows the rows one gap below.
    const { container } = render(<FactsBody rows={[below]} tripSoFar={{ flights: [], totalsTitle: 'Trip so far', totals: null }} />)
    expect(container.querySelector('.trip-so-far')).toBeNull()
    expect([...container.querySelector('.facts-body')!.children].map((c) => c.className)).toEqual(['fact-rows', 'facts-footer'])
  })

  it('lists the flights alone where the rows have the totals, and the totals alone with no flight to list', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={{ ...soFar, totals: null }} />)
    expect(container.querySelector('.trip-so-far-flight h3')?.textContent).toBe('UPS201 · Louisville → Cologne')
    expect(container.querySelector('.trip-so-far-totals')).toBeNull()
    cleanup()
    const totalsOnly = render(<FactsBody rows={[below]} tripSoFar={{ ...soFar, flights: [] }} />)
    expect(totalsOnly.container.querySelector('.trip-so-far-flight')).toBeNull()
    expect(screen.getByText('Day 1 of 4 · 2,140 mi')).toBeTruthy()
  })
})

describe('the credit to adsb.lol under the facts (Stage 3 spec §8, §15)', () => {
  const withWeather = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', ['48°F and rain on landing'], true)
  const footer = (container: Element) => container.querySelector('footer.facts-footer')!

  it('shows under "Estimated from the schedule", beside the weather credit, whenever a flight with live data shows', () => {
    const { container } = render(<FactsBody rows={[withWeather]} tripSoFar={soFar} showsLiveCredit />)
    const lines = [...footer(container).children]
    expect(lines).toHaveLength(3)
    expect(lines[0].textContent).toBe('Estimated from the schedule')
    expect(lines[1].classList.contains('live-credit')).toBe(true)
    expect(lines[2].classList.contains('weather-credit')).toBe(true)
  })

  it('reads "Live position: adsb.lol", and is a sentence for screen readers', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={soFar} showsLiveCredit />)
    const credit = footer(container).querySelector('.live-credit')!
    const shown = screen.getByText('Live position: adsb.lol')
    expect(credit.contains(shown)).toBe(true)
    expect(shown.getAttribute('aria-hidden')).toBe('true')
    const spoken = screen.getByText('Live position from adsb.lol.')
    expect(credit.contains(spoken)).toBe(true)
    expect(spoken.classList.contains('sr-only')).toBe(true)
    expect(spoken.closest('[aria-hidden="true"]')).toBeNull()
    // Plain words, as the app's: no link.
    expect(credit.querySelector('a')).toBeNull()
  })

  it('leaves the footer as it was with no live data', () => {
    const { container } = render(<FactsBody rows={[below]} tripSoFar={soFar} />)
    const before = footer(container).outerHTML
    expect(footer(container).textContent).toBe('Estimated from the schedule')
    expect(container.querySelector('.live-credit')).toBeNull()
    cleanup()
    const none = render(<FactsBody rows={[below]} tripSoFar={soFar} showsLiveCredit={false} />)
    expect(footer(none.container).outerHTML).toBe(before)
    expect(screen.queryByText(/adsb\.lol/)).toBeNull()
  })
})

describe('the trip so far’s list (best guesses design §3, §4)', () => {
  const inTheAir: TripSoFar = {
    flights: [
      {
        id: 'f2', title: 'UPS202 · Cologne → Dubai', tag: 'In the air now',
        events: [{ text: 'Out over the Persian Gulf · about 9:05 AM', isEstimate: true }, { text: 'Crossed into Iran · 8:40 AM', isEstimate: false }],
      },
      { id: 'f1', title: 'UPS201 · Louisville → Cologne', tag: null, events: [{ text: 'Crossed into Canada · 1:12 PM', isEstimate: false }] },
    ],
    totalsTitle: 'Trip so far',
    totals: 'Day 2 of 4 · 6,100 mi',
  }

  it('sets the flight in the air apart with a border, and its tag beside its name in its heading', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={inTheAir} />)
    const sections = [...container.querySelectorAll('.trip-so-far-flight')]
    expect(sections.map((s) => s.classList.contains('in-the-air'))).toEqual([true, false])
    expect(sections[0].querySelector('.trip-so-far-tag')?.textContent).toBe('In the air now')
    expect(screen.getByRole('heading', { name: 'UPS202 · Cologne → Dubai In the air now' })).toBeTruthy()
    // An earlier flight sits plain underneath, with no tag.
    expect(sections[1].querySelector('.trip-so-far-tag')).toBeNull()
    expect(screen.getByRole('heading', { name: 'UPS201 · Louisville → Cologne' })).toBeTruthy()
  })

  it('lists each flight’s events in the order the facts give, newest first, a best guess drawn lighter and slanted', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={inTheAir} />)
    const lines = [...container.querySelectorAll('.trip-so-far-flight li')]
    expect(lines.map((li) => li.textContent)).toEqual(['Out over the Persian Gulf · about 9:05 AM', 'Crossed into Iran · 8:40 AM', 'Crossed into Canada · 1:12 PM'])
    expect(lines.map((li) => li.classList.contains('estimate'))).toEqual([true, false, false])
  })

  it('shows the flight in the air before its first event, with no empty list', () => {
    const { container } = render(<FactsBody rows={[]} tripSoFar={{ ...inTheAir, flights: [{ ...inTheAir.flights[0], events: [] }] }} />)
    expect(container.querySelector('.trip-so-far-flight.in-the-air .trip-so-far-tag')?.textContent).toBe('In the air now')
    expect(container.querySelector('.trip-so-far-flight ul')).toBeNull()
  })
})
