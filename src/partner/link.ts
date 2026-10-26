/** What an invite link or a hand-off code asks for (partner-api.md, "Links"). */
export type PartnerLink = { kind: 'invite'; invite: string } | { kind: 'code'; code: string }

/** The letters a hand-off code is made of: no 0, 1, I, L or O (private.new_code). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 6

/** The link in an address's fragment: #t=<invite> joins, #c=<code> redeems. Null for any other fragment. */
export function linkFromHash(hash: string): PartnerLink | null {
  if (!hash.startsWith('#')) return null
  const params = new URLSearchParams(hash.slice(1))
  const invite = params.get('t')?.trim()
  if (invite) return { kind: 'invite', invite }
  const code = params.get('c')?.trim()
  if (code) return { kind: 'code', code }
  return null
}

/** The invite link in pasted text, which may be CrewLu's whole message ("Tap this link to see my status…"). */
export function linkFromText(text: string): PartnerLink | null {
  const found = /(?:https?:\/\/)?crewluve\.crewlu\.net\/join\/?(#\S+)/i.exec(text)
  return found ? linkFromHash(found[1]) : null
}

/** What the code boxes keep of what was typed or pasted: the code's own letters, in upper case, six at most. */
export function codeFrom(typed: string): string {
  return [...typed.toUpperCase()].filter((c) => CODE_ALPHABET.includes(c)).join('').slice(0, CODE_LENGTH)
}
