import { describe, expect, it, vi } from 'vitest'
import { joinWithLink, type JoinOptions } from '../../src/partner/join'
import type { PartnerLink } from '../../src/partner/link'
import { COULDNT_CONNECT } from '../../src/partner/messages'
import { localPartnerStore } from '../../src/partner/store'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

const SAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const INVITE_A: PartnerLink = { kind: 'invite', invite: 'invite-a' }
const INVITE_B: PartnerLink = { kind: 'invite', invite: 'invite-b' }
const INVITE_SAM: PartnerLink = { kind: 'invite', invite: 'invite-sam' }
const CODE_A: PartnerLink = { kind: 'code', code: 'AB2C3D' }

/** Crewlu Cloud and a new browser: partners A and B follow Alex, who is "Dad" to A; a third partner follows Sam. */
function setUp() {
  const f = fakeDoor()
  f.invites.set('invite-a', PARTNER_A).set('invite-b', PARTNER_B).set('invite-sam', SAM)
  f.codes.set('AB2C3D', PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('display-names', 'A') })
  f.summaries.set(PARTNER_B, { updatedAt: 'b1', status: example('home', 'B') })
  f.summaries.set(SAM, { updatedAt: 's1', status: { ...example('home'), pilotId: 'SAM-PILOT', pilotFirstName: 'Sam' } })
  const store = localPartnerStore(memoryStorage())
  const confirmSwitch = vi.fn((_newPilot: string, _currentPilot: string) => true)
  let made = 0
  const options: JoinOptions = { door: f.door, store, label: 'Chrome on Mac', confirmSwitch, makeKey: () => key(++made), now: () => 9 }
  return { f, store, confirmSwitch, options }
}

/** The same, with this browser already connected by partner A's link. */
async function connectedToA() {
  const s = setUp()
  await joinWithLink(INVITE_A, s.options)
  s.f.calls.length = 0
  return s
}

const last = (calls: string[]) => calls[calls.length - 1]

describe('joining, in a browser that follows no one (piece 5a §4.3)', () => {
  it('saves a new key as pending before sending it, then connects with it', async () => {
    const { f, store, options } = setUp()
    const join = f.door.join
    f.door.join = async (invite, k, label) => {
      expect(store.pendingKey()).toBe(k)
      return join(invite, k, label)
    }
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(store.pendingKey()).toBeNull()
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('display-names', 'A'), checkedAt: 9 })
    expect(f.calls).toEqual([`join invite-a ${key(1)} Chrome on Mac`, `view ${key(1)} null`])
  })

  it('redeems a code the same way', async () => {
    const { f, store, options } = setUp()
    expect(await joinWithLink(CODE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()?.partnerId).toBe(PARTNER_A)
    expect(f.calls[0]).toBe(`redeem AB2C3D ${key(1)} Chrome on Mac`)
  })

  it('keeps the key when the answer is lost, so trying again gets the same device', async () => {
    const { f, store, options } = setUp()
    f.network.loseNext = true
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.pendingKey()).toBe(key(1))
    expect(store.device()).toBeNull()
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(f.devices.size).toBe(1)
  })

  it("connects before the pilot's first summary, with no one to compare", async () => {
    const { f, store, options } = setUp()
    f.summaries.delete(PARTNER_A)
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.summary()).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 9 })
  })

  it('fails without calling the door when the new key cannot be saved', async () => {
    const { f, options } = setUp()
    expect(await joinWithLink(INVITE_A, { ...options, store: localPartnerStore(null) })).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(f.calls).toEqual([])
  })

  it("can't connect to a summary it can't read, as Crewluve can't, and keeps the pending key for the next try", async () => {
    const { f, store, options } = setUp()
    f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: { schemaVersion: 2 } })
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.device()).toBeNull()
    expect(store.pendingKey()).toBe(key(1))
  })
})

describe('joining, in a browser that follows a pilot', () => {
  it('changes nothing for its own link again', async () => {
    const { f, store, options } = await connectedToA()
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'connected', newDevice: false })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(f.calls).toEqual([`join invite-a ${key(1)} Chrome on Mac`])
  })

  it("moves to the same pilot's other partner without asking, and the old device leaves", async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    expect(await joinWithLink(INVITE_B, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(confirmSwitch).not.toHaveBeenCalled()
    expect(store.device()).toEqual({ key: key(2), partnerId: PARTNER_B })
    expect(f.calls).toEqual([
      `join invite-b ${key(1)} Chrome on Mac`, // A's device has this key: key_in_use
      `join invite-b ${key(2)} Chrome on Mac`,
      `view ${key(2)} null`,
      `leave ${key(1)}`,
    ])
  })

  it('asks before switching to another pilot, and switches on a yes', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(confirmSwitch).toHaveBeenCalledWith('Sam', 'Dad')
    expect(store.device()).toEqual({ key: key(2), partnerId: SAM })
    expect(last(f.calls)).toBe(`leave ${key(1)}`)
  })

  it('stays with its pilot on a no: the new device leaves, and the pending key is forgotten', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    confirmSwitch.mockReturnValue(false)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'cancelled' })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
    expect(store.pendingKey()).toBeNull()
    expect(f.devices.has(key(2))).toBe(false)
    expect(last(f.calls)).toBe(`leave ${key(2)}`)
  })

  it('forgets everything on a no when its own key made the new device, since the old one was already gone', async () => {
    const { f, store, options, confirmSwitch } = await connectedToA()
    f.devices.delete(key(1)) // the pilot removed this browser in CrewLu
    confirmSwitch.mockReturnValue(false)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'cancelled' })
    expect([store.device(), store.summary()]).toEqual([null, null])
    expect(f.calls).toEqual([`join invite-sam ${key(1)} Chrome on Mac`, `view ${key(1)} null`, `leave ${key(1)}`])
  })

  it("makes a new key when the kept pending key is another person's too", async () => {
    const { f, store, options } = await connectedToA()
    store.savePendingKey(key(7))
    f.devices.set(key(7), PARTNER_B)
    expect(await joinWithLink(INVITE_SAM, options)).toEqual({ kind: 'connected', newDevice: true })
    expect(store.device()).toEqual({ key: key(2), partnerId: SAM })
    expect(f.calls.slice(0, 3)).toEqual([
      `join invite-sam ${key(1)} Chrome on Mac`,
      `join invite-sam ${key(7)} Chrome on Mac`,
      `join invite-sam ${key(2)} Chrome on Mac`,
    ])
  })
})

describe('what a partner is told (piece 5a §4.4)', () => {
  it('says a dead invite link is dead', async () => {
    const { options } = setUp()
    expect(await joinWithLink({ kind: 'invite', invite: 'gone' }, options)).toEqual({
      kind: 'failed',
      message: { title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. Ask your pilot to send it again." },
    })
  })

  it('tells a connected browser it is still connected, and keeps its key', async () => {
    const { store, options } = await connectedToA()
    expect(await joinWithLink({ kind: 'invite', invite: 'gone' }, options)).toMatchObject({
      message: { text: "This invite link doesn't work anymore. You're still connected to Dad." },
    })
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A })
  })

  it.each([
    ['sharing_ended', 'Code Not Working'],
    ['too_many_devices', 'Too Many Devices'],
    ['try_later', 'Too Many Tries'],
    ['invalid_input', 'Not an Invite Link'],
    ['key_in_use', "Couldn't Connect"], // on the pending key and on a new one
    ['something_new', "Couldn't Connect"],
  ])('tells %s from a code as %s', async (error, title) => {
    const { f, options } = setUp()
    f.door.redeem = async () => ({ error })
    expect(await joinWithLink(CODE_A, options)).toMatchObject({ kind: 'failed', message: { title } })
  })

  it("can't connect with no network, and keeps the pending key for the next try", async () => {
    const { f, store, options } = setUp()
    f.network.down = true
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.pendingKey()).toBe(key(1))
  })

  it("can't connect when the read after joining is refused", async () => {
    const { f, store, options } = setUp()
    f.door.view = async () => ({ error: 'sharing_ended' })
    expect(await joinWithLink(INVITE_A, options)).toEqual({ kind: 'failed', message: COULDNT_CONNECT })
    expect(store.device()).toBeNull()
  })
})
