import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../cloud'
import { doorFetch } from './doorGuard'
import { readLiveAnswer, type LiveAnswer } from './liveAnswer'

/** The door's own failures, which it answers with HTTP 200 (partner-api.md, "Answers"). */
export interface Refused {
  error: string
}

export interface Joined {
  deviceId: string
  partnerId: string
}

/** partner_view's answer: the summary (null before the pilot's first), or that it's unchanged since `p_since`. */
export type Viewed =
  | { partnerId: string; updatedAt: string | null; unchanged: false; status: unknown }
  | { partnerId: string; updatedAt: string | null; unchanged: true }

/** Four of the partner RPCs the website calls (piece 5a §9). It redeems hand-off codes but never makes them (P5-4). */
export interface PartnerDoor {
  join(invite: string, key: string, label: string): Promise<Joined | Refused>
  redeem(code: string, key: string, label: string): Promise<Joined | Refused>
  view(key: string, since: string | null): Promise<Viewed | Refused>
  /** The door always answers {"ok": true}; this rejects only when there's no answer. */
  leave(key: string): Promise<void>
}

/**
 * The fifth, partner_live: the pilot's flights with live data (Stage 3 spec §10.6, partner-api.md "The live plane"). It's
 * apart from PartnerDoor, as the app's LiveFlightDoor is, so the doors made for the other four needn't answer it.
 */
export interface LiveFlightDoor {
  /** `after` is the last answer's cursor, so only the trail points since then come, or null for every point. */
  live(key: string, after: number | null): Promise<LiveAnswer | Refused>
}

/**
 * An answer this site can't use: an HTTP error, or a body that isn't an object. No answer at all rejects with fetch's
 * own error instead: a TypeError when offline, a TimeoutError past the time limit.
 */
export class DoorUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DoorUnavailable'
  }
}

export const isRefused = (answer: object): answer is Refused => typeof (answer as { error?: unknown }).error === 'string'

/** How long a call may take before it counts as no answer, so "Connecting…" never waits for good. */
const TIMEOUT_MS = 20_000

/** A signal that aborts after `ms`: AbortSignal.timeout where the browser has it, else a timer (Safari before 16). */
function timeLimit(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms)
  return controller.signal
}

/**
 * The partner door over `send` (~/Dev/Duty/supabase/partner-api.md, "Partner RPCs"), with the publishable key alone.
 * This is the only module that talks to Crewlu Cloud, and every call goes through the door guard.
 */
export function makeDoor(send: typeof fetch): PartnerDoor & LiveFlightDoor {
  const guarded = doorFetch(send)

  async function call(name: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await guarded(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: timeLimit(TIMEOUT_MS),
      // The five RPCs never redirect; refusing one keeps a key from being sent on to another address.
      redirect: 'error',
    })
    if (!response.ok) throw new DoorUnavailable(`${name} answered HTTP ${response.status}`)
    const answer: unknown = await response.json().catch(() => null)
    if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) throw new DoorUnavailable(`${name} answered with no object`)
    return answer as Record<string, unknown>
  }

  async function joined(name: string, body: Record<string, unknown>): Promise<Joined | Refused> {
    const answer = await call(name, body)
    if (isRefused(answer)) return { error: answer.error }
    if (typeof answer.device_id !== 'string' || typeof answer.partner_id !== 'string') throw new DoorUnavailable(`${name} answered with no device`)
    return { deviceId: answer.device_id, partnerId: answer.partner_id }
  }

  return {
    join: (invite, key, label) => joined('partner_join', { p_invite: invite, p_device_key: key, p_kind: 'web', p_label: label }),
    redeem: (code, key, label) => joined('partner_handoff_redeem', { p_token: code, p_device_key: key, p_kind: 'web', p_label: label }),
    async view(key, since) {
      const answer = await call('partner_view', since == null ? { p_key: key } : { p_key: key, p_since: since })
      if (isRefused(answer)) return { error: answer.error }
      const partnerId = answer.partner_id
      const updatedAt = answer.updated_at ?? null
      if (typeof partnerId !== 'string' || (updatedAt !== null && typeof updatedAt !== 'string')) {
        throw new DoorUnavailable('partner_view answered with no partner')
      }
      if (answer.unchanged === true) return { partnerId, updatedAt, unchanged: true }
      return { partnerId, updatedAt, unchanged: false, status: answer.status ?? null }
    },
    async leave(key) {
      await call('partner_leave', { p_key: key })
    },
    async live(key, after) {
      const answer = await call('partner_live', after == null ? { p_key: key } : { p_key: key, p_after: after })
      if (isRefused(answer)) return { error: answer.error }
      const read = readLiveAnswer(answer)
      if (!read) throw new DoorUnavailable('partner_live answered with flights it could not read')
      return read
    },
  }
}

/** The door over the page's fetch, looked up per call rather than captured now. */
export const liveDoor: PartnerDoor & LiveFlightDoor = makeDoor((input, init) => fetch(input, init))
