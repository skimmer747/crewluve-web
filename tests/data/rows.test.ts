import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { newestUpdatedAt } from '../../src/data/rows'

const A = Date.UTC(2026, 9, 9, 9, 30)
const raw = new RawBuilder(A)
  .pilot('Alex', 'SDF', 'LEX')
  .trip('t1', { days: 1, dutyPeriods: [{ start: 0, end: 120, flights: [{ dep: 'SDF', arr: 'RFD', out: 30, in: 100 }] }] })
  .commute('c1', 'LEX', 'SDF', 'toWork', -60, -10, 't1')
  .jumpseat('j1', 'SDF', 'MCO', 200, 300)
  .category('cat1', 'Reserve')
  .manualEvent('m1', 'RSVA', 400, 500, 'SDF', { categoryId: 'cat1' })
  .training('te1', 'CQ', 600, 700, 'SDF')
  .build()

describe('RawBuilder', () => {
  it('turns minute offsets into ISO instants', () => {
    expect(raw.flights[0].scheduled_block_out_time).toBe('2026-10-09T10:00:00.000Z')
    expect(raw.trips[0].start_date).toBe('2026-10-09T09:30:00.000Z')
    expect(raw.trips[0].end_date).toBe('2026-10-09T11:30:00.000Z')
  })

  it('stores actual times equal to scheduled unless given, like Crewlu', () => {
    expect(raw.flights[0].block_out_time).toBe(raw.flights[0].scheduled_block_out_time)
  })

  it('records when the rows were made and the newest update', () => {
    expect(raw.fetchedAt).toBe(A)
    expect(raw.newestUpdatedAt).toBe(Date.parse('2026-10-01T00:00:00.000Z'))
  })
})

describe('newestUpdatedAt', () => {
  it('returns the latest updated_at across tables, or null', () => {
    const later = { ...raw, trips: [{ ...raw.trips[0], updated_at: '2026-10-05T12:00:00.000Z' }] }
    expect(newestUpdatedAt(later)).toBe(Date.parse('2026-10-05T12:00:00.000Z'))
    expect(newestUpdatedAt(new RawBuilder(A).build())).toBeNull()
  })
})
