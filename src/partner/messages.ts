import type { PartnerLink } from './link'

/** What a partner is told when a link or code didn't connect: Crewluve's words (Models/JoinMessage.swift). */
export interface JoinMessage {
  readonly title: string
  readonly text: string
}

export const COULDNT_CONNECT: JoinMessage = { title: "Couldn't Connect", text: "Couldn't connect. Check your connection and try again." }
export const NOT_AN_INVITE_LINK: JoinMessage = { title: 'Not an Invite Link', text: "That doesn't look like an invite link." }

/** The line above the status once this browser has connected (piece 5a §4.3, step 7). */
export const CONNECTED_NOTE = 'Connected on this browser. Add it to your Home Screen to keep it handy.'

/** The welcome screen's way forward for someone with no link, as Crewluve's welcome gives one (piece 5a §8). */
export const NO_LINK_YET = 'No link yet? Ask your pilot to invite you from Settings → Partner Sharing in CrewLu.'

/** The welcome screen's note, on the first visit of a browser that used the password sign-in (piece 5a §8). */
export const PASSWORD_SIGN_IN_ENDED = "Signing in with your pilot's password has ended. Ask your pilot for your own invite link."

/**
 * The message for the door's refusal of `link` (piece 5a §4.4), or for no usable answer (null). `stillConnectedTo`
 * is the pilot this browser still follows, as this partner sees them, if it follows one.
 */
export function joinMessage(refusal: string | null, link: PartnerLink, stillConnectedTo: string | null): JoinMessage {
  switch (refusal) {
    case 'sharing_ended':
      if (link.kind === 'code') {
        return { title: 'Code Not Working', text: "That code didn't work. Codes last 10 minutes and work once. Make a new one on your other device." }
      }
      return {
        title: 'Invite Link Not Working',
        text: stillConnectedTo
          ? `This invite link doesn't work anymore. You're still connected to ${stillConnectedTo}.`
          : "This invite link doesn't work anymore. Ask your pilot to send it again.",
      }
    case 'too_many_devices':
      return { title: 'Too Many Devices', text: 'This invite already has 10 devices. Ask your pilot to remove one in CrewLu, then try again.' }
    case 'try_later':
      return { title: 'Too Many Tries', text: 'Too many tries. Wait a minute, then try again.' }
    case 'invalid_input':
      return NOT_AN_INVITE_LINK
    default:
      return COULDNT_CONNECT
  }
}
