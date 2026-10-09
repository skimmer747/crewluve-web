// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasLiveSession, hasSession, hasStoredSession, onSignedOut, signIn, signOut } from '../../src/auth/session'
import { AUTH_STORAGE_KEY, SUPABASE_URL } from '../../src/cloud'

// The real session.ts, the real src/supabase.ts and the real supabase-js, in a browser-like page. Only the page's
// fetch is replaced, by a fake CrewLu Cloud: nothing here can reach the real project.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const SESSION = {
  access_token: 'header.payload.signature',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4_000_000_000, // 2096
  refresh_token: 'refresh-token',
  user: { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'pilot@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
}

interface Sent { method: string; url: URL; headers: Headers; body: unknown }
let sent: Sent[]
let serverDown: boolean

beforeEach(() => {
  sent = []
  serverDown = false
  localStorage.clear()
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : null
    sent.push({ method, url, headers: new Headers(init?.headers), body })
    if (serverDown) throw new TypeError('Failed to fetch')
    if (method === 'POST' && url.pathname === '/auth/v1/token') {
      return (body as { password?: string }).password === 'a-test-password'
        ? json(SESSION)
        : json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
    }
    if (method === 'POST' && url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 })
    return json({ message: 'the fake serves nothing else' }, 500)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const requests = () => sent.map((s) => `${s.method} ${s.url.pathname}`)

describe('signing in and out through the real client', () => {
  it('starts signed out, with no request to anyone', async () => {
    expect(hasStoredSession()).toBe(false)
    expect(await hasLiveSession()).toBe(false)
    expect(await hasSession()).toBe(false)
    expect(sent).toEqual([])
  })

  it('stores the session where hasStoredSession looks, and signs out of this browser only', async () => {
    expect(await signIn('pilot@example.com', 'a-test-password')).toBeNull()
    expect(requests()).toEqual(['POST /auth/v1/token'])
    expect(sent[0].url.origin).toBe(SUPABASE_URL)
    expect(sent[0].url.searchParams.get('grant_type')).toBe('password')
    expect(sent[0].body).toMatchObject({ email: 'pilot@example.com', password: 'a-test-password' })

    // The key hasStoredSession reads is the key the client really wrote.
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!)).toMatchObject({ access_token: SESSION.access_token })
    expect(hasStoredSession()).toBe(true)
    expect(await hasLiveSession()).toBe(true)
    expect(await hasSession()).toBe(true)
    expect(requests()).toEqual(['POST /auth/v1/token']) // checking a fresh session needs no network

    await signOut()
    expect(requests()).toEqual(['POST /auth/v1/token', 'POST /auth/v1/logout'])
    expect(sent[1].url.searchParams.get('scope')).toBe('local') // 'global' would end the pilot's other sessions too
    expect(sent[1].headers.get('authorization')).toBe(`Bearer ${SESSION.access_token}`)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(hasStoredSession()).toBe(false)
    expect(await hasLiveSession()).toBe(false)
  })

  it('signs out of this browser even when the server cannot be reached', async () => {
    await signIn('pilot@example.com', 'a-test-password')
    expect(hasStoredSession()).toBe(true)
    serverDown = true
    await signOut()
    expect(hasStoredSession()).toBe(false)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('tells every listener when the visitor signs out, including ones registered before the client loaded', async () => {
    const heardA = vi.fn()
    const heardB = vi.fn()
    const offA = onSignedOut(heardA)
    const offB = onSignedOut(heardB) // started in the same tick as the first, before anything has loaded
    await signIn('pilot@example.com', 'a-test-password')
    await vi.dynamicImportSettled()
    expect(heardA).not.toHaveBeenCalled()
    await signOut()
    expect(heardA).toHaveBeenCalledTimes(1)
    expect(heardB).toHaveBeenCalledTimes(1)

    offB()
    await signIn('pilot@example.com', 'a-test-password')
    await signOut()
    expect(heardA).toHaveBeenCalledTimes(2)
    expect(heardB).toHaveBeenCalledTimes(1) // unsubscribed
    offA()
  })

  it('reports wrong credentials and an unreachable server for what they are', async () => {
    expect(await signIn('pilot@example.com', 'the-wrong-password')).toBe('credentials')
    expect(hasStoredSession()).toBe(false)
    serverDown = true
    expect(await signIn('pilot@example.com', 'a-test-password')).toBe('network')
    expect(hasStoredSession()).toBe(false)
  })
})

describe('the production client refuses to write', () => {
  it('turns away an insert, an account change and a global sign-out before they leave the page', async () => {
    await signIn('pilot@example.com', 'a-test-password')
    const { supabase } = await import('../../src/supabase')
    const before = sent.length
    const insert = await supabase.from('trips').insert({ id: 'x' })
    const update = await supabase.auth.updateUser({ data: { first_name: 'X' } })
    const global = await supabase.auth.signOut()
    expect(insert.error?.message).toMatch(/read-only/)
    expect(update.error?.message).toMatch(/read-only/)
    expect(global.error?.message).toMatch(/read-only/)
    expect(sent).toHaveLength(before)
  })
})
