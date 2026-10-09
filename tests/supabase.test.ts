import * as supabaseJs from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AUTH_STORAGE_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../src/cloud'

// createClient is replaced, so this checks how src/supabase.ts builds the client without building one.
const created = vi.hoisted(() => ({ calls: [] as unknown[][] }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    created.calls.push(args)
    return { isTheClient: true }
  },
  isAuthRetryableFetchError: (error: unknown) => (error as { name?: string } | null)?.name === 'AuthRetryableFetchError',
}))

interface Options {
  auth: Record<string, unknown>
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }
}

let mod: typeof import('../src/supabase')
beforeAll(async () => {
  mod = await import('../src/supabase')
})
afterEach(() => vi.unstubAllGlobals())

const options = () => created.calls[0][2] as Options

describe('the CrewLu Cloud client (src/supabase.ts)', () => {
  it('is built once, for the project in src/cloud.ts, and exported', () => {
    expect(created.calls).toHaveLength(1)
    expect(created.calls[0][0]).toBe(SUPABASE_URL)
    expect(created.calls[0][1]).toBe(SUPABASE_PUBLISHABLE_KEY)
    expect(mod.supabase).toEqual({ isTheClient: true })
  })

  it("keeps the session under 'crewluve-auth', the key session.ts reads to tell whether anyone is signed in", () => {
    expect(AUTH_STORAGE_KEY).toBe('crewluve-auth')
    expect(options().auth.storageKey).toBe(AUTH_STORAGE_KEY)
  })

  it('persists and refreshes the session, and ignores sign-in tokens in the URL (the site has no redirect sign-in)', () => {
    expect(options().auth).toEqual({ persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: AUTH_STORAGE_KEY })
  })

  it('re-exports isAuthRetryableFetchError, so session.ts never imports the package itself', () => {
    expect(mod.isAuthRetryableFetchError).toBe(supabaseJs.isAuthRetryableFetchError)
  })

  describe('the fetch it sends everything through', () => {
    it('refuses to send a write, and says the site is read-only', async () => {
      const real = vi.fn(async () => new Response('{}'))
      vi.stubGlobal('fetch', real)
      const guarded = options().global.fetch
      await expect(guarded(SUPABASE_URL + '/rest/v1/trips', { method: 'PATCH', body: '{}' })).rejects.toThrow(/read-only/)
      await expect(guarded(SUPABASE_URL + '/auth/v1/user', { method: 'PUT', body: '{}' })).rejects.toThrow(/read-only/)
      await expect(guarded(SUPABASE_URL + '/auth/v1/logout?scope=global', { method: 'POST' })).rejects.toThrow(/read-only/)
      expect(real).not.toHaveBeenCalled()
    })

    it("sends reads and sign-in through the page's fetch, looked up when the request is made", async () => {
      const guarded = options().global.fetch // taken before the page's fetch is replaced below
      const real = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('[]'))
      vi.stubGlobal('fetch', real)
      await guarded(SUPABASE_URL + '/rest/v1/trips?select=id')
      await guarded(SUPABASE_URL + '/auth/v1/token?grant_type=password', { method: 'POST', body: '{}' })
      expect(real.mock.calls.map(([url]) => url)).toEqual([
        SUPABASE_URL + '/rest/v1/trips?select=id',
        SUPABASE_URL + '/auth/v1/token?grant_type=password',
      ])
      expect(real.mock.calls[1][1]).toEqual({ method: 'POST', body: '{}' })
    })
  })
})
