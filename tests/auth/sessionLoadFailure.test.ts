import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasLiveSession, hasSession, onSignedOut, signIn, signOut } from '../../src/auth/session'

// The CrewLu Cloud client is loaded on demand, and loading can fail: the visitor is offline, or the tab is a stale
// copy from before a deploy. In Chrome that is a TypeError like the one below. Here the load always fails.
const CHUNK_ERROR = 'Failed to fetch dynamically imported module: https://crewluve.crewlu.net/assets/supabase-1a2b3c4d.js'
vi.mock('../../src/supabase', () => ({
  get supabase(): never {
    throw new TypeError(CHUNK_ERROR)
  },
  get isAuthRetryableFetchError(): never {
    throw new TypeError(CHUNK_ERROR)
  },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('when the CrewLu Cloud client cannot be loaded', () => {
  it('signIn reports a network problem instead of rejecting', async () => {
    expect(await signIn('pilot@example.com', 'a-test-password')).toBe('network')
  })

  it('hasSession and hasLiveSession reject, so the caller can tell "could not check" from "signed out"', async () => {
    await expect(hasSession()).rejects.toThrow(/Failed to fetch dynamically imported module/)
    await expect(hasLiveSession()).rejects.toThrow(/Failed to fetch dynamically imported module/)
  })

  it('signOut still removes the stored session, and says so in the console once', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const removed: string[] = []
    vi.stubGlobal('localStorage', { removeItem: (key: string) => removed.push(key) })
    await expect(signOut()).resolves.toBeUndefined()
    expect(removed).toEqual(['crewluve-auth'])
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toMatch(/Sign-out/)
  })

  it('onSignedOut does not throw, and says in the console that sign-outs elsewhere will go unnoticed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const off = onSignedOut(() => {})
    await vi.dynamicImportSettled()
    await Promise.resolve()
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toMatch(/onSignedOut/)
    expect(() => off()).not.toThrow()
  })
})
