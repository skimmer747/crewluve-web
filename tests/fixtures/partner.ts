import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Joined, PartnerDoor, Refused, Viewed } from '../../src/partner/door'
import type { KeyValueStore } from '../../src/partner/store'

export const PARTNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const PARTNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

/** CrewLu's nine example moments (tests/fixtures/partner-status/README.md). */
export const EXAMPLES = [
  'commuting-home', 'display-names', 'hidden-trip-left-out', 'home', 'in-flight', 'layover', 'quick-status-everyone',
  'quick-status-one-partner', 'turn',
] as const

/** One example summary, as partner_view gives it to partner A or B. A fresh copy each call, so a test can change it. */
export function example(name: string, partner: 'A' | 'B' = 'A'): Record<string, unknown> {
  // A path, not new URL(…, import.meta.url): under happy-dom, Vite rewrites that pattern as a web asset's address.
  return JSON.parse(readFileSync(join(import.meta.dirname, 'partner-status', `${name}.${partner}.json`), 'utf8'))
}

/** A device key that passes the door's rule, from a number: key(1) is 63 zeros and a 1. */
export const key = (n: number) => n.toString(16).padStart(64, '0')

/** The part of localStorage the store uses, in memory, with what it holds in `data`. */
export function memoryStorage(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => {
      data.set(name, value)
    },
    removeItem: (name) => {
      data.delete(name)
    },
  }
}

/** A partner's most devices (private.create_device). */
const MAX_DEVICES = 10

/**
 * An in-memory partner door with Crewlu Cloud's rules (partner-api.md, and private.create_device and
 * partner_handoff_redeem in the partner RPCs' migration):
 * - an invite or a code names a partner;
 * - a key is one partner's device: the same key with the same partner answers with the same device, and a key another
 *   partner's device has answers key_in_use;
 * - a partner has 10 devices at most, after which a new one answers too_many_devices;
 * - a code works once. The device that used it gets the same answer again with the same key, as after a lost answer,
 *   and any other key gets sharing_ended. key_in_use and too_many_devices leave the code unused. (Codes don't expire
 *   here, and failures don't pause redemption: no test needs a clock.)
 * - each partner's summary has an updated_at.
 *
 * Tests fill `invites`, `codes` and `summaries`, read `devices` (key → partner) and `calls`, and set `network.down`, or
 * `network.loseNext` to lose the next answer after its work is done.
 */
export function fakeDoor() {
  const invites = new Map<string, string>()
  const codes = new Map<string, string>()
  // The key of the device that used each code, once one has (partner_handoffs.used_by_device).
  const usedBy = new Map<string, string>()
  const summaries = new Map<string, { updatedAt: string; status: unknown }>()
  const devices = new Map<string, string>()
  const calls: string[] = []
  const network = { down: false, loseNext: false }
  const reach = () => {
    if (network.down) throw new TypeError('Failed to fetch')
  }
  const lose = () => {
    if (network.loseNext) {
      network.loseNext = false
      throw new TypeError('Failed to fetch')
    }
  }
  const device = (partner: string | undefined, key: string): Joined | Refused => {
    if (!partner) return { error: 'sharing_ended' }
    const has = devices.get(key)
    if (has && has !== partner) return { error: 'key_in_use' }
    if (!has && [...devices.values()].filter((p) => p === partner).length >= MAX_DEVICES) return { error: 'too_many_devices' }
    devices.set(key, partner)
    return { deviceId: `device-${key.slice(-4)}`, partnerId: partner }
  }
  const redeemed = (code: string, key: string): Joined | Refused => {
    const partner = codes.get(code)
    const user = usedBy.get(code)
    if (user !== undefined) {
      // Used: only the device that used it, still there, gets its answer again.
      return user === key && partner !== undefined && devices.get(key) === partner ? device(partner, key) : { error: 'sharing_ended' }
    }
    const answer = device(partner, key)
    if (!('error' in answer)) usedBy.set(code, key)
    return answer
  }
  const viewed = (key: string, since: string | null): Viewed | Refused => {
    const partner = devices.get(key)
    if (!partner) return { error: 'sharing_ended' }
    const summary = summaries.get(partner)
    if (!summary) return { partnerId: partner, updatedAt: null, unchanged: false, status: null }
    if (since != null && summary.updatedAt <= since) return { partnerId: partner, updatedAt: summary.updatedAt, unchanged: true }
    return { partnerId: partner, updatedAt: summary.updatedAt, unchanged: false, status: summary.status }
  }
  const door: PartnerDoor = {
    async join(invite, key, label) {
      calls.push(`join ${invite} ${key} ${label}`)
      reach()
      const answer = device(invites.get(invite), key)
      lose()
      return answer
    },
    async redeem(code, key, label) {
      calls.push(`redeem ${code} ${key} ${label}`)
      reach()
      const answer = redeemed(code, key)
      lose()
      return answer
    },
    async view(key, since) {
      calls.push(`view ${key} ${since}`)
      reach()
      const answer = viewed(key, since)
      lose()
      return answer
    },
    async leave(key) {
      calls.push(`leave ${key}`)
      reach()
      devices.delete(key)
      lose()
    },
  }
  return { door, invites, codes, summaries, devices, calls, network }
}
