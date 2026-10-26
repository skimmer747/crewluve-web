import { describe, expect, it } from 'vitest'
import { NotConnected, refreshSummary, SharingEnded } from '../../src/partner/refresh'
import { localPartnerStore } from '../../src/partner/store'
import { example, fakeDoor, key, memoryStorage, PARTNER_A, PARTNER_B } from '../fixtures/partner'

/** A browser connected as partner A's device key(1), which already has the summary of a1. */
function connected() {
  const f = fakeDoor()
  f.devices.set(key(1), PARTNER_A)
  f.summaries.set(PARTNER_A, { updatedAt: 'a1', status: example('layover') })
  const store = localPartnerStore(memoryStorage())
  store.saveDevice({ key: key(1), partnerId: PARTNER_A })
  store.saveSummary({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('layover'), checkedAt: 1 })
  return { f, store }
}

describe('refreshSummary (piece 5a §5)', () => {
  it('sends the stored updated_at, and on unchanged keeps the summary and moves Checked', async () => {
    const { f, store } = connected()
    const after = await refreshSummary(f.door, store, () => 5)
    expect(f.calls).toEqual([`view ${key(1)} a1`])
    expect(after).toEqual({ partnerId: PARTNER_A, updatedAt: 'a1', status: example('layover'), checkedAt: 5 })
    expect(store.summary()).toEqual(after)
  })

  it('stores a new summary', async () => {
    const { f, store } = connected()
    f.summaries.set(PARTNER_A, { updatedAt: 'a2', status: example('commuting-home') })
    const after = await refreshSummary(f.door, store, () => 5)
    expect(after).toEqual({ partnerId: PARTNER_A, updatedAt: 'a2', status: example('commuting-home'), checkedAt: 5 })
    expect(store.summary()).toEqual(after)
  })

  it("stores the answer from before the pilot's first summary", async () => {
    const { f, store } = connected()
    f.summaries.delete(PARTNER_A)
    expect(await refreshSummary(f.door, store, () => 5)).toEqual({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 5 })
  })

  it('asks for everything when the stored summary is for another partner', async () => {
    const { f, store } = connected()
    store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'a1', status: null, checkedAt: 1 })
    await refreshSummary(f.door, store, () => 5)
    expect(f.calls).toEqual([`view ${key(1)} null`])
  })

  it('forgets the key and the summary when sharing ends, and names the pilot as this partner saw them', async () => {
    const { f, store } = connected()
    store.savePendingKey(key(2))
    f.devices.clear() // the pilot removed this browser in CrewLu
    const err = await refreshSummary(f.door, store).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SharingEnded)
    expect((err as SharingEnded).pilotName).toBe('Alex')
    expect([store.device(), store.pendingKey(), store.summary()]).toEqual([null, key(2), null])
  })

  it('has no name for an ending before the first summary', async () => {
    const { f, store } = connected()
    store.saveSummary({ partnerId: PARTNER_A, updatedAt: null, status: null, checkedAt: 1 })
    f.devices.clear()
    const err = await refreshSummary(f.door, store).catch((e: unknown) => e)
    expect((err as SharingEnded).pilotName).toBeNull()
  })

  it('changes nothing when the door refuses for another reason', async () => {
    const { f, store } = connected()
    f.door.view = async () => ({ error: 'try_later' })
    await expect(refreshSummary(f.door, store)).rejects.toThrow('partner_view refused: try_later')
    expect(store.device()).not.toBeNull()
    expect(store.summary()?.checkedAt).toBe(1)
  })

  it('changes nothing when there is no answer', async () => {
    const { f, store } = connected()
    f.network.down = true
    await expect(refreshSummary(f.door, store)).rejects.toThrow('Failed to fetch')
    expect(store.summary()?.checkedAt).toBe(1)
  })

  it('says so when this browser follows no one', async () => {
    const { f } = connected()
    await expect(refreshSummary(f.door, localPartnerStore(memoryStorage()))).rejects.toBeInstanceOf(NotConnected)
  })

  it('writes nothing when the browser disconnects while the call is out', async () => {
    const { f, store } = connected()
    const view = f.door.view
    f.door.view = async (k, since) => {
      store.forget() // Disconnect, in this tab or another
      return view(k, since)
    }
    await expect(refreshSummary(f.door, store)).rejects.toBeInstanceOf(NotConnected)
    expect(store.summary()).toBeNull()
  })

  it("shows another tab's new device instead of writing over it", async () => {
    const { f, store } = connected()
    const view = f.door.view
    const theirs = { partnerId: PARTNER_B, updatedAt: 'b1', status: example('home', 'B'), checkedAt: 3 }
    f.door.view = async (k, since) => {
      store.saveDevice({ key: key(2), partnerId: PARTNER_B })
      store.saveSummary(theirs)
      return view(k, since)
    }
    expect(await refreshSummary(f.door, store)).toEqual(theirs)
    expect(store.summary()).toEqual(theirs)
  })

  it("writes nothing when a join gives this browser's key to another partner while the call is out", async () => {
    const { f, store } = connected()
    const view = f.door.view
    const theirs = { partnerId: PARTNER_B, updatedAt: 'b1', status: example('home', 'B'), checkedAt: 3 }
    f.door.view = async (k, since) => {
      store.saveDevice({ key: key(1), partnerId: PARTNER_B }) // the same key, now the other partner's
      store.saveSummary(theirs)
      return view(k, since)
    }
    expect(await refreshSummary(f.door, store)).toEqual(theirs)
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
  })

  it('ignores a stale sharing_ended when a join gave the key to another partner meanwhile', async () => {
    const { f, store } = connected()
    f.devices.clear() // the old device is gone, so the door answers sharing_ended for it
    const view = f.door.view
    f.door.view = async (k, since) => {
      const answer = await view(k, since)
      store.saveDevice({ key: key(1), partnerId: PARTNER_B })
      store.saveSummary({ partnerId: PARTNER_B, updatedAt: 'b1', status: null, checkedAt: 3 })
      return answer
    }
    await refreshSummary(f.door, store)
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
  })

  it('follows the door when it answers this key for another partner, asking again for everything after an unchanged', async () => {
    const { f, store } = connected()
    f.devices.set(key(1), PARTNER_B) // the door gave this key to partner B
    f.summaries.set(PARTNER_B, { updatedAt: 'a1', status: example('home', 'B') })
    const after = await refreshSummary(f.door, store, () => 5)
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
    expect(after).toEqual({ partnerId: PARTNER_B, updatedAt: 'a1', status: example('home', 'B'), checkedAt: 5 })
    expect(f.calls).toEqual([`view ${key(1)} a1`, `view ${key(1)} null`])
  })

  it("follows the door when it answers this key with another partner's new summary", async () => {
    const { f, store } = connected()
    f.devices.set(key(1), PARTNER_B)
    f.summaries.set(PARTNER_B, { updatedAt: 'b1', status: example('home', 'B') })
    const after = await refreshSummary(f.door, store, () => 5)
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_B })
    expect(after.partnerId).toBe(PARTNER_B)
    expect(f.calls).toEqual([`view ${key(1)} a1`])
  })

  it('moves Checked on the summary another tab stored meanwhile, not on the one read before the call', async () => {
    const { f, store } = connected()
    const view = f.door.view
    const newer = { partnerId: PARTNER_A, updatedAt: 'a2', status: example('commuting-home'), checkedAt: 3 }
    f.door.view = async (k, since) => {
      const answer = await view(k, since) // unchanged since a1
      store.saveSummary(newer)
      return answer
    }
    expect(await refreshSummary(f.door, store, () => 5)).toEqual({ ...newer, checkedAt: 5 })
  })

  it('follows the door at most once per poll, so a store that keeps nothing cannot make one poll call the door for ever', async () => {
    const { f, store } = connected()
    f.devices.set(key(1), PARTNER_B) // the door gave this key to partner B...
    f.summaries.set(PARTNER_B, { updatedAt: 'a1', status: example('home', 'B') }) // ...whose summary is unchanged since the a1 sent
    const forgetful = { ...store, saveDevice: () => true } // answers yes, keeps nothing
    const view = f.door.view
    f.door.view = async (k, since) => {
      // A poll that never stops fails here, with a message, instead of hanging the run.
      if (f.calls.length >= 5) throw new Error('the poll keeps calling the door')
      return view(k, since)
    }
    await expect(refreshSummary(f.door, forgetful, () => 5)).rejects.toThrow('partner_view named another partner again')
    expect(f.calls).toEqual([`view ${key(1)} a1`, `view ${key(1)} a1`])
    expect(store.device()).toEqual({ key: key(1), partnerId: PARTNER_A }) // and the next poll starts from the same place
  })
})
