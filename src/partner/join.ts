import { isRefused, type Joined, type PartnerDoor } from './door'
import type { PartnerLink } from './link'
import { COULDNT_CONNECT, joinMessage, type JoinMessage } from './messages'
import type { Device, PartnerStore } from './store'
import { readSummary } from './summary'

export type JoinOutcome =
  /** Following the link's pilot now. `newDevice` is false when the link was this browser's own device again. */
  | { kind: 'connected'; newDevice: boolean }
  /** The partner chose not to switch pilots. */
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: JoinMessage }

export interface JoinOptions {
  door: PartnerDoor
  store: PartnerStore
  /** This browser's name in the pilot's list (label.ts). */
  label: string
  /** "Switch to {newPilot}?": true to follow the link's pilot instead of {currentPilot}. It may answer later, as a dialog does. */
  confirmSwitch: (newPilot: string, currentPilot: string) => boolean | Promise<boolean>
  /** A new device key (store.ts's newKey). */
  makeKey: () => string
  /** The time, for when the summary was checked. */
  now?: () => number
}

/** The door refused the link or the code. */
class Refusal extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'Refusal'
  }
}

/** The key a join sent, and the door's answer. */
interface Attempt {
  key: string
  /** The key this browser is connected with, rather than the pending one. */
  isDeviceKey: boolean
  joined: Joined
}

/**
 * Joins with an invite link or a hand-off code (piece 5a §4.3), as Crewluve does (PartnerJoiner.swift and
 * CrewluCloudDevice.swift): with this browser's key, else the pending key, saved before it's sent, so trying again
 * after a lost answer gets the same device. The connected key changes only when the browser switches to the new device.
 * It never rejects: every failure is an outcome.
 */
export async function joinWithLink(link: PartnerLink, options: JoinOptions): Promise<JoinOutcome> {
  const { door, store, now = Date.now } = options
  const connected = store.device()
  const followed = connected ? store.summary() : null
  const followedSummary = followed?.status != null ? readSummary(followed.status, followed.partnerId) : null

  let attempt: Attempt
  try {
    attempt = await tryKeys(link, options, connected)
  } catch (err) {
    const refusal = err instanceof Refusal ? err.code : null
    return { kind: 'failed', message: joinMessage(refusal, link, followedSummary?.name ?? null) }
  }
  if (attempt.isDeviceKey) {
    // This browser's own device again, from tapping its own link twice: nothing changes.
    if (attempt.joined.partnerId === connected?.partnerId) return { kind: 'connected', newDevice: false }
    // The connected key now names a device of the link's partner, so this browser's old device is gone: the pilot
    // removed it. Carry on as a join with a pending key, so a retry reaches the same device, and nothing here goes on
    // naming the old one (spec §4.3, step 6).
    if (!store.savePendingKey(attempt.key)) return { kind: 'failed', message: COULDNT_CONNECT }
    store.forget()
  }

  let status: unknown
  let updatedAt: string | null
  try {
    const answer = await door.view(attempt.key, null)
    // Unchanged can't answer a read with no since; like a refusal, it's no answer.
    if (isRefused(answer) || answer.unchanged) return { kind: 'failed', message: COULDNT_CONNECT }
    status = answer.status
    updatedAt = answer.updatedAt
  } catch {
    return { kind: 'failed', message: COULDNT_CONNECT }
  }

  // Another pilot's link: ask first. Before the pilot's first summary there's no one to compare, so no question.
  const newSummary = status != null ? readSummary(status, attempt.joined.partnerId) : null
  // A summary this site can't read: Crewluve can't connect then either, since it can't tell whose status it is.
  if (status != null && !newSummary) return { kind: 'failed', message: COULDNT_CONNECT }
  if (newSummary && followedSummary && newSummary.pilotId.toLowerCase() !== followedSummary.pilotId.toLowerCase()) {
    if (!(await options.confirmSwitch(newSummary.name ?? 'your pilot', followedSummary.name ?? 'your pilot'))) {
      // The device the join made leaves, tried once, without waiting on it.
      void door.leave(attempt.key).catch(() => {})
      store.forgetPendingKey()
      return { kind: 'cancelled' }
    }
  }

  // Connect: the new key becomes this browser's, and the device it replaces, if one is still here, leaves, tried once.
  const replaced = store.device()
  if (!store.saveDevice({ key: attempt.key, partnerId: attempt.joined.partnerId })) return { kind: 'failed', message: COULDNT_CONNECT }
  store.forgetPendingKey()
  store.saveSummary({ partnerId: attempt.joined.partnerId, updatedAt, status, checkedAt: now() })
  if (replaced && replaced.key !== attempt.key) void door.leave(replaced.key).catch(() => {})
  return { kind: 'connected', newDevice: true }
}

/**
 * The join itself, as CrewluCloudDevice.join(_:label:) tries keys: this browser's key; if another person's device has
 * it, the pending key a join that didn't finish kept; if that's another person's too, a new pending key.
 */
async function tryKeys(link: PartnerLink, options: JoinOptions, connected: Device | null): Promise<Attempt> {
  if (connected) {
    try {
      return { key: connected.key, isDeviceKey: true, joined: await send(link, connected.key, options) }
    } catch (err) {
      if (!(err instanceof Refusal && err.code === 'key_in_use')) throw err
    }
  }
  try {
    const key = pendingKey(options, true)
    return { key, isDeviceKey: false, joined: await send(link, key, options) }
  } catch (err) {
    if (!(err instanceof Refusal && err.code === 'key_in_use')) throw err
    const key = pendingKey(options, false)
    return { key, isDeviceKey: false, joined: await send(link, key, options) }
  }
}

/** The pending key: the one kept from a join that didn't finish, when `reuse`, else a new one, saved before it's sent. */
function pendingKey({ store, makeKey }: JoinOptions, reuse: boolean): string {
  const kept = reuse ? store.pendingKey() : null
  if (kept) return kept
  const key = makeKey()
  if (!store.savePendingKey(key)) throw new Error('The new key could not be saved')
  return key
}

async function send(link: PartnerLink, key: string, { door, label }: JoinOptions): Promise<Joined> {
  const answer = link.kind === 'invite' ? await door.join(link.invite, key, label) : await door.redeem(link.code, key, label)
  if (isRefused(answer)) throw new Refusal(answer.error)
  return answer
}
