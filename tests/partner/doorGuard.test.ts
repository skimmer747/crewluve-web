import { describe, expect, it, vi } from 'vitest'
import { SUPABASE_URL } from '../../src/cloud'
import { DOOR_RPCS, DoorGuardError, doorFetch } from '../../src/partner/doorGuard'

const HOST = SUPABASE_URL

function guard() {
  const response = new Response('{}', { status: 200 })
  const base = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response)
  return { base, response, guarded: doorFetch(base as unknown as typeof fetch) }
}

/** Everything but a POST to one of the four, by the way it would reach past the partner door. */
const BLOCKED: Array<[string, string]> = [
  // one of the four, but not as a POST
  ['GET', '/rest/v1/rpc/partner_view'],
  ['PATCH', '/rest/v1/rpc/partner_join'],
  // every other RPC, the pilot's own included
  ['POST', '/rest/v1/rpc/partner_create'],
  ['POST', '/rest/v1/rpc/partner_handoff_create'],
  ['POST', '/rest/v1/rpc/partner_set_push'],
  ['POST', '/rest/v1/rpc/set_partner_status'],
  ['POST', '/rest/v1/rpc/delete_everything'],
  // tables, sign-in and the other services
  ['GET', '/rest/v1/trips?select=id'],
  ['POST', '/rest/v1/partner_devices'],
  ['GET', '/auth/v1/user'],
  ['POST', '/auth/v1/token?grant_type=password'],
  ['POST', '/functions/v1/partner-push'],
  ['GET', '/storage/v1/object/public/bucket/file.png'],
  // close to one of the four
  ['POST', '/rest/v1/rpc/partner_view/'],
  ['POST', '/rest/v1/rpc/partner_views'],
  ['POST', '/rest/v1/rpc/PARTNER_VIEW'],
  ['POST', '/rest/v1/rpc/partner_view?select=status'],
  ['POST', '/rest/v1/rpc/../rpc/partner_create'], // dot segments are resolved before the path is checked
  ['POST', '/rest/v1/rpc/%2e%2e/partner_devices'],
  ['POST', '/'],
]

describe('doorFetch (piece 5a §9)', () => {
  it('has exactly the four partner RPCs', () => {
    expect([...DOOR_RPCS].sort()).toEqual(['partner_handoff_redeem', 'partner_join', 'partner_leave', 'partner_view'])
    expect(Object.isFrozen(DOOR_RPCS)).toBe(true)
  })

  it.each([...DOOR_RPCS])('lets a POST to %s through, with its own init', async (name) => {
    const { base, response, guarded } = guard()
    const init = { method: 'POST', body: '{}' }
    expect(await guarded(`${HOST}/rest/v1/rpc/${name}`, init)).toBe(response)
    expect(base).toHaveBeenCalledWith(`${HOST}/rest/v1/rpc/${name}`, init)
  })

  it('takes post in lower case, as fetch does', async () => {
    const { base, guarded } = guard()
    await guarded(`${HOST}/rest/v1/rpc/partner_view`, { method: 'post' })
    expect(base).toHaveBeenCalledTimes(1)
  })

  it.each(BLOCKED)('refuses %s %s without sending it', async (method, path) => {
    const { base, guarded } = guard()
    const err = await guarded(`${HOST}${path}`, { method }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('refuses a request with no method, which is a GET', async () => {
    const { base, guarded } = guard()
    await expect(guarded(`${HOST}/rest/v1/rpc/partner_view`)).rejects.toThrow(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('reads a URL object and a Request, and lets the init method win, as fetch does', async () => {
    const { base, guarded } = guard()
    await guarded(new URL(`${HOST}/rest/v1/rpc/partner_view`), { method: 'POST' })
    await guarded(new Request(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST', body: '{}' }))
    await expect(guarded(new Request(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST', body: '{}' }), { method: 'GET' })).rejects.toThrow(DoorGuardError)
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('refuses every other host, and a URL it cannot read', async () => {
    const { base, guarded } = guard()
    await expect(guarded('https://elsewhere.example.com/rest/v1/rpc/partner_view', { method: 'POST' })).rejects.toThrow(
      'Only the partner door: blocked POST https://elsewhere.example.com/rest/v1/rpc/partner_view',
    )
    await expect(guarded(`${HOST.replace('https:', 'http:')}/rest/v1/rpc/partner_view`, { method: 'POST' })).rejects.toThrow(DoorGuardError)
    await expect(guarded('http://[bad', { method: 'POST' })).rejects.toThrow(DoorGuardError)
    expect(base).not.toHaveBeenCalled()
  })

  it('names what it blocked without the query string, where a key could be', async () => {
    const { guarded } = guard()
    const err = (await guarded(`${HOST}/rest/v1/rpc/partner_view?p_key=secret`, { method: 'POST' }).catch((e: unknown) => e)) as Error
    expect(err.message).toBe('Only the partner door: blocked POST /rest/v1/rpc/partner_view (with a query string)')
  })

  it('refuses with a rejected promise, never a throw', async () => {
    const { guarded } = guard()
    let promise: Promise<Response> | undefined
    expect(() => {
      promise = guarded(`${HOST}/rest/v1/trips`, { method: 'GET' })
    }).not.toThrow()
    await expect(promise).rejects.toBeInstanceOf(DoorGuardError)
  })

  it('passes a failure of the real fetch through untouched', async () => {
    const down = new TypeError('Failed to fetch')
    const guarded = doorFetch((async () => {
      throw down
    }) as unknown as typeof fetch)
    await expect(guarded(`${HOST}/rest/v1/rpc/partner_view`, { method: 'POST' })).rejects.toBe(down)
  })

  it('sends the method it judged, read once', async () => {
    const { base, guarded } = guard()
    let reads = 0
    const init = {
      body: '{}',
      get method() {
        reads += 1
        return reads === 1 ? 'POST' : 'DELETE'
      },
    } as RequestInit
    await guarded(`${HOST}/rest/v1/rpc/partner_view`, init)
    expect(base.mock.calls[0][1]?.method).toBe('POST')
  })
})
