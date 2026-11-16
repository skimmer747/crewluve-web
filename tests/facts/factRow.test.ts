import { describe, expect, it } from 'vitest'
import { factRow, type FactRowKind } from '../../src/facts/factRow'

describe('the facts’ rows (Stage 2 spec §5)', () => {
  it('have a kind for the plane’s own row, on a flight with live data (Stage 3 spec §8)', () => {
    // A kind the type doesn't have fails `tsc`, which reads the tests too.
    const kind: FactRowKind = 'plane'
    const row = factRow(kind, 'Airplane', 'Boeing 767-300 · N370UP', ['35,000 ft · 540 mph'])
    expect(row.kind).toBe('plane')
  })
})
