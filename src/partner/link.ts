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
 * The invite link in pasted text, which may be CrewLu's whole message ("Tap this link to see my status…"). Only the
 * letters and digits a link carries are read, so a full stop or a bracket after the link isn't taken as part of it.
 */
export function linkFromText(text: string): PartnerLink | null {
  const found = /(?:https?:\/\/)?crewluve\.crewlu\.net\/join\/?(#[tc]=[0-9a-z]+)/i.exec(text)
  return found ? linkFromHash(found[1]) : null
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
