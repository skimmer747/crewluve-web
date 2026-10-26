import { isRefused, type PartnerDoor } from './door'
import type { PartnerStore, StoredSummary } from './store'
import { nameIn } from './summary'

/** partner_view said this browser's device is gone: the pilot removed it, or the person (piece 5a §5). */
export class SharingEnded extends Error {
  /** The pilot whose sharing ended, as this partner saw them, when the stored summary says. */
  constructor(readonly pilotName: string | null) {
    super('Sharing has ended')
    this.name = 'SharingEnded'
  }
}

/** This browser follows no one now: Disconnect, in this tab or another. */
export class NotConnected extends Error {
  constructor() {
    super('Not connected')
    this.name = 'NotConnected'
  }
}

/**
 * One poll (piece 5a §5): partner_view with the stored summary's updated_at, so an unchanged summary comes back as
 * just that. A new summary is stored, and "Checked" moves either way. On sharing_ended the key and the summary are
 * forgotten (the only answer that forgets them), then SharingEnded is thrown. Any other failure changes nothing.
 */
export async function refreshSummary(door: PartnerDoor, store: PartnerStore, now: () => number = Date.now): Promise<StoredSummary> {
  const device = store.device()
  if (!device) throw new NotConnected()
  const stored = store.summary()
  const kept = stored?.partnerId === device.partnerId ? stored : null
  const answer = await door.view(device.key, kept?.updatedAt ?? null)

  // The browser let go of this device while the call was out: write nothing for it.
  const current = store.device()
  if (!current) throw new NotConnected()
  if (current.key !== device.key) {
    // Another tab connected a new device meanwhile, and stored its summary.
    const theirs = store.summary()
    if (theirs) return theirs
    throw new Error('The device changed during the refresh')
  }

  if (isRefused(answer)) {
    if (answer.error !== 'sharing_ended') throw new Error(`partner_view refused: ${answer.error}`)
    store.forget()
    throw new SharingEnded(kept ? nameIn(kept.status, kept.partnerId) : null)
  }
  if (answer.unchanged) {
    if (!kept) throw new Error('partner_view answered unchanged to a call that asked for everything')
    const checked = { ...kept, checkedAt: now() }
    store.saveSummary(checked)
    return checked
  }
  const fresh: StoredSummary = { partnerId: answer.partnerId, updatedAt: answer.updatedAt, status: answer.status, checkedAt: now() }
  store.saveSummary(fresh)
  return fresh
}
