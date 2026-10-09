import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
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

// Each rule of classifySignInError on its own: the cases above also satisfy several rules at once, so dropping any one
// of them would not show.
describe('classifySignInError, one rule at a time', () => {
  it.each([
    ['a 400 with a message that says nothing', { status: 400, message: 'bad request' }, 'credentials'],
    ['a 400 with no message', { status: 400 }, 'credentials'],
    ['the invalid-credentials message with another status', { status: 422, message: 'Invalid login credentials' }, 'credentials'],
    ['the invalid-credentials message in other letters', { message: 'INVALID LOGIN CREDENTIALS' }, 'credentials'],
    ['the retryable-fetch error by name, from a gateway', { name: 'AuthRetryableFetchError', status: 503, message: 'Service Unavailable' }, 'network'],
    ['the retryable-fetch error by name alone', { name: 'AuthRetryableFetchError' }, 'network'],
    ['status 0 alone', { status: 0, message: 'request did not complete' }, 'network'],
    ['status 0 with no message', { status: 0 }, 'network'],
    ['"failed to fetch" alone', { message: 'failed to fetch' }, 'network'],
    ['the word "network" alone, as Firefox words it', { message: 'NetworkError when attempting to fetch resource.' }, 'network'],
    ['the word "network" alone, as React Native words it', { message: 'Network request failed' }, 'network'],
    ['a 500 with no message', { status: 500 }, 'other'],
    ['a 429 rate limit', { status: 429, message: 'Too many requests' }, 'other'],
    ['an empty error', {}, 'other'],
    ['undefined', undefined, 'other'],
  ] as const)('%s', (_name, err, kind) => {
    expect(classifySignInError(err)).toBe(kind)
  })

  it('checks for bad credentials before the network, so a 400 that mentions the network is still bad credentials', () => {
    expect(classifySignInError({ status: 400, message: 'network' })).toBe('credentials')
  })

  it('classifies the errors supabase-js really returns', () => {
    expect(classifySignInError(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))).toBe('credentials')
    expect(classifySignInError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network')
    expect(classifySignInError(new AuthRetryableFetchError('Bad Gateway', 502))).toBe('network')
    expect(classifySignInError(new AuthApiError('Database error', 500, 'unexpected_failure'))).toBe('other')
    expect(classifySignInError(new AuthApiError('Email rate limit exceeded', 429, 'over_email_send_rate_limit'))).toBe('other')
  })
})

describe('SIGN_IN_MESSAGES', () => {
  it('uses the spec’s wording (§4.2)', () => {
    expect(SIGN_IN_MESSAGES.credentials).toBe("That email and password didn't work. Use the same CrewLu Cloud sign-in as the Crewlu app.")
    expect(SIGN_IN_MESSAGES.network).toBe("Couldn't reach CrewLu Cloud. Check your connection and try again.")
    expect(SIGN_IN_MESSAGES.other).toBe('Sign-in failed. Try again in a minute.')
  })
})
