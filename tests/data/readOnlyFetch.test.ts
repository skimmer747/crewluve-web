import { describe, expect, it, vi } from 'vitest'
import { ReadOnlyError, readOnlyFetch } from '../../src/data/readOnlyFetch'
import { SUPABASE_URL } from '../../src/cloud'
import { COLUMNS } from '../../src/data/rows'

const HOST = SUPABASE_URL

function guard() {
  const response = new Response('{}', { status: 200 })
  const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response)
  return { base, response, guarded: readOnlyFetch(base as unknown as typeof fetch) }
}

/** Requests the site makes: database reads, who-am-I, password sign-in and token refresh, and a local sign-out. */
const ALLOWED: Array<[string, string]> = [
  ['GET', '/rest/v1/trips?select=id&deleted_at=is.null'],
  ['HEAD', '/rest/v1/flights?select=id'],
  ['get', '/rest/v1/trips'], // fetch accepts any case
  ['GET', '/auth/v1/user'],
  ['POST', '/auth/v1/token?grant_type=password'],
  ['POST', '/auth/v1/token?grant_type=refresh_token'],
  ['POST', '/auth/v1/logout?scope=local'],
]

/** Everything else, by the way it would change CrewLu Cloud or reach past the database. */
const BLOCKED: Array<[string, string]> = [
  // writes to the database
  ['POST', '/rest/v1/trips'],
  ['PATCH', '/rest/v1/trips?id=eq.1'],
  ['patch', '/rest/v1/trips?id=eq.1'], // fetch leaves "patch" in lower case
  ['PUT', '/rest/v1/trips?id=eq.1'],
  ['DELETE', '/rest/v1/trips?id=eq.1'],
  ['POST', '/rest/v1/rpc/delete_everything'],
  ['OPTIONS', '/rest/v1/trips'],
  // other services, whatever the method
  ['GET', '/functions/v1/hello'],
  ['POST', '/functions/v1/hello'],
  ['GET', '/storage/v1/object/public/bucket/file.png'],
  ['POST', '/storage/v1/object/bucket/file.png'],
  ['POST', '/storage/v1/object/list/bucket'],
  ['GET', '/realtime/v1/api/broadcast'],
  ['POST', '/realtime/v1/api/broadcast'],
  // changes to the pilot's account
  ['PUT', '/auth/v1/user'],
  ['PATCH', '/auth/v1/user'],
  ['DELETE', '/auth/v1/user'],
  ['POST', '/auth/v1/signup'],
  ['POST', '/auth/v1/otp'],
  ['POST', '/auth/v1/recover'],
  ['POST', '/auth/v1/verify'],
  ['POST', '/auth/v1/resend'],
  ['POST', '/auth/v1/admin/users'],
  ['HEAD', '/auth/v1/user'], // only a GET is allowed under /auth/v1/
  // only token and logout may be POSTed, and only at exactly those paths
  ['POST', '/auth/v1/token/'],
  ['POST', '/auth/v1/tokens'],
  ['POST', '/auth/v1/logout/everywhere'],
  // a sign-out must say scope=local: the server's default ends every session of the account, the pilot's iPhone included
  ['POST', '/auth/v1/logout'],
  ['POST', '/auth/v1/logout?scope=global'],
  ['POST', '/auth/v1/logout?scope=others'],
  ['POST', '/auth/v1/logout?scope=LOCAL'],
  ['POST', '/auth/v1/logout?SCOPE=local'],
  ['POST', '/auth/v1/logout?scope='],
  // paths that look close to an allowed one
  ['GET', '/rest/v1'],
  ['GET', '/rest/v10/trips'],
  ['GET', '//rest/v1/trips'],
  ['GET', '/REST/v1/trips'],
  ['GET', '/auth/v1x/user'],
  ['GET', '/rest/v1/../functions/v1/hello'], // dot segments are resolved before the path is checked
  ['GET', '/rest/v1/%2e%2e/functions/v1/hello'],
  ['GET', '/rest/v1/./../../storage/v1/object/list/bucket'],
  ['GET', '/'],
  ['GET', '/something/else'],
]

describe('readOnlyFetch', () => {
  it.each(ALLOWED)('lets through %s %s', async (method, path) => {
    const { base, response, guarded } = guard()
    const init = { method }
    expect(await guarded(`${HOST}${path}`, init)).toBe(response)
    expect(base).toHaveBeenCalledTimes(1)
    expect(base.mock.calls[0][0]).toBe(`${HOST}${path}`)
    expect(base.mock.calls[0][1]).toBe(init)
  })

  it.each(BLOCKED)('refuses %s %s without sending it', async (method, path) => {
    const { base, guarded } = guard()
    const err = await guarded(`${HOST}${path}`, { method }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ReadOnlyError)
    expect((err as Error).message).toMatch(/read-only/)
    expect(base).not.toHaveBeenCalled()
  })

  it('treats a request with no method as a GET', async () => {
    const { base, guarded } = guard()
    await guarded(`${HOST}/rest/v1/trips`)
    await expect(guarded(`${HOST}/functions/v1/hello`)).rejects.toThrow(ReadOnlyError)
    expect(base).toHaveBeenCalledTimes(1)
  })

  describe('request inputs', () => {
    it('reads a URL object', async () => {
      const { base, guarded } = guard()
      await guarded(new URL(`${HOST}/rest/v1/trips`))
      await expect(guarded(new URL(`${HOST}/rest/v1/trips`), { method: 'DELETE' })).rejects.toThrow(/read-only/)
      await expect(guarded(new URL(`${HOST}/functions/v1/hello`))).rejects.toThrow(/read-only/)
      expect(base).toHaveBeenCalledTimes(1)
    })

    it('reads the method and URL of a Request', async () => {
      const { base, guarded } = guard()
      await guarded(new Request(`${HOST}/rest/v1/trips`))
      await guarded(new Request(`${HOST}/rest/v1/trips`, { method: 'HEAD' }))
      await expect(guarded(new Request(`${HOST}/rest/v1/trips`, { method: 'PATCH', body: '{}' }))).rejects.toThrow(/read-only/)
      await expect(guarded(new Request(`${HOST}/rest/v1/trips`, { method: 'POST', body: '{}' }))).rejects.toThrow(/read-only/)
      await expect(guarded(new Request(`${HOST}/functions/v1/hello`))).rejects.toThrow(/read-only/)
      expect(base).toHaveBeenCalledTimes(2)
    })

    it('lets the init method override the Request method, as fetch does', async () => {
      const { base, guarded } = guard()
      await expect(guarded(new Request(`${HOST}/rest/v1/trips`), { method: 'DELETE' })).rejects.toThrow(/read-only/)
      expect(base).not.toHaveBeenCalled()
      await guarded(new Request(`${HOST}/rest/v1/trips`, { method: 'HEAD' }), { method: 'GET' })
      expect(base).toHaveBeenCalledTimes(1)
    })

    it('refuses a URL it cannot read, rather than letting it through', async () => {
      const { base, guarded } = guard()
      await expect(guarded('http://')).rejects.toThrow(/read-only/)
      await expect(guarded('http://[bad')).rejects.toThrow(/read-only/)
      expect(base).not.toHaveBeenCalled()
    })
  })

  describe('the refusal', () => {
    it('is a rejected promise, never a throw, so promise chains and try/await both see it', async () => {
      const { guarded } = guard()
      let promise: Promise<Response> | undefined
      expect(() => { promise = guarded(`${HOST}/rest/v1/trips`, { method: 'POST' }) }).not.toThrow()
      await expect(promise).rejects.toBeInstanceOf(ReadOnlyError)
    })

    it('says the site is read-only and names what it blocked', async () => {
      const { guarded } = guard()
      const err = (await guarded(`${HOST}/rest/v1/trips`, { method: 'PATCH' }).catch((e: unknown) => e)) as ReadOnlyError
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('ReadOnlyError')
      expect(err.message).toBe('This site is read-only: blocked PATCH /rest/v1/trips')
    })

    it('keeps query strings out of the message, so filters and tokens never reach a log', async () => {
      const { guarded } = guard()
      const err = (await guarded(`${HOST}/rest/v1/trips?id=eq.secret-id&apikey=secret-key`, { method: 'DELETE' }).catch((e: unknown) => e)) as Error
      expect(err.message).not.toMatch(/secret/)
    })

    it('says why a sign-out was blocked', async () => {
      const { guarded } = guard()
      const global = (await guarded(`${HOST}/auth/v1/logout?scope=global`, { method: 'POST' }).catch((e: unknown) => e)) as Error
      expect(global.message).toMatch(/scope global/)
      expect(global.message).toMatch(/local/)
      const missing = (await guarded(`${HOST}/auth/v1/logout`, { method: 'POST' }).catch((e: unknown) => e)) as Error
      expect(missing.message).toMatch(/scope missing/)
    })
  })

  it('passes the response and any failure of the real fetch through untouched', async () => {
    const down = new TypeError('Failed to fetch')
    const guarded = readOnlyFetch((async () => { throw down }) as unknown as typeof fetch)
    await expect(guarded(`${HOST}/rest/v1/trips`)).rejects.toBe(down)
  })
})

describe('readOnlyFetch: only the schedule tables, only on CrewLu Cloud', () => {
  it.each(Object.keys(COLUMNS))('lets a read of %s through', async (table) => {
    const { base, guarded } = guard()
    await guarded(`${HOST}/rest/v1/${table}?select=id`)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it.each(['hotels', 'crew_members', 'pilot_personal_infos', 'catering_photos', 'profiles'])('refuses a read of %s, which the site never needs', async (table) => {
    const { base, guarded } = guard()
    await expect(guarded(`${HOST}/rest/v1/${table}?select=*`)).rejects.toThrow(ReadOnlyError)
    expect(base).not.toHaveBeenCalled()
  })

  it('refuses database functions, even read-only ones', async () => {
    const { base, guarded } = guard()
    await expect(guarded(`${HOST}/rest/v1/rpc/anything?x=1`)).rejects.toThrow(ReadOnlyError)
    expect(base).not.toHaveBeenCalled()
  })

  it('refuses every other host, and names it in the reason', async () => {
    const { base, guarded } = guard()
    await expect(guarded('https://elsewhere.example.com/rest/v1/trips?select=id')).rejects.toThrow(
      'This site is read-only: blocked GET https://elsewhere.example.com/rest/v1/trips',
    )
    await expect(guarded(`${HOST.replace('https:', 'http:')}/rest/v1/trips`)).rejects.toThrow(ReadOnlyError)
    expect(base).not.toHaveBeenCalled()
  })
})
