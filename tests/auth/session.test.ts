import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasLiveSession, hasSession, hasStoredSession, onSignedOut, signIn, signOut } from '../../src/auth/session'

// The CrewLu Cloud client is replaced by a fake: nothing here creates a real client or touches a network.
// vi.mock applies to the dynamic import() session.ts uses, so the fake is what each function loads. The factory is
// synchronous on purpose: with an async one, two imports started in the same tick don't both get the fake.
const mock = await vi.hoisted(async () => {
  const { isAuthRetryableFetchError } = await import('@supabase/supabase-js') // the real helper; it builds no client
  const state = {
    /** How many times the fake module has been loaded. */
    loads: 0,
    auth: { signInWithPassword: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), signOut: vi.fn() },
    factory: () => {
      state.loads += 1
      return { supabase: { auth: state.auth }, isAuthRetryableFetchError }
    },
  }
  return state
})

vi.mock('../../src/supabase', () => mock.factory())

const SESSION = { access_token: 'token', refresh_token: 'refresh', user: { id: 'u1' } }
const offline = () => new AuthRetryableFetchError('Failed to fetch', 0)

beforeEach(() => {
  for (const fn of Object.values(mock.auth)) fn.mockReset()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loading the client (demo mode makes no network calls, spec §4.7)', () => {
  /**
   * A fresh copy of session.ts with the load count back at zero. resetModules() keeps mocked modules cached, so the fake
   * is registered again to make the next import run its factory.
   */
  async function freshSession() {
    vi.resetModules()
    mock.loads = 0
    vi.doMock('../../src/supabase', () => mock.factory())
    return import('../../src/auth/session')
  }

  it('does not load the client when session.ts is imported', async () => {
    await freshSession()
    expect(mock.loads).toBe(0)
  })

  it('does not load it for the synchronous stored-session check', async () => {
    const session = await freshSession()
    session.hasStoredSession({ getItem: () => null })
    expect(mock.loads).toBe(0)
  })

  it.each([
    ['hasSession', (s: typeof import('../../src/auth/session')) => s.hasSession()],
    ['hasLiveSession', (s: typeof import('../../src/auth/session')) => s.hasLiveSession()],
    ['signIn', (s: typeof import('../../src/auth/session')) => s.signIn('a@b.c', 'pw')],
    ['signOut', (s: typeof import('../../src/auth/session')) => s.signOut()],
  ])('loads it the first time %s needs it, and only once', async (_name, call) => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mock.auth.signInWithPassword.mockResolvedValue({ error: null })
    mock.auth.signOut.mockResolvedValue({ error: null })
    const session = await freshSession()
    await call(session)
    await call(session)
    expect(mock.loads).toBe(1)
  })

  it('loads it when something starts listening for sign-outs', async () => {
    mock.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    const session = await freshSession()
    session.onSignedOut(() => {})
    await vi.dynamicImportSettled()
    expect(mock.loads).toBe(1)
  })
})

describe('hasStoredSession', () => {
  const holding = (value: string | null) => ({ getItem: vi.fn((_key: string) => value) })

  it("is true when storage holds something under the client's key, 'crewluve-auth'", () => {
    const storage = holding('{"access_token":"x"}')
    expect(hasStoredSession(storage)).toBe(true)
    expect(storage.getItem).toHaveBeenCalledTimes(1)
    expect(storage.getItem).toHaveBeenCalledWith('crewluve-auth')
  })

  it('is false when the key is absent', () => {
    expect(hasStoredSession(holding(null))).toBe(false)
  })

  it('is false, without throwing, when storage throws', () => {
    expect(hasStoredSession({ getItem: () => { throw new Error('denied') } })).toBe(false)
  })

  it('reads the browser localStorage when none is passed', () => {
    vi.stubGlobal('localStorage', { getItem: (key: string) => (key === 'crewluve-auth' ? '{}' : null) })
    expect(hasStoredSession()).toBe(true)
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(hasStoredSession()).toBe(false)
  })

  it('is false where touching localStorage itself throws, as in a browser that blocks site data', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new DOMException('blocked', 'SecurityError') } })
    try {
      expect(hasStoredSession()).toBe(false)
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })

  it('is false where there is no localStorage at all', () => {
    expect(hasStoredSession()).toBe(false)
  })
})

describe('hasSession (signed in, as far as can be told, including offline)', () => {
  it('is true with a session', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
    expect(await hasSession()).toBe(true)
  })

  it('is true when the stored session could not be refreshed because the network is down', async () => {
    // Offline with an expired access token: auth-js gives up after about 25 s, returns no session and this error,
    // and leaves the stored session alone. That is signed in but unable to check, not signed out (spec §5, §8).
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: offline() })
    expect(await hasSession()).toBe(true)
  })

  it('is false when the server refused the refresh', async () => {
    const refused = new AuthApiError('Invalid Refresh Token: Refresh Token Not Found', 400, 'refresh_token_not_found')
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: refused })
    expect(await hasSession()).toBe(false)
  })

  it('is false with no session and no error', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    expect(await hasSession()).toBe(false)
  })

  it('is false when auth reports a missing session', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: new AuthSessionMissingError() })
    expect(await hasSession()).toBe(false)
  })
})

describe('hasLiveSession (a valid session right now, never a guess)', () => {
  it('is true with a session', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
    expect(await hasLiveSession()).toBe(true)
  })

  it('is false when the session could not be refreshed because the network is down', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: offline() })
    expect(await hasLiveSession()).toBe(false)
  })

  it('is false with no session', async () => {
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    expect(await hasLiveSession()).toBe(false)
  })
})

describe('signIn', () => {
  it('signs in with the email and password and returns null on success', async () => {
    mock.auth.signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null })
    expect(await signIn('pilot@example.com', 'a-test-password')).toBeNull()
    expect(mock.auth.signInWithPassword).toHaveBeenCalledTimes(1)
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'pilot@example.com', password: 'a-test-password' })
  })

  it.each([
    ['wrong credentials', { error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials') }, 'credentials'],
    ['a network failure', { error: offline() }, 'network'],
    ['a server error', { error: new AuthApiError('Internal error', 500, undefined) }, 'other'],
    ['a rate limit', { error: new AuthApiError('Too many requests', 429, 'over_request_rate_limit') }, 'other'],
  ] as const)('returns the kind of error for %s', async (_name, result, kind) => {
    mock.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, ...result })
    expect(await signIn('pilot@example.com', 'wrong')).toBe(kind)
  })

  it.each([
    ['a fetch that throws', new TypeError('Failed to fetch'), 'network'],
    ['something else that throws', new Error('boom'), 'other'],
  ] as const)('returns the kind of error for %s', async (_name, thrown, kind) => {
    mock.auth.signInWithPassword.mockRejectedValue(thrown)
    expect(await signIn('pilot@example.com', 'pw')).toBe(kind)
  })
})

describe('signOut', () => {
  it("signs out of this browser only, with scope 'local'", async () => {
    // signOut() defaults to scope 'global', which revokes every session of the account. Visitors use the pilot's own
    // login, so that would sign the pilot's Crewlu app out on their iPhone.
    mock.auth.signOut.mockResolvedValue({ error: null })
    await signOut()
    expect(mock.auth.signOut).toHaveBeenCalledTimes(1)
    expect(mock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('still resolves when the sign-out request fails, because auth drops the local session anyway', async () => {
    mock.auth.signOut.mockResolvedValue({ error: offline() })
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('removes the stored session itself if the client throws, so a sign-out never leaves credentials behind', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const removed: string[] = []
    vi.stubGlobal('localStorage', { removeItem: (key: string) => removed.push(key) })
    mock.auth.signOut.mockRejectedValue(new Error('lock timeout'))
    await expect(signOut()).resolves.toBeUndefined()
    expect(removed).toEqual(['crewluve-auth'])
  })

  it('does not throw when that storage is blocked too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('localStorage', { removeItem: () => { throw new Error('denied') } })
    mock.auth.signOut.mockRejectedValue(new Error('lock timeout'))
    await expect(signOut()).resolves.toBeUndefined()
  })
})

describe('onSignedOut', () => {
  /** A stand-in for onAuthStateChange that lets the test fire events and see the unsubscribe. */
  function auth() {
    const listeners: Array<(event: string) => void> = []
    const unsubscribe = vi.fn()
    mock.auth.onAuthStateChange.mockImplementation((listener: (event: string) => void) => {
      listeners.push(listener)
      return { data: { subscription: { unsubscribe } } }
    })
    return { emit: (event: string) => listeners.forEach((l) => l(event)), unsubscribe }
  }

  it('calls back on SIGNED_OUT and on no other event', async () => {
    const { emit } = auth()
    const onOut = vi.fn()
    onSignedOut(onOut)
    await vi.waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1))
    for (const event of ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'PASSWORD_RECOVERY', 'MFA_CHALLENGE_VERIFIED']) emit(event)
    expect(onOut).not.toHaveBeenCalled()
    emit('SIGNED_OUT')
    expect(onOut).toHaveBeenCalledTimes(1)
    emit('SIGNED_OUT')
    expect(onOut).toHaveBeenCalledTimes(2)
  })

  it('unsubscribes from auth when told to', async () => {
    const { unsubscribe } = auth()
    const off = onSignedOut(() => {})
    await vi.waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1))
    expect(unsubscribe).not.toHaveBeenCalled()
    off()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('can be unsubscribed before the client has loaded, and then never subscribes', async () => {
    auth()
    const off = onSignedOut(() => {})
    off()
    await vi.dynamicImportSettled()
    await Promise.resolve()
    expect(mock.auth.onAuthStateChange).not.toHaveBeenCalled()
  })

  it('can be unsubscribed twice', async () => {
    const { unsubscribe } = auth()
    const off = onSignedOut(() => {})
    await vi.waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1))
    off()
    off()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('gives each listener its own subscription', async () => {
    const { unsubscribe } = auth()
    const first = onSignedOut(() => {})
    // Wait for the fake to be loaded before the second call: vitest hands a mocked module to only one of two imports
    // started in the same tick. The real client, which tests/auth/sessionFlow.test.ts uses, has no such limit.
    await vi.waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1))
    const second = onSignedOut(() => {})
    await vi.waitFor(() => expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(2))
    first()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    second()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
  })
})
