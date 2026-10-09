import { describe, expect, it } from 'vitest'
import { fetchSchedule, ScheduleFetchError, WINDOW_FUTURE, WINDOW_PAST, type SelectClient } from '../../src/data/fetchSchedule'
import { COLUMNS } from '../../src/data/rows'

type Call = [string, ...unknown[]]
interface Failure { table: string; message: string; code: string; status: number }

class FakeQuery {
  readonly calls: Call[] = []
  constructor(readonly table: string, private readonly pages: unknown[][], private readonly failure: Failure | null) {}
  select(columns: string) { this.calls.push(['select', columns]); return this }
  is(column: string, value: unknown) { this.calls.push(['is', column, value]); return this }
  gte(column: string, value: string) { this.calls.push(['gte', column, value]); return this }
  lte(column: string, value: string) { this.calls.push(['lte', column, value]); return this }
  order(column: string, options: unknown) { this.calls.push(['order', column, options]); return this }
  async range(from: number, to: number) {
    this.calls.push(['range', from, to])
    if (this.failure) return { data: null, error: { message: this.failure.message, code: this.failure.code }, status: this.failure.status }
    return { data: this.pages[from / 1000] ?? [], error: null, status: 200 }
  }
}

function fakeClient(pages: Record<string, unknown[][]> = {}, failure: Failure | null = null) {
  const queries: FakeQuery[] = []
  const client: SelectClient = {
    from(table: string) {
      const q = new FakeQuery(table, pages[table] ?? [[]], failure?.table === table ? failure : null)
      queries.push(q)
      return q
    },
  }
  return { client, queries }
}

const NOW = Date.UTC(2026, 9, 9, 12)
const iso = (ms: number) => new Date(ms).toISOString()
const row = (id: string, updatedAt = '2026-10-01T00:00:00.000Z') => ({ id, updated_at: updatedAt })

describe('fetchSchedule', () => {
  it('reads exactly the nine schedule tables, with their columns, live rows only, ordered by id', async () => {
    const { client, queries } = fakeClient()
    await fetchSchedule(client, NOW)
    expect(new Set(queries.map((q) => q.table))).toEqual(new Set(Object.keys(COLUMNS)))
    for (const q of queries) {
      expect(q.calls[0]).toEqual(['select', COLUMNS[q.table as keyof typeof COLUMNS]])
      expect(q.calls).toContainEqual(['is', 'deleted_at', null])
      expect(q.calls).toContainEqual(['order', 'id', { ascending: true }])
    }
  })

  it('limits schedule tables to 60 days back and 120 days ahead', async () => {
    const { client, queries } = fakeClient()
    await fetchSchedule(client, NOW)
    const calls = (table: string) => queries.find((q) => q.table === table)!.calls
    expect(calls('flights')).toContainEqual(['gte', 'scheduled_block_out_time', iso(NOW - WINDOW_PAST)])
    expect(calls('flights')).toContainEqual(['lte', 'scheduled_block_out_time', iso(NOW + WINDOW_FUTURE)])
    expect(calls('trips')).toContainEqual(['gte', 'end_date', iso(NOW - WINDOW_PAST)])
    expect(calls('trips')).toContainEqual(['lte', 'start_date', iso(NOW + WINDOW_FUTURE)])
  })

  it('pages through more than 1000 rows', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`f${i}`))
    const { client, queries } = fakeClient({ flights: [full, [row('f1000'), row('f1001')]] })
    const raw = await fetchSchedule(client, NOW)
    expect(raw.flights).toHaveLength(1002)
    const ranges = queries.filter((q) => q.table === 'flights').map((q) => q.calls.find((c) => c[0] === 'range'))
    expect(ranges).toEqual([['range', 0, 999], ['range', 1000, 1999]])
  })

  it('stamps the fetch time and the newest update', async () => {
    const { client } = fakeClient({ trips: [[row('t1', '2026-10-05T08:00:00.000Z')]], flights: [[row('f1', '2026-10-06T09:00:00.000Z')]] })
    const raw = await fetchSchedule(client, NOW)
    expect(raw.fetchedAt).toBe(NOW)
    expect(raw.newestUpdatedAt).toBe(Date.parse('2026-10-06T09:00:00.000Z'))
  })

  it('fails the whole fetch on any table error, flagging expired sessions', async () => {
    const { client } = fakeClient({}, { table: 'flights', message: 'JWT expired', code: 'PGRST301', status: 401 })
    const err = await fetchSchedule(client, NOW).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ScheduleFetchError)
    expect((err as ScheduleFetchError).isAuth).toBe(true)
  })
})
