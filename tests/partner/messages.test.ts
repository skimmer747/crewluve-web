import { describe, expect, it } from 'vitest'
import type { PartnerLink } from '../../src/partner/link'
import { connectedNote, COULDNT_CONNECT, joinMessage, NOT_AN_INVITE_LINK, type JoinMessage } from '../../src/partner/messages'

const INVITE: PartnerLink = { kind: 'invite', invite: 'abc' }
const CODE: PartnerLink = { kind: 'code', code: 'AB2C3D' }

describe("joinMessage: Crewluve's words (piece 5a §4.4)", () => {
  it('says a dead invite link is dead, and names the pilot the browser still follows', () => {
    expect(joinMessage('sharing_ended', INVITE, null)).toEqual({
      title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. Ask your pilot to send it again.",
    })
    expect(joinMessage('sharing_ended', INVITE, 'Dad')).toEqual({
      title: 'Invite Link Not Working', text: "This invite link doesn't work anymore. You're still connected to Dad.",
    })
  })

  it('asks for a new link when the pilot this browser follows has no name to give', () => {
    expect(joinMessage('sharing_ended', INVITE, '').text).toBe("This invite link doesn't work anymore. Ask your pilot to send it again.")
  })

  it('says a dead code is dead', () => {
    expect(joinMessage('sharing_ended', CODE, 'Dad')).toEqual({
      title: 'Code Not Working', text: "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device.",
    })
  })

  it.each<[string | null, JoinMessage]>([
    ['too_many_devices', { title: 'Too Many Devices', text: 'This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again.' }],
    ['try_later', { title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }],
    ['invalid_input', NOT_AN_INVITE_LINK],
    ['key_in_use', COULDNT_CONNECT],
    ['something_new', COULDNT_CONNECT],
    [null, COULDNT_CONNECT],
  ])('answers %s the same for a link and a code', (refusal, message) => {
    expect(joinMessage(refusal, INVITE, null)).toEqual(message)
    expect(joinMessage(refusal, CODE, null)).toEqual(message)
  })

  it('has the words for text with no link, and for no answer', () => {
    expect(NOT_AN_INVITE_LINK).toEqual({ title: 'Not an Invite Link', text: "That doesn't look like an invite link." })
    expect(COULDNT_CONNECT).toEqual({ title: "Couldn't Connect", text: "Couldn't connect. Check your connection and try again." })
  })
})

describe('connectedNote: how to come back, on this kind of device (piece 5a §4.3)', () => {
  // A site added to an iPhone's Home Screen keeps storage of its own, so it starts unconnected.
  it.each(['iPhone', 'iPad'] as const)('sends an %s to the Crewluve app', (platform) => {
    expect(connectedNote(platform)).toBe(
      'Connected on this browser. Get the CrewLuve app from the App Store, then open your invite link again to connect the app.',
    )
  })

  it("puts it on an Android Home Screen, which opens the same browser", () => {
    expect(connectedNote('Android')).toBe('Connected on this browser. Add it to your Home Screen to keep it handy.')
  })

  it.each(['Mac', 'Windows', 'Linux', 'ChromeOS', null] as const)('has %s keep a bookmark', (platform) => {
    expect(connectedNote(platform)).toBe('Connected on this browser. Bookmark this page to come back to it.')
  })
})
