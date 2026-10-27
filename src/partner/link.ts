/** What an invite link or a hand-off code asks for (partner-api.md, "Links"). */
export type PartnerLink = { kind: 'invite'; invite: string } | { kind: 'code'; code: string }

/** The letters a hand-off code is made of: no 0, 1, I, L or O (private.new_code). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6
const CODE_LETTERS: ReadonlySet<string> = new Set(CODE_ALPHABET)

/** The link in an address's fragment: #t=<invite> joins, #c=<code> redeems. Null for any other fragment. */
export function linkFromHash(hash: string): PartnerLink | null {
  if (!hash.startsWith('#')) return null
  const params = new URLSearchParams(hash.slice(1))
  const invite = params.get('t')?.trim()
  if (invite) return { kind: 'invite', invite }
  // A code as Crewluve reads one (PartnerLink.code(from:)): spaces and dashes ignored, any case, six letters or digits.
  const code = (params.get('c') ?? '').replace(/[\s-]/g, '').toUpperCase()
  return /^[0-9A-Z]{6}$/.test(code) ? { kind: 'code', code } : null
}

/**
 * The invite link in pasted text, which may be CrewLu's whole message ("Tap this link to see my status…"). A link is
 * read for just as long as the door makes it: an invite's token is always private.new_secret(16), 32 hex characters
 * (in either case, lower-cased here), and a code is six letters or digits, tidied as linkFromHash tidies one. iOS can
 * paste CrewLu's two shared items, the message and the link, glued together with no space between, so whatever follows
 * the token or the code, a word, hex letters, a full stop or a bracket, isn't taken as part of it. A shorter token or
 * code isn't a link, and the text goes on to the other rules.
 */
export function linkFromText(text: string): PartnerLink | null {
  const found = /(?:https?:\/\/)?crewluve\.crewlu\.net\/join\/?#(?:t=([0-9a-f]{32})|c=([0-9a-z]{6}))/i.exec(text)
  if (!found) return null
  return found[1] ? { kind: 'invite', invite: found[1].toLowerCase() } : linkFromHash(`#c=${found[2]}`)
}

/**
 * Pasted text that is exactly an invite's token: the 32 hex characters after #t=, in either case, with spaces around
 * them. Null for anything else. A token is always private.new_secret(16), 16 random bytes in hex, so nothing else is
 * 32 hex characters, and it can't be mistaken for a code. Crewluve's paste box doesn't take one; the website does, to
 * be kinder to a partner who copied only the token.
 */
export function bareInvite(text: string): PartnerLink | null {
  const token = text.trim()
  return /^[0-9a-f]{32}$/i.test(token) ? { kind: 'invite', invite: token.toLowerCase() } : null
}

/**
 * Pasted text that is exactly a code: six characters of the door's alphabet once spaces and dashes go, in either case.
 * Null for anything else. Crewluve's paste box (PartnerLink.code(from:)) takes any six letters or digits, and sends a
 * look-alike such as K0MQ2X to be told the code didn't work. This one refuses it here instead, so it doesn't count as a
 * failure toward the door's pause on wrong codes.
 */
export function bareCode(text: string): PartnerLink | null {
  const code = text.replace(/[\s-]/g, '').toUpperCase()
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_LETTERS.has(c)) ? { kind: 'code', code } : null
}

/** What the code boxes keep of what was typed or pasted: the code's own letters, in upper case, six at most. */
export function codeFrom(typed: string): string {
  return [...typed].map((c) => c.toUpperCase()).filter((c) => CODE_LETTERS.has(c)).join('').slice(0, CODE_LENGTH)
}
