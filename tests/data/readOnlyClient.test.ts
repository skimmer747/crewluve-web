import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { fetchSchedule, ScheduleFetchError } from '../../src/data/fetchSchedule'
import { readOnlyFetch } from '../../src/data/readOnlyFetch'
import { COLUMNS } from '../../src/data/rows'
import { SUPABASE_URL } from '../../src/cloud'

// A real supabase-js client talking to a fake network through readOnlyFetch, the same way src/supabase.ts builds it.
// The project below is made up and nothing here can reach CrewLu Cloud.
const BASE = SUPABASE_URL
const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 9, 12)
const iso = (ms: number) => new Date(ms).toISOString()

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const SESSION = {
  access_token: 'header.payload.signature',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4_000_000_000, // 2096: never expires during a test
  refresh_token: 'refresh-token',
  user: { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'pilot@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
}

interface Sent { method: string; path: string; params: URLSearchParams }

/** Answers the few requests the site makes and records everything that arrives. Anything else gets a 500. */
function fakeNetwork(rows: (table: string, params: URLSearchParams) => unknown[] = () => []) {
  const sent: Sent[] = []
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method ?? 'GET').toUpperCase()
    sent.push({ method, path: url.pathname, params: url.searchParams })
    if (method === 'POST' && url.pathname === '/auth/v1/token') return json(SESSION)
    if (method === 'POST' && url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 })
    if (method === 'GET' && url.pathname.startsWith('/rest/v1/')) return json(rows(url.pathname.slice('/rest/v1/'.length), url.searchParams))
    return json({ message: 'the fake serves nothing else' }, 500)
  }) as typeof fetch
  return { fetchImpl, sent }
}

const options = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }

function clientOver(fetchImpl: typeof fetch): SupabaseClient {
  return createClient(BASE, 'sb_publishable_not_a_real_key', { auth: options, global: { fetch: readOnlyFetch(fetchImpl) } })
}

async function signedInClient() {
  const net = fakeNetwork()
  const client = clientOver(net.fetchImpl)
  const { data, error } = await client.auth.signInWithPassword({ email: 'pilot@example.com', password: 'a-test-password' })
  expect(error).toBeNull()
  expect(data.session?.access_token).toBe(SESSION.access_token)
  return { client, sent: net.sent }
}

/** Where an error puts the reason: its own message, or the error it wraps (functions and storage wrap the cause). */
function errorText(error: unknown): string {
  const e = error as { message?: string; context?: { message?: string }; originalError?: { message?: string } } | null
  return [e?.message, e?.context?.message, e?.originalError?.message].filter(Boolean).join(' | ')
}

const request = (s: Sent) => `${s.method} ${s.path}`

describe('a real Supabase client over readOnlyFetch', () => {
  it('lets a select and a password sign-in through', async () => {
    const net = fakeNetwork(() => [{ id: 't1' }])
    const client = clientOver(net.fetchImpl)
    const signIn = await client.auth.signInWithPassword({ email: 'pilot@example.com', password: 'a-test-password' })
    expect(signIn.error).toBeNull()
    expect(await client.from('trips').select('id')).toMatchObject({ data: [{ id: 't1' }], error: null })
    expect(net.sent.map(request)).toEqual(['POST /auth/v1/token', 'GET /rest/v1/trips'])
    expect(net.sent[0].params.get('grant_type')).toBe('password')
  })

  it('lets a sign-out of this browser through', async () => {
    const { client, sent } = await signedInClient()
    expect(await client.auth.signOut({ scope: 'local' })).toEqual({ error: null })
    expect(sent.map(request)).toEqual(['POST /auth/v1/token', 'POST /auth/v1/logout'])
    expect(sent[1].params.get('scope')).toBe('local')
  })

  // The ways to change CrewLu Cloud, or the pilot's account, that a code review found open to the first guard.
  const WRITES: Array<[string, (c: SupabaseClient) => PromiseLike<unknown>]> = [
    ['insert', (c) => c.from('trips').insert({ id: 'x' })],
    ['update', (c) => c.from('trips').update({ days: 9 }).eq('id', 'x')],
    ['upsert', (c) => c.from('trips').upsert({ id: 'x' })],
    ['delete', (c) => c.from('trips').delete().eq('id', 'x')],
    ['rpc', (c) => c.rpc('delete_everything')],
    ['functions.invoke', (c) => c.functions.invoke('anything')],
    ['storage upload', (c) => c.storage.from('bucket').upload('a.txt', new Blob(['x']))],
    ['storage list', (c) => c.storage.from('bucket').list()],
    ['auth.updateUser', (c) => c.auth.updateUser({ data: { first_name: 'X' } })],
    ['auth.updateUser (password)', (c) => c.auth.updateUser({ password: 'a-new-password' })],
    ['auth.signUp', (c) => c.auth.signUp({ email: 'new@example.com', password: 'a-test-password' })],
    ['auth.resetPasswordForEmail', (c) => c.auth.resetPasswordForEmail('pilot@example.com')],
    ['auth.signInWithOtp', (c) => c.auth.signInWithOtp({ email: 'pilot@example.com' })],
    // signOut() defaults to scope "global", which ends every session of the account, the pilot's iPhone included.
    ['auth.signOut() with the default scope', (c) => c.auth.signOut()],
    ["auth.signOut({ scope: 'global' })", (c) => c.auth.signOut({ scope: 'global' })],
    ["auth.signOut({ scope: 'others' })", (c) => c.auth.signOut({ scope: 'others' })],
  ]

  it.each(WRITES)('refuses %s before it reaches the network', async (_label, attempt) => {
    const { client, sent } = await signedInClient()
    const before = sent.length
    const result = (await attempt(client)) as { error?: unknown }
    expect(sent).toHaveLength(before)
    expect(result.error).toBeTruthy()
    expect(errorText(result.error)).toMatch(/read-only/)
  })

  it('control: without the wrapper, the same writes do reach the network', async () => {
    const net = fakeNetwork()
    const bare = createClient(BASE, 'sb_publishable_not_a_real_key', { auth: options, global: { fetch: net.fetchImpl } })
    await bare.auth.signInWithPassword({ email: 'pilot@example.com', password: 'a-test-password' })
    await bare.from('trips').insert({ id: 'x' })
    await bare.auth.updateUser({ data: { first_name: 'X' } })
    await bare.auth.signOut()
    expect(net.sent.map(request)).toEqual(['POST /auth/v1/token', 'POST /rest/v1/trips', 'PUT /auth/v1/user', 'POST /auth/v1/logout'])
    expect(net.sent[3].params.get('scope')).toBe('global')
  })

  describe('fetchSchedule over the real client', () => {
    it('sends nothing but GET select queries, one per table in spec §6.1', async () => {
      const net = fakeNetwork()
      await fetchSchedule(clientOver(net.fetchImpl), NOW)
      expect(new Set(net.sent.map((s) => s.method))).toEqual(new Set(['GET']))
      expect(net.sent.map((s) => s.path.replace('/rest/v1/', '')).sort()).toEqual(Object.keys(COLUMNS).sort())
    })

    // The query string each table is read with, as it goes over the wire.
    const from = iso(NOW - 60 * DAY)
    const to = iso(NOW + 120 * DAY)
    const WIRE: Record<keyof typeof COLUMNS, Array<[string, string]>> = {
      pilot_infos: [],
      trips: [['end_date', `gte.${from}`], ['start_date', `lte.${to}`]],
      duty_periods: [['start_time', `gte.${from}`], ['start_time', `lte.${to}`]],
      flights: [['hidden_from_timeline', 'not.is.true'], ['scheduled_block_out_time', `gte.${from}`], ['scheduled_block_out_time', `lte.${to}`]],
      commutes: [['hidden_from_timeline', 'not.is.true'], ['arrival_time_zulu', `gte.${from}`], ['departure_time_zulu', `lte.${to}`]],
      jumpseats: [['hidden_from_timeline', 'not.is.true'], ['arrival_time_zulu', `gte.${from}`], ['departure_time_zulu', `lte.${to}`]],
      training_events: [['hidden_from_timeline', 'not.is.true'], ['end_time_utc', `gte.${from}`], ['start_time_utc', `lte.${to}`]],
      manual_events: [['hidden_from_timeline', 'not.is.true'], ['end_time_utc', `gte.${from}`], ['start_time_utc', `lte.${to}`]],
      event_categories: [],
    }

    it.each(Object.entries(WIRE))('reads %s with exactly its spec filters', async (table, filters) => {
      const net = fakeNetwork()
      await fetchSchedule(clientOver(net.fetchImpl), NOW)
      const sent = net.sent.find((s) => s.path === `/rest/v1/${table}`)!
      const expected: Array<[string, string]> = [
        ['select', COLUMNS[table as keyof typeof COLUMNS]],
        ['deleted_at', 'is.null'],
        ['order', 'id.asc'],
        ['offset', '0'],
        ['limit', '1000'],
        ...filters,
      ]
      expect([...sent.params.entries()].sort()).toEqual(expected.sort())
    })

    it('asks for another page after a full one, and stops at a short one', async () => {
      const thousand = Array.from({ length: 1000 }, (_, i) => ({ id: `f${i}`, updated_at: '2026-10-01T00:00:00Z' }))
      const net = fakeNetwork((table, params) => (table === 'flights' && params.get('offset') === '0' ? thousand : []))
      const raw = await fetchSchedule(clientOver(net.fetchImpl), NOW)
      expect(raw.flights).toHaveLength(1000)
      expect(net.sent.filter((s) => s.path === '/rest/v1/flights').map((s) => s.params.get('offset'))).toEqual(['0', '1000'])
    })

    it('reports an expired session as an auth failure', async () => {
      const expired = (async () => json({ code: 'PGRST303', message: 'JWT expired', details: null, hint: null }, 401)) as unknown as typeof fetch
      const err = await fetchSchedule(clientOver(expired), NOW).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(ScheduleFetchError)
      expect(err).toMatchObject({ status: 401, code: 'PGRST303', message: 'JWT expired', isAuth: true })
    })
  })
})
