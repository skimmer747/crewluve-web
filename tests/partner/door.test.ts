import { describe, expect, it, vi } from 'vitest'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../../src/cloud'
import { DoorUnavailable, isRefused, makeDoor } from '../../src/partner/door'
import { key, PARTNER_A } from '../fixtures/partner'

const AT = '2026-10-26T17:36:00.123+00:00'

/** A door over a fake fetch that answers `body` with `status`, and keeps what was sent. */
function doorAnswering(body: unknown, status = 200) {
  const send = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status }))
  return { send, door: makeDoor(send as unknown as typeof fetch) }
}

/** The first request a door sent: where, how, and its body as an object. */
function sent(send: ReturnType<typeof doorAnswering>['send']) {
  const [url, init] = send.mock.calls[0]
  return { url, method: init?.method, headers: init?.headers, body: JSON.parse(String(init?.body)) }
}

describe('the partner door (piece 5a §9)', () => {
  it('joins as a web device, with the publishable key', async () => {
    const { send, door } = doorAnswering({ device_id: 'd1', partner_id: PARTNER_A })
    expect(await door.join('invite-a', key(1), 'Chrome on Mac')).toEqual({ deviceId: 'd1', partnerId: PARTNER_A })
    expect(sent(send)).toEqual({
      url: `${SUPABASE_URL}/rest/v1/rpc/partner_join`,
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: { p_invite: 'invite-a', p_device_key: key(1), p_kind: 'web', p_label: 'Chrome on Mac' },
    })
  })

  it('redeems a code the same way', async () => {
    const { send, door } = doorAnswering({ device_id: 'd1', partner_id: PARTNER_A })
    await door.redeem('AB2C3D', key(1), '')
    expect(sent(send)).toMatchObject({
      url: `${SUPABASE_URL}/rest/v1/rpc/partner_handoff_redeem`,
      body: { p_token: 'AB2C3D', p_device_key: key(1), p_kind: 'web', p_label: '' },
    })
  })

  it("hands the door's refusals back as answers", async () => {
    const answer = await doorAnswering({ error: 'key_in_use' }).door.join('invite-a', key(1), '')
    expect(answer).toEqual({ error: 'key_in_use' })
    expect(isRefused(answer)).toBe(true)
  })

  it('asks for everything with no since, and only for a change with one', async () => {
    const first = doorAnswering({ partner_id: PARTNER_A, updated_at: AT, status: { schemaVersion: 1 } })
    expect(await first.door.view(key(1), null)).toEqual({ partnerId: PARTNER_A, updatedAt: AT, unchanged: false, status: { schemaVersion: 1 } })
    expect(sent(first.send).body).toEqual({ p_key: key(1) })
    const again = doorAnswering({ partner_id: PARTNER_A, updated_at: AT, unchanged: true })
    expect(await again.door.view(key(1), AT)).toEqual({ partnerId: PARTNER_A, updatedAt: AT, unchanged: true })
    expect(sent(again.send).body).toEqual({ p_key: key(1), p_since: AT })
  })

  it("reads the answer from before the pilot's first summary", async () => {
    const { door } = doorAnswering({ partner_id: PARTNER_A, updated_at: null, status: null })
    expect(await door.view(key(1), null)).toEqual({ partnerId: PARTNER_A, updatedAt: null, unchanged: false, status: null })
  })

  it('leaves', async () => {
    const { send, door } = doorAnswering({ ok: true })
    await door.leave(key(1))
    expect(sent(send)).toMatchObject({ url: `${SUPABASE_URL}/rest/v1/rpc/partner_leave`, body: { p_key: key(1) } })
  })

  it('throws DoorUnavailable for an HTTP error, or an answer it cannot read', async () => {
    await expect(doorAnswering({ message: 'boom' }, 500).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering([1, 2]).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering({ updated_at: null }).door.view(key(1), null)).rejects.toThrow(DoorUnavailable)
    await expect(doorAnswering({ ok: true }).door.join('invite-a', key(1), '')).rejects.toThrow(DoorUnavailable)
  })

  it('passes no answer at all through, as fetch failed', async () => {
    const door = makeDoor((async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch)
    await expect(door.view(key(1), null)).rejects.toThrow('Failed to fetch')
  })
})
