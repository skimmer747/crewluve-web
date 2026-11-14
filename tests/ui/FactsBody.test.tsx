// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { factRow, rowSentence, type TripSoFar } from '../../src/facts/factRow'
import { FactsBody } from '../../src/ui/FactsBody'

afterEach(cleanup)

const below = factRow('below', 'MapPin', 'Over Bravo, near Testville', ['Passes 35 mi from home at 8:21 AM'])
const headed = factRow('headed', 'AirplaneLanding', 'Lands Cologne 9:30 PM', [null, '6 hours ahead of you'])
const soFar: TripSoFar = {
  flights: [{ id: 'f1', title: 'UPS201 · Louisville → Cologne', milestones: ['Crossed into Canada · 1:12 PM', 'Halfway · 4:12 PM'] }],
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
})
