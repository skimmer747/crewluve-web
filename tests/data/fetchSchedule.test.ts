import { describe, expect, it } from 'vitest'
import { fetchSchedule, ScheduleFetchError, WINDOW_FUTURE, WINDOW_PAST, type SelectClient } from '../../src/data/fetchSchedule'
import { COLUMNS } from '../../src/data/rows'

type Call = [string, ...unknown[]]
interface Failure { table: string; message?: string; code?: string; status?: number }

class FakeQuery {
  readonly calls: Call[] = []
  constructor(readonly table: string, private readonly pages: unknown[][], private readonly failure: Failure | null) {}
  select(columns: string) { this.calls.push(['select', columns]); return this }
  is(column: string, value: unknown) { this.calls.push(['is', column, value]); return this }
  not(column: string, operator: string, value: unknown) { this.calls.push(['not', column, operator, value]); return this }
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

// Spelled out here, so these tests don't borrow the constants they check.
const DAY = 86_400_000

describe('the window (spec §6.1)', () => {
  it('is 60 days back and 120 days ahead', () => {
    expect(WINDOW_PAST).toBe(60 * DAY)
    expect(WINDOW_FUTURE).toBe(120 * DAY)
  })
})

describe('the query for each table (spec §6.1)', () => {
  const from = iso(NOW - 60 * DAY)
  const to = iso(NOW + 120 * DAY)
  const live: Call[] = [['is', 'deleted_at', null]]
  // `not ... is true` keeps rows where the flag is null or false.
  const visible: Call[] = [['not', 'hidden_from_timeline', 'is', true]]
  const FILTERS: Record<keyof typeof COLUMNS, Call[]> = {
    pilot_infos: [...live],
    trips: [...live, ['gte', 'end_date', from], ['lte', 'start_date', to]],
    duty_periods: [...live, ['gte', 'start_time', from], ['lte', 'start_time', to]],
    flights: [...live, ...visible, ['gte', 'scheduled_block_out_time', from], ['lte', 'scheduled_block_out_time', to]],
    commutes: [...live, ...visible, ['gte', 'arrival_time_zulu', from], ['lte', 'departure_time_zulu', to]],
    jumpseats: [...live, ...visible, ['gte', 'arrival_time_zulu', from], ['lte', 'departure_time_zulu', to]],
    training_events: [...live, ...visible, ['gte', 'end_time_utc', from], ['lte', 'start_time_utc', to]],
    manual_events: [...live, ...visible, ['gte', 'end_time_utc', from], ['lte', 'start_time_utc', to]],
    event_categories: [...live],
  }
  const sorted = (calls: Call[]) => [...calls].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

  it.each(Object.entries(FILTERS))('%s: its columns, exactly its filters, then a stable page by id', async (table, filters) => {
    const { client, queries } = fakeClient()
    await fetchSchedule(client, NOW)
    const own = queries.filter((q) => q.table === table)
    expect(own).toHaveLength(1)
    const { calls } = own[0]
    expect(calls[0]).toEqual(['select', COLUMNS[table as keyof typeof COLUMNS]])
    expect(sorted(calls.slice(1, -2))).toEqual(sorted(filters))
    expect(calls.slice(-2)).toEqual([['order', 'id', { ascending: true }], ['range', 0, 999]])
  })

  it('downloads no hidden rows: every table that selects hidden_from_timeline filters on it (spec §9)', async () => {
    const { client, queries } = fakeClient()
    await fetchSchedule(client, NOW)
    const selecting = Object.keys(COLUMNS).filter((t) => COLUMNS[t as keyof typeof COLUMNS].split(',').includes('hidden_from_timeline'))
    expect(selecting.sort()).toEqual(['commutes', 'flights', 'jumpseats', 'manual_events', 'training_events'])
    const filtering = queries.filter((q) => q.calls.some((c) => c[0] === 'not' && c[1] === 'hidden_from_timeline')).map((q) => q.table)
    expect(filtering.sort()).toEqual(selecting)
  })

  it('asks for the next page of a table with a full page, and the page after that from where it left off', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`c${i}`))
    const { client, queries } = fakeClient({ commutes: [full, full, [row('c2000')]] })
    const raw = await fetchSchedule(client, NOW)
    expect(raw.commutes).toHaveLength(2001)
    const pages = queries.filter((q) => q.table === 'commutes')
    expect(pages.map((q) => q.calls[q.calls.length - 1])).toEqual([['range', 0, 999], ['range', 1000, 1999], ['range', 2000, 2999]])
    // Every page repeats the same filters, so the rows stay one consistent set.
    for (const page of pages) expect(sorted(page.calls.slice(1, -2))).toEqual(sorted(FILTERS.commutes))
  })
})

describe('ScheduleFetchError', () => {
  // Each condition of isAuth, tried alone: a session problem is a 401, or one of the PostgREST codes for a bad JWT.
  it.each([
    ['a 401 on its own is an auth failure', 401, null, true],
    ['code PGRST301 on its own is an auth failure', null, 'PGRST301', true],
    ['code PGRST302 on its own is an auth failure', null, 'PGRST302', true],
    ['a 401 carrying code PGRST303 is an auth failure', 401, 'PGRST303', true],
    ['a 403 is not', 403, null, false],
    ['a 500 is not', 500, 'PGRST000', false],
    ['a gateway 503 is not', 503, null, false],
    ['status 0, as when offline, is not', 0, '', false],
    ['no status and no code is not', null, null, false],
  ] as const)('%s', (_label, status, code, expected) => {
    expect(new ScheduleFetchError('failed', status, code).isAuth).toBe(expected)
  })

  it('carries the message, status and code of the table that failed', async () => {
    const { client } = fakeClient({}, { table: 'flights', message: 'JWT expired', code: 'PGRST301', status: 401 })
    const err = await fetchSchedule(client, NOW).catch((e: unknown) => e)
    expect(err).toMatchObject({ name: 'ScheduleFetchError', message: 'JWT expired', status: 401, code: 'PGRST301' })
  })

  it('names the table when the error has no message, and keeps an unknown status and code as null', async () => {
    const { client } = fakeClient({}, { table: 'trips' })
    const err = await fetchSchedule(client, NOW).catch((e: unknown) => e)
    expect(err).toMatchObject({ message: 'trips failed', status: null, code: null })
  })
})
