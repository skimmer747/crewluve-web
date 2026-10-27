import { describe, expect, it } from 'vitest'
import { bareInvite, CODE_ALPHABET, codeFrom, linkFromHash, linkFromText } from '../../src/partner/link'

describe('linkFromHash (piece 5a §4.1)', () => {
  it('reads an invite and a code', () => {
    expect(linkFromHash('#t=0123456789abcdef0123456789abcdef')).toEqual({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
    expect(linkFromHash('#c=AB2C3D')).toEqual({ kind: 'code', code: 'AB2C3D' })
  })

  it('reads nothing else, such as the schedule page\'s #schedule', () => {
    for (const hash of ['', '#', '#schedule', '#t=', '#c=', '#x=1', 't=abc']) expect(linkFromHash(hash)).toBeNull()
  })

  it('tidies a code from a link as Crewluve does, and refuses one that is not six letters or digits', () => {
    expect(linkFromHash('#c=ab2c3d')).toEqual({ kind: 'code', code: 'AB2C3D' })
    expect(linkFromHash('#c=AB-2C%203D')).toEqual({ kind: 'code', code: 'AB2C3D' })
    expect(linkFromHash('#c=AB2C3')).toBeNull()
    expect(linkFromHash('#c=AB2C3D7')).toBeNull()
  })
})

describe('linkFromText', () => {
  it("finds the link in CrewLu's whole message", () => {
    const message = 'Tap this link to see my status in Crewluve.\nhttps://crewluve.crewlu.net/join#t=0123456789abcdef0123456789abcdef'
    expect(linkFromText(message)).toEqual({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
  })

  it('takes the link alone, a code link, and a link without https', () => {
    expect(linkFromText('  https://crewluve.crewlu.net/join#t=abc  ')).toEqual({ kind: 'invite', invite: 'abc' })
    expect(linkFromText('https://crewluve.crewlu.net/join#c=AB2C3D')).toEqual({ kind: 'code', code: 'AB2C3D' })
    expect(linkFromText('crewluve.crewlu.net/join#t=abc')).toEqual({ kind: 'invite', invite: 'abc' })
  })

  it('finds nothing in text that is not an invite link', () => {
    for (const text of ['', 'hello', 'https://crewluve.crewlu.net/', 'https://crewluve.crewlu.net/join', 'https://example.com/join#t=abc']) {
      expect(linkFromText(text)).toBeNull()
    }
  })

  it('leaves out punctuation and spaces around the link', () => {
    for (const text of [
      'Open https://crewluve.crewlu.net/join#t=abc123.',
      '<https://crewluve.crewlu.net/join#t=abc123>',
      '(https://crewluve.crewlu.net/join#t=abc123)',
      '"https://crewluve.crewlu.net/join#t=abc123"',
      'https://crewluve.crewlu.net/join#t=abc123\u200b',
      'https://crewluve.crewlu.net/join/#t=abc123',
    ]) {
      expect(linkFromText(text)).toEqual({ kind: 'invite', invite: 'abc123' })
    }
  })

  it('reads a code link in lower case', () => {
    expect(linkFromText('https://crewluve.crewlu.net/join#c=ab2c3d')).toEqual({ kind: 'code', code: 'AB2C3D' })
  })
})

describe('bareInvite', () => {
  it("takes an invite's bare token: 32 hex characters, in either case, with spaces around them", () => {
    for (const text of ['0123456789abcdef0123456789abcdef', '0123456789ABCDEF0123456789ABCDEF', '  0123456789abcdef0123456789abcdef\n']) {
      expect(bareInvite(text)).toEqual({ kind: 'invite', invite: '0123456789abcdef0123456789abcdef' })
    }
  })

  it('takes nothing else: 31 characters, 33, or 32 with a g', () => {
    for (const text of ['0123456789abcdef0123456789abcde', '0123456789abcdef0123456789abcdef0', '0123456789abcdef0123456789abcdeg']) {
      expect(bareInvite(text)).toBeNull()
    }
  })
})

describe('codeFrom', () => {
  it("keeps the code's own letters, in upper case, six at most", () => {
    expect(codeFrom('ab2c')).toBe('AB2C')
    expect(codeFrom('ab-2c 3d')).toBe('AB2C3D')
    expect(codeFrom('AB2C3D9X')).toBe('AB2C3D')
    expect(codeFrom('O0I1L')).toBe('')
  })

  it('drops letters that only become code letters in upper case', () => {
    // The German sharp s and the "st" ligature upper-case to SS and ST: two letters each, so neither is one code letter.
    expect(codeFrom('\u00df\ufb06' + '2a')).toBe('2A')
  })

  it("uses the door's alphabet, which leaves out 0, 1, I, L and O", () => {
    expect(CODE_ALPHABET).toBe('23456789ABCDEFGHJKMNPQRSTUVWXYZ')
  })
})
