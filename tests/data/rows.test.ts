import { describe, expect, it } from 'vitest'
import { RawBuilder } from '../../src/data/rowBuilder'
import { COLUMNS, newestUpdatedAt } from '../../src/data/rows'

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

const keys = (row: object) => Object.keys(row).sort()
const columns = (table: keyof typeof COLUMNS) => COLUMNS[table].split(',').sort()

describe('RawBuilder rows match the columns fetchSchedule selects', () => {
  it.each([
    ['pilot_infos', raw.pilotInfos[0]],
    ['trips', raw.trips[0]],
    ['duty_periods', raw.dutyPeriods[0]],
    ['flights', raw.flights[0]],
    ['commutes', raw.commutes[0]],
    ['jumpseats', raw.jumpseats[0]],
    ['training_events', raw.trainingEvents[0]],
    ['manual_events', raw.manualEvents[0]],
    ['event_categories', raw.eventCategories[0]],
  ] as const)('%s', (table, row) => {
    expect(keys(row)).toEqual(columns(table))
  })
})

// Spec §6.1: the nine tables the site reads, and the ones it never reads.
const READ_TABLES = ['pilot_infos', 'trips', 'duty_periods', 'flights', 'commutes', 'jumpseats', 'training_events', 'manual_events', 'event_categories']
const NEVER_READ_TABLES = ['pilots', 'pilot_personal_infos', 'crew_members', 'jumpseat_riders', 'hotels', 'caterings', 'catering_photos', 'aircraft_notes', 'profiles']

describe('COLUMNS (spec §6.1)', () => {
  it('has exactly the nine tables the spec lists', () => {
    expect(Object.keys(COLUMNS).sort()).toEqual([...READ_TABLES].sort())
  })

  it.each(NEVER_READ_TABLES)('does not include %s, which the site never reads', (table) => {
    expect(Object.keys(COLUMNS)).not.toContain(table)
  })

  it('names every column: no table is read with *', () => {
    for (const columns of Object.values(COLUMNS)) {
      expect(columns).not.toContain('*')
      expect(columns).toMatch(/^[a-z_]+(,[a-z_]+)*$/)
    }
  })
})

describe('RawBuilder', () => {
  it('turns minute offsets into ISO instants', () => {
    expect(raw.flights[0].scheduled_block_out_time).toBe('2026-10-09T10:00:00.000Z')
    expect(raw.trips[0].start_date).toBe('2026-10-09T09:30:00.000Z')
    expect(raw.trips[0].end_date).toBe('2026-10-09T11:30:00.000Z')
  })

  it('stores actual times equal to scheduled unless given, like Crewlu', () => {
    expect(raw.flights[0].block_out_time).toBe(raw.flights[0].scheduled_block_out_time)
  })

  it('records the fetch time and the newest update', () => {
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
