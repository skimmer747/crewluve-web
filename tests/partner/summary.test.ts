import { describe, expect, it } from 'vitest'
import { currentQuickStatus, nameIn, readSummary } from '../../src/partner/summary'
import { example, EXAMPLES, PARTNER_A, PARTNER_B } from '../fixtures/partner'

describe('readSummary', () => {
  it.each([...EXAMPLES])('reads %s for both partners', (name) => {
    for (const [who, id] of [['A', PARTNER_A], ['B', PARTNER_B]] as const) {
      const summary = readSummary(example(name, who), id)
      expect(summary?.pilotId).toBe('6F1C2D3E-4B5A-4C6D-8E7F-90A1B2C3D4E5')
      expect(summary?.legs).toHaveLength(7)
    }
  })

  it('reads the times as epoch ms and keeps the fields the website uses', () => {
    const summary = readSummary(example('layover'), PARTNER_A)!
    expect(summary).toMatchObject({ name: 'Alex', home: 'ATL', base: 'SDF', lastUpdated: 1792605600000 })
    expect(summary.legs[0]).toEqual({
      id: 'Z55120-leg-0', tripId: 'Z55120', type: 'flight', start: 1792537200000, end: 1792542000000, airportCode: 'SDF',
      flightNumber: 'UPS2961', departureAirport: 'SDF', arrivalAirport: 'RFD', tripTotalDays: 2, delayMinutes: null,
      airlineCode: null, label: null,
    })
  })

  it('names the pilot as this partner sees them: their own name for the pilot, else the first name', () => {
    expect(readSummary(example('display-names', 'A'), PARTNER_A)?.name).toBe('Dad')
    expect(readSummary(example('display-names', 'B'), PARTNER_B)?.name).toBe('Alex')
    // Crewlu Cloud's ids are in lower case; a partner id in capitals still finds its name.
    expect(readSummary(example('display-names', 'A'), PARTNER_A.toUpperCase())?.name).toBe('Dad')
    expect(nameIn(example('display-names', 'A'), PARTNER_A)).toBe('Dad')
  })

  it('refuses a summary it cannot read', () => {
    expect(readSummary(null, PARTNER_A)).toBeNull()
    expect(readSummary('summary', PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), schemaVersion: 2 }, PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), pilotId: '' }, PARTNER_A)).toBeNull()
    expect(readSummary({ ...example('home'), lastUpdated: 'today' }, PARTNER_A)).toBeNull()
    expect(nameIn(null, PARTNER_A)).toBeNull()
  })

  it('skips a malformed leg and keeps the rest', () => {
    const status = example('home')
    const legs = status.tripLegs as Array<Record<string, unknown>>
    const broken = [{ ...legs[0], type: 'teleport' }, { ...legs[1], startTime: null }, 'leg', ...legs.slice(2)]
    expect(readSummary({ ...status, tripLegs: broken }, PARTNER_A)?.legs).toHaveLength(5)
    expect(readSummary({ ...status, tripLegs: null }, PARTNER_A)?.legs).toEqual([])
  })
})

describe('quick status (piece 5a §7)', () => {
  const shownTo = (name: string, who: 'A' | 'B') => {
    const summary = readSummary(example(name, who), who === 'A' ? PARTNER_A : PARTNER_B)!
    return (now: number) => currentQuickStatus(summary, now)
  }

  it("shows the partner's own status", () => {
    expect(shownTo('quick-status-one-partner', 'A')(1792605600000)).toEqual({ text: 'Call Me', icon: 'phone.fill', expiresAt: 1792612800000 })
  })

  it('shows nothing to a partner it was not sent to', () => {
    expect(shownTo('quick-status-one-partner', 'B')(1792605600000)).toBeNull()
  })

  it('stops at its expiry', () => {
    const shown = shownTo('quick-status-one-partner', 'A')
    expect(shown(1792612800000 - 1)).not.toBeNull()
    expect(shown(1792612800000)).toBeNull()
  })

  it('shows the status sent to everyone, which has no limit', () => {
    expect(shownTo('quick-status-everyone', 'B')(1792605600000 + 86_400_000)).toEqual({ text: 'Sleeping', icon: 'moon.zzz.fill', expiresAt: null })
  })

  it("puts the partner's own status first, then the one for everyone once their own expires", () => {
    const status = {
      ...example('home'),
      quickStatusByPartner: { [PARTNER_A]: { status: 'Call Me', icon: 'phone.fill', expiry: 1792429200 } },
      quickStatus: 'Free to Talk', quickStatusIcon: 'bubble.left.fill', quickStatusExpiry: null, quickStatusTargets: null,
    }
    const summary = readSummary(status, PARTNER_A)!
    expect(currentQuickStatus(summary, 1792425600000)?.text).toBe('Call Me')
    expect(currentQuickStatus(summary, 1792429200000)?.text).toBe('Free to Talk')
  })

  it('leaves out a status for everyone whose targets say nobody', () => {
    const status = { ...example('home'), quickStatus: 'Free to Talk', quickStatusIcon: 'bubble.left.fill', quickStatusExpiry: null, quickStatusTargets: [] }
    expect(readSummary(status, PARTNER_A)?.quickStatuses).toEqual([])
  })
})
