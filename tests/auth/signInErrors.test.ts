import { describe, expect, it } from 'vitest'
import { classifySignInError, SIGN_IN_MESSAGES } from '../../src/auth/signInErrors'

describe('classifySignInError', () => {
  it.each([
    [{ status: 400, message: 'Invalid login credentials' }, 'credentials'],
    [{ message: 'Invalid login credentials' }, 'credentials'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }, 'network'],
    [{ message: 'TypeError: Failed to fetch' }, 'network'],
    [{ status: 500, message: 'boom' }, 'other'],
    [null, 'other'],
  ] as const)('%o → %s', (err, kind) => expect(classifySignInError(err)).toBe(kind))
})

describe('SIGN_IN_MESSAGES', () => {
  it('uses the spec’s wording (§4.2)', () => {
    expect(SIGN_IN_MESSAGES.credentials).toBe("That email and password didn't work. Use the same CrewLu Cloud sign-in as the Crewlu app.")
    expect(SIGN_IN_MESSAGES.network).toBe("Couldn't reach CrewLu Cloud. Check your connection and try again.")
    expect(SIGN_IN_MESSAGES.other).toBe('Sign-in failed. Try again in a minute.')
  })
})
